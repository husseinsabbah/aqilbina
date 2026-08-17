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

    for (const row of productsData) {
      const name = row.name || row.Nom || row.Name || row.nom;
      const category = row.category || row.Catégorie || row.Category || row.categorie;
      const salePrice = parseFloat(row.salePrice || row.Prix || row['Prix de vente'] || row.prix || 0);
      const purchasePrice = parseFloat(row.purchasePrice || row['Prix d\'achat'] || row.purchase_price || 0);
      const stock = parseInt(row.stock || row.Stock || 0);
      const tvaRate = parseFloat(row.tvaRate || row.TVA || row.tva || 20);
      const brand = row.brand || row.Marque || row.Brand || null;
      const description = row.description || row.Description || null;
      const imageUrl = row.imageUrl || row.Image || row['Image URL'] || null;

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
            purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
            salePrice: isNaN(salePrice) ? 0 : salePrice,
            stock: isNaN(stock) ? 0 : stock,
            tvaRate: isNaN(tvaRate) ? 20 : tvaRate,
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