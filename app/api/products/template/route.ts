import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  // Créer un classeur Excel
  const wb = XLSX.utils.book_new();

  // Données : Ligne 1 (tutoriel), Ligne 2 (en-têtes), Ligne 3 (exemple)
  const data = [
    [
      '📖 WELCOME / BIENVENUE / أهلاً وسهلاً',
      'Fill in the lines below. / Remplis les lignes ci-dessous. / املأ الأسطر أدناه.',
      'Red columns are mandatory. / Les colonnes rouges sont obligatoires. / الأعمدة الحمراء إلزامية.',
      'For the image, write the exact file name (ex: tile.jpg). / Pour l\'image, écris le nom exact du fichier (ex: carreau.jpg). / للصورة، اكتب الاسم الدقيق للملف (مثال: carreau.jpg).',
    ],
    [
      'Name / Nom / الاسم',
      'Description / Description / الوصف',
      'Category / Catégorie / الفئة',
      'Purchase price (excl. tax) / Prix achat HT / سعر الشراء (بدون ضريبة)',
      'Sale price (incl. tax) / Prix vente TTC / سعر البيع (مع الضريبة)',
      'Stock / Stock / المخزون',
      'VAT % / TVA % / نسبة الضريبة',
      'Image name / Nom image / اسم الصورة',
    ],
    [
      'Wood-effect tile / Carrelage effet bois / بلاط خشبي',
      '60x60 natural look / 60x60 aspect naturel / 60x60 مظهر طبيعي',
      'Tile / Carrelage / بلاط',
      '22.50',
      '45.00',
      '100',
      '20',
      'tile_wood.jpg',
    ],
    // Lignes vides pour les données
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Fusionner la première ligne (tutoriel)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  XLSX.utils.book_append_sheet(wb, ws, 'Produits');

  // Générer le fichier
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': 'attachment; filename=modele_produits.xlsx',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}