import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
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

    const catalog = await prisma.catalog.findFirst({
      where: { id: catalogId, userId: session.user.id },
    });
    if (!catalog) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    let productsData: any[] = [];

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return NextResponse.json({ error: 'Fichier CSV vide' }, { status: 400 });
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
        productsData.push(obj);
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return NextResponse.json({ error: 'La feuille Excel est vide' }, { status: 400 });
      }

      const headers: string[] = [];
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.text?.toString()?.trim() || `col_${colNumber}`;
      });

      productsData = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1] || `col_${colNumber}`;
          let value = cell.value;
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (typeof value === 'object' && value !== null) {
            value = value.toString();
          }
          obj[header] = value ?? '';
        });
        if (Object.values(obj).some(v => v !== '')) {
          productsData.push(obj);
        }
      });
    } else {
      return NextResponse.json({ error: 'Format non supporté. Utilisez CSV ou XLSX.' }, { status: 400 });
    }

    if (productsData.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée trouvée dans le fichier' }, { status: 400 });
    }

    const created = [];
    const errors = [];

    const normalizeHeader = (value: string) =>
      String(value)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

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

    for (const row of productsData) {
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(String(key)), value])
      ) as Record<string, unknown>;

      const pickValue = (...keys: string[]) => {
        for (const key of keys) {
          const value = normalizedRow[key];
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
          }
        }
        return '';
      };

      const name = pickValue(
        'nomduproduit',
        'name',
        'nom',
        'nomproduit',
        'productname',
        'designation',
        'title'
      );
      const category = pickValue(
        'categorie',
        'category',
        'famille',
        'type',
        'souscategorie'
      );
      const salePriceValue = pickValue(
        'prixdevente',
        'prixdeventeeur',
        'saleprice',
        'prixvente',
        'prixdeventeeur',
        'prixdevente€'
      );
      const purchasePriceValue = pickValue(
        'prixdachat',
        'prixdachat€',
        'purchaseprice',
        'prixachat',
        'cout'
      );
      const stockValue = pickValue('stock', 'stockpcs', 'stockpieces', 'quantite');
      const tvaRateValue = pickValue('tva', 'tva', 'tauxdeva', 'vat');
      const brand = pickValue('marque', 'brand', 'fabricant');
      const description = pickValue('description', 'descriptionproduit', 'descriptif');
      const imageUrl = pickValue('urlimage', 'image', 'imageurl', 'url');

      const salePrice = parseNumericValue(salePriceValue);
      const purchasePrice = parseNumericValue(purchasePriceValue);
      const stock = Number.parseInt(String(stockValue).replace(/[^0-9-]/g, '') || '0', 10);
      const tvaRate = Number.isFinite(parseNumericValue(tvaRateValue)) ? parseNumericValue(tvaRateValue) : 20;

      if (!name || !category) {
        errors.push(`Ligne ignorée (nom ou catégorie manquant): ${JSON.stringify(row)}`);
        continue;
      }

      try {
        const product = await prisma.product.create({
          data: {
            userId: session.user.id,
            catalogId,
            name: String(name).trim(),
            category: String(category).trim(),
            brand: brand ? String(brand).trim() : null,
            description: description ? String(description).trim() : null,
            purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
            salePrice: Number.isFinite(salePrice) ? salePrice : 0,
            stock: Number.isFinite(stock) ? stock : 0,
            tvaRate: Number.isFinite(tvaRate) ? tvaRate : 20,
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
          },
        });
        created.push(product);
      } catch (err) {
        errors.push(`Erreur sur "${name}": ${(err as Error).message}`);
      }
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