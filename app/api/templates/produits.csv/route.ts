import { NextResponse } from 'next/server';

export async function GET() {
  const headers = [
    'name,category,brand,description,purchasePrice,salePrice,stock,tvaRate,imageUrl',
    'Carreau 60x60,Carrelage,Ceramica,"Carreau rectifié 60x60",12.50,22.50,100,20,https://exemple.com/carreau.jpg',
    'Dalle pierre,Revêtements,StonePro,"Dalle naturelle",30.00,45.00,75,20,https://exemple.com/dalle.jpg',
  ].join('\n');

  return new NextResponse(headers, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="template_produits.csv"',
    },
  });
}