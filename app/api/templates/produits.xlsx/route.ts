import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Produits');

  // En-têtes
  const headers = [
    'name',
    'category',
    'brand',
    'description',
    'purchasePrice',
    'salePrice',
    'stock',
    'tvaRate',
    'imageUrl',
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Exemples
  const examples = [
    ['Carreau 60x60', 'Carrelage', 'Ceramica', 'Carreau rectifié 60x60', 12.50, 22.50, 100, 20, 'https://exemple.com/carreau.jpg'],
    ['Dalle pierre', 'Revêtements', 'StonePro', 'Dalle naturelle', 30.00, 45.00, 75, 20, 'https://exemple.com/dalle.jpg'],
  ];
  examples.forEach(row => worksheet.addRow(row));

  // Ajuster les largeurs de colonnes
  worksheet.columns.forEach(col => {
    col.width = Math.max(18, col.width || 18);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_produits.xlsx"',
    },
  });
}