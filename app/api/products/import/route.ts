import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth';

// xlsx is installed at runtime, but may not include TS types in this project setup.
const XLSX = require('xlsx');

const prisma = new PrismaClient();

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

    // Vérifier l'extension
    const ext = file.name.split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls') {
      return NextResponse.json({ error: 'Format non supporté. Utilisez .xlsx ou .xls' }, { status: 400 });
    }

    // Lire le fichier
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Les 3 premières lignes sont ignorées (tutoriel, en-têtes, exemple)
    // On commence à la ligne 4 (index 3)
    const productsData = data.slice(3);

    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productsData.length; i++) {
      const row = productsData[i];
      // Colonnes : A:Nom, B:Description, C:Catégorie, D:Prix achat HT, E:Prix vente TTC, F:Stock, G:TVA %, H:Nom image
      const name = row['Nom'] || row['الاسم'] || row['Name'] || '';
      const description = row['Description'] || row['الوصف'] || row['Description'] || '';
      const category = row['Catégorie'] || row['الفئة'] || row['Category'] || '';
      const purchasePrice = parseFloat(row['Prix achat HT'] || row['سعر الشراء (بدون ضريبة)'] || row['Purchase price (excl. tax)']);
      const salePrice = parseFloat(row['Prix vente TTC'] || row['سعر البيع (مع الضريبة)'] || row['Sale price (incl. tax)']);
      const stock = parseInt(row['Stock'] || row['المخزون'] || row['Stock']) || 0;
      const tvaRate = parseFloat(row['TVA %'] || row['نسبة الضريبة'] || row['VAT %']) || 20;
      const imageName = row['Nom image'] || row['اسم الصورة'] || row['Image name'] || '';

      if (!name || isNaN(purchasePrice) || isNaN(salePrice)) {
        errorCount++;
        errors.push(`Ligne ${i + 4} : Nom, Prix achat ou Prix vente manquant`);
        continue;
      }

      try {
        await (prisma.product as any).create({
          data: {
            name,
            description: description || null,
            category: category || 'Non catégorisé',
            purchasePrice,
            salePrice,
            stock: stock || 0,
            tvaRate: tvaRate || 20,
            imageUrl: imageName ? `/uploads/${imageName}` : null,
            userId: session.user.id,
          },
        });
        importedCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Ligne ${i + 4} : Erreur base de données - ${(err as Error).message}`);
      }
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