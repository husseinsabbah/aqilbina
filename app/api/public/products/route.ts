import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const tradeKeywords: Record<string, string[]> = {
  carreleur: ['carrelage', 'carreau', 'faïence', 'faience', 'joint', 'colle'],
  plombier: ['plomberie', 'sanitaire', 'robinet', 'douche', 'canalisation', 'chauffage'],
  electricien: ['électricité', 'electricite', 'éclairage', 'eclairage', 'prise', 'tableau'],
  peintre: ['peinture', 'enduit', 'vernis', 'façade', 'facade'],
  menuisier: ['menuiserie', 'bois', 'fenêtre', 'fenetre', 'porte', 'placard'],
  maçon: ['maçonnerie', 'maconnerie', 'ciment', 'béton', 'beton', 'parpaing'],
  couvreur: ['toiture', 'couverture', 'tuile', 'ardoise', 'gouttière', 'gouttiere'],
  terrassier: ['terrassement', 'gravier', 'sable', 'terre', 'drainage'],
};

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const trade = request.nextUrl.searchParams.get('trade')?.trim().toLowerCase() || '';
    const keywords = tradeKeywords[trade] || (trade ? [trade] : []);

    const products = await prisma.product.findMany({
      where: {
        user: { OR: [{ role: 'vendeur' }, { trade: 'vendeur' }] },
        ...(query ? {
          OR: [
            { name: { contains: query } },
            { category: { contains: query } },
            { brand: { contains: query } },
          ],
        } : keywords.length ? {
          OR: keywords.flatMap((keyword) => [
            { name: { contains: keyword } },
            { category: { contains: keyword } },
            { description: { contains: keyword } },
          ]),
        } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        brand: true,
        salePrice: true,
        stock: true,
        imageUrl: true,
        user: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 50,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/public/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}