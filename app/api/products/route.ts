import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, purchasePrice, salePrice, stock, tvaRate, imageUrl } = body;

    if (!name || !category || purchasePrice === undefined || salePrice === undefined) {
      return NextResponse.json(
        { error: 'Champs manquants' },
        { status: 400 }
      );
    }

    // Crée l'utilisateur par défaut s'il n'existe pas
    let user = await prisma.user.findUnique({
      where: { email: 'hassan@aqilbina.com' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'user_placeholder',
          email: 'hassan@aqilbina.com',
          name: 'Hassan',
          companyName: 'Ma société',
        },
      });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description: body.description || null,
        category,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
        stock: stock ? parseInt(stock) : 0,
        tvaRate: tvaRate ? parseFloat(tvaRate) : 20.0,
        imageUrl: imageUrl || null,
        userId: user.id,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}