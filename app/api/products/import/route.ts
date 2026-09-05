import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import * as XLSX from 'xlsx';
import { authOptions } from '../../../auth';

const prisma = new PrismaClient();

const HEADER_ALIASES = {
  name: ['name', 'nom', 'nomduproduit', 'nomproduit', 'designation', 'title', 'productname'],
  category: ['category', 'categorie', 'famille', 'type', 'souscategorie'],
  brand: ['brand', 'marque', 'fabricant'],
  description: ['description', 'descriptif', 'descriptionproduit', 'details'],
  purchasePrice: ['purchaseprice', 'prixdachat', 'prixachat', 'cout', 'cost', 'prixachatht'],
  salePrice: ['saleprice', 'prixdevente', 'prixvente', 'prixdeventettc', 'prixventettc'],
  stock: ['stock', 'stockpcs', 'stockpieces', 'quantite', 'quantité'],
  tvaRate: ['tvarate', 'tva', 'tauxdeva', 'vat', 'tauxdetva'],
  imageUrl: ['imageurl', 'image', 'urlimage', 'nomimage'],
};

const normalizeHeader = (value: string) =>
  String(value ?? '')
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

const isMeaninglessRow = (row: Record<string, unknown>) => {
  const values = Object.values(row).map((value) => String(value ?? '').trim());
  if (values.every((value) => value === '')) return true;
  const joined = values.join(' ').toLowerCase();
  return ['welcome', 'bienvenue', 'example', 'exemple', 'name', 'nom', 'category', 'categorie', 'description', 'prix achat', 'prix vente', 'stock', 'tva', 'image'].some((keyword) => joined.includes(keyword));
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .xlsx ou .xls' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const productsData: Record<string, unknown>[] = [];
    for (const row of rawData) {
      if (!row || isMeaninglessRow(row)) continue;
      productsData.push(row);
    }

    if (productsData.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne de produit valide trouvée dans le fichier' }, { status: 400 });
    }

    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productsData.length; i++) {
      const row = productsData[i];
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(String(key)), value])
      ) as Record<string, unknown>;

      const getCell = (aliases: string[]) => {
        for (const alias of aliases) {
          const normalizedAlias = normalizeHeader(alias);
          if (normalizedRow[normalizedAlias] !== undefined) {
            return normalizedRow[normalizedAlias];
          }
        }
        return '';
      };

      const name = String(getCell(HEADER_ALIASES.name) ?? '').trim();
      const description = String(getCell(HEADER_ALIASES.description) ?? '').trim();
      const category = String(getCell(HEADER_ALIASES.category) ?? '').trim();
      const purchasePrice = parseNumericValue(getCell(HEADER_ALIASES.purchasePrice));
      const salePrice = parseNumericValue(getCell(HEADER_ALIASES.salePrice));
      const stock = Number.isFinite(parseNumericValue(getCell(HEADER_ALIASES.stock))) ? Math.max(0, Math.round(parseNumericValue(getCell(HEADER_ALIASES.stock)))) : 0;
      const tvaRate = Number.isFinite(parseNumericValue(getCell(HEADER_ALIASES.tvaRate))) ? parseNumericValue(getCell(HEADER_ALIASES.tvaRate)) : 20;
      const imageName = String(getCell(HEADER_ALIASES.imageUrl) ?? '').trim();

      if (!name || !category || (!Number.isFinite(purchasePrice) && !Number.isFinite(salePrice))) {
        errorCount++;
        errors.push(`Ligne ${i + 1} : Nom, catégorie ou prix manquant`);
        continue;
      }

      try {
        await (prisma.product as any).create({
          data: {
            name,
            description: description || null,
            category: category || 'Non catégorisé',
            purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
            salePrice: Number.isFinite(salePrice) ? salePrice : 0,
            stock: stock || 0,
            tvaRate: Number.isFinite(tvaRate) ? tvaRate : 20,
            imageUrl: imageName ? `/uploads/${imageName}` : null,
            userId: session.user.id,
          },
        });
        importedCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Ligne ${i + 1} : Erreur base de données - ${(err as Error).message}`);
      }
    }

    if (importedCount === 0) {
      return NextResponse.json({ error: 'Aucune ligne de produit valide n’a été importée. Vérifiez les colonnes du fichier.', details: errors.slice(0, 10) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      errorCount,
      errors,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}