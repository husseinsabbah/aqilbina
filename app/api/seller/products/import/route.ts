import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageCatalog, hasCatalogManagementRole, validateCatalogProductCompatibility } from '@/lib/role-access';
import ExcelJS from 'exceljs';

const HEADER_ALIASES = {
  name: ['name', 'nom', 'nomduproduit', 'nomproduit', 'designation', 'désignation', 'libelle', 'libellé', 'reference', 'référence', 'article', 'title', 'productname'],
  category: ['category', 'categorie', 'famille', 'type', 'souscategorie', 'categorieproduit', 'collection', 'gamme'],
  brand: ['brand', 'marque', 'fabricant', 'constructeur'],
  description: ['description', 'descriptif', 'descriptionproduit', 'details', 'detail', 'caracteristiques'],
  purchasePrice: ['purchaseprice', 'prixdachat', 'prixachat', 'cout', 'cost', 'prixachatht', 'achatht', 'prixdachatht', 'prixdachatttc'],
  salePrice: ['saleprice', 'prixdevente', 'prixvente', 'prixdeventettc', 'prixventettc', 'pv', 'prixpublic', 'prixventeht', 'prixvenuettc'],
  stock: ['stock', 'stockpcs', 'stockpieces', 'quantite', 'quantité', 'qte', 'quantiteenstock'],
  tvaRate: ['tvarate', 'tva', 'tauxdeva', 'vat', 'tauxdetva', 'tauxvat'],
  imageUrl: ['imageurl', 'image', 'urlimage', 'nomimage', 'imageurlproduit', 'photo', 'photos'],
};

const normalizeHeader = (value: string) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const normalizeCellValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object') return String(value);
  return String(value).trim();
};

const parseNumericValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  const sanitized = raw
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  if (!sanitized || sanitized === '-' || sanitized === '.') return NaN;
  return Number(sanitized);
};

const getValueByAliases = (row: Record<string, unknown>, aliases: string[]) => {
  const normalizedMap = Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[normalizeHeader(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    if (normalizedMap[normalizedAlias] !== undefined) {
      return normalizedMap[normalizedAlias];
    }
  }

  return '';
};

const isMeaninglessRow = (row: Record<string, unknown>) => {
  const values = Object.values(row).map((value) => normalizeCellValue(value));
  if (values.every((value) => value === '')) return true;

  const joined = values.join(' ').toLowerCase();
  return [
    'welcome',
    'bienvenue',
    'example',
    'exemple',
    'name',
    'nom',
    'category',
    'categorie',
    'description',
    'prix achat',
    'prix vente',
    'stock',
    'tva',
    'image',
  ].some((keyword) => joined.includes(keyword));
};

const findHeaderRowIndex = (rows: unknown[][]) => {
  for (let index = 0; index < rows.length; index++) {
    const joined = rows[index]
      .map((cell) => String(cell ?? '').trim())
      .join(' ')
      .toLowerCase();

    const hasNameField = joined.includes('nom') || joined.includes('designation') || joined.includes('reference') || joined.includes('article') || joined.includes('product');
    const hasPriceField = joined.includes('prix') || joined.includes('price') || joined.includes('pv') || joined.includes('achat') || joined.includes('vente');
    const hasCategoryField = joined.includes('categorie') || joined.includes('famille') || joined.includes('type') || joined.includes('collection');

    if ((hasNameField && hasPriceField) || (hasNameField && hasCategoryField)) {
      return index;
    }
  }

  return -1;
};

const buildFallbackProductRow = (row: unknown[], fallbackCategory: string) => {
  const cells = row
    .map((cell) => normalizeCellValue(cell))
    .filter((cell) => cell !== '');

  if (cells.length < 2) return null;

  const allNumbers = cells
    .map((cell) => ({ cell, value: parseNumericValue(cell) }))
    .filter(({ value }) => Number.isFinite(value));

  if (allNumbers.length === 0) return null;

  const saleCandidate = allNumbers.find(({ value }) => Number.isFinite(value) && value > 0 && value < 1000000);
  if (!saleCandidate) return null;

  const firstMeaningfulCell = cells.find((cell) => {
    const value = parseNumericValue(cell);
    return !Number.isFinite(value) && !/^(carrel|plomb|electric|paint|peint|menuis|maçon|macon|couv|revet|tuile|sol|mur|joint|sanit|bois|pvc|gypse|ciment|pav)$/i.test(cell);
  });

  if (!firstMeaningfulCell) return null;

  const stockCandidate = allNumbers.find(({ value, cell }) => {
    if (cell === saleCandidate.cell) return false;
    return Number.isFinite(value) && value >= 0 && value <= 50000;
  });

  const categoryGuess = cells.find((cell) => /carrel|plomb|electric|peint|menuis|maçon|macon|couv|revet|tuile|sol|mur|joint|sanit|bois|pvc|gypse|ciment|pav/i.test(cell)) || fallbackCategory;

  return {
    name: firstMeaningfulCell.trim(),
    category: String(categoryGuess).trim() || fallbackCategory,
    salePrice: String(saleCandidate.value),
    stock: stockCandidate ? String(stockCandidate.value) : '0',
    description: cells.filter((cell) => cell !== firstMeaningfulCell && cell !== saleCandidate.cell && cell !== stockCandidate?.cell).slice(0, 3).join(' '),
  };
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasCatalogManagementRole(session)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const catalogId = formData.get('catalogId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!catalogId) {
      return NextResponse.json({ error: 'catalogId requis' }, { status: 400 });
    }

    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
    });

    if (!catalog || !canManageCatalog(session, catalog.userId)) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    const rows: Record<string, unknown>[] = [];

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        return NextResponse.json({ error: 'Fichier CSV vide' }, { status: 400 });
      }

      const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
        const row: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] ?? '';
        });
        if (!isMeaninglessRow(row)) {
          rows.push(row);
        }
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheetCandidates = workbook.worksheets.filter((ws) => ws.rowCount > 0);
      if (worksheetCandidates.length === 0) {
        return NextResponse.json({ error: 'La feuille Excel est vide' }, { status: 400 });
      }

      for (const worksheet of worksheetCandidates) {
        const rawRows: unknown[][] = [];
        worksheet.eachRow((row) => {
          const values = Array.isArray(row.values) ? row.values.slice(1) : [];
          rawRows.push(values);
        });

        const headerRowIndex = findHeaderRowIndex(rawRows);
        const candidateRows = headerRowIndex >= 0 ? rawRows.slice(headerRowIndex + 1) : rawRows;
        const headerNames = headerRowIndex >= 0 ? rawRows[headerRowIndex].map((cell) => normalizeCellValue(cell)) : [];

        for (const row of candidateRows) {
          const cells = row as unknown[];
          if (cells.every((cell) => normalizeCellValue(cell) === '')) continue;

          if (headerNames.length > 0) {
            const dataRow: Record<string, unknown> = {};
            headerNames.forEach((header, idx) => {
              dataRow[header || `col_${idx + 1}`] = cells[idx] ?? '';
            });
            if (!isMeaninglessRow(dataRow)) {
              rows.push(dataRow);
            }
            continue;
          }

          const fallbackRow = buildFallbackProductRow(cells, catalog.name || 'Carrelage');
          if (fallbackRow) {
            rows.push({
              name: fallbackRow.name,
              category: fallbackRow.category,
              salePrice: fallbackRow.salePrice,
              stock: fallbackRow.stock,
              description: fallbackRow.description,
            });
          }
        }

        if (rows.length > 0) break;
      }
    } else {
      return NextResponse.json({ error: 'Format non supporté. Utilisez CSV ou XLSX.' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne de produit valide trouvée dans le fichier. Vérifiez que la feuille contient bien les colonnes nom, catégorie, prix, stock...' },
        { status: 400 }
      );
    }

    const created = [];
    const errors: string[] = [];

    for (const row of rows) {
      const rawName = getValueByAliases(row, HEADER_ALIASES.name);
      const rawCategory = getValueByAliases(row, HEADER_ALIASES.category);
      const rawBrand = getValueByAliases(row, HEADER_ALIASES.brand);
      const rawDescription = getValueByAliases(row, HEADER_ALIASES.description);
      const purchasePriceValue = getValueByAliases(row, HEADER_ALIASES.purchasePrice);
      const salePriceValue = getValueByAliases(row, HEADER_ALIASES.salePrice);
      const stockValue = getValueByAliases(row, HEADER_ALIASES.stock);
      const tvaRateValue = getValueByAliases(row, HEADER_ALIASES.tvaRate);
      const imageUrlValue = getValueByAliases(row, HEADER_ALIASES.imageUrl);

      const name = String(rawName ?? '').trim() || Object.values(row).map((v) => normalizeCellValue(v)).find((v) => v && !/^\d+[.,]?\d*$/.test(v) && !/^\d*$/.test(v)) || '';
      const category = String(rawCategory ?? '').trim() || catalog.name || 'Carrelage';
      const brand = String(rawBrand ?? '').trim();
      const description = String(rawDescription ?? '').trim();

      if (!name) {
        errors.push(`Ligne ignorée : nom manquant -> ${JSON.stringify(row)}`);
        continue;
      }

      const salePrice = parseNumericValue(salePriceValue);
      const purchasePrice = parseNumericValue(purchasePriceValue);
      const stock = Number.isFinite(parseNumericValue(stockValue)) ? Math.max(0, Math.round(parseNumericValue(stockValue))) : 0;
      const tvaRate = Number.isFinite(parseNumericValue(tvaRateValue)) ? parseNumericValue(tvaRateValue) : 20;

      if (!Number.isFinite(salePrice) && !Number.isFinite(purchasePrice)) {
        errors.push(`Produit ignoré sans prix exploitable : ${name}`);
        continue;
      }

      try {
        const product = await prisma.product.create({
          data: {
            userId: session.user.id,
            catalogId,
            name,
            category,
            brand: brand || null,
            description: description || null,
            purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
            salePrice: Number.isFinite(salePrice) ? salePrice : 0,
            stock,
            tvaRate: Number.isFinite(tvaRate) ? tvaRate : 20,
            imageUrl: imageUrlValue ? String(imageUrlValue).trim() : null,
          },
        });
        created.push(product);
      } catch (err) {
        errors.push(`Erreur sur "${name}": ${(err as Error).message}`);
      }
    }

    if (created.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne de produit valide n’a été importée. Vérifiez le nom des colonnes et les données du fichier.', details: errors.slice(0, 10) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
      products: created,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
