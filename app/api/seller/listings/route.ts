import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// GET : récupérer les annonces du vendeur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const listings = await prisma.sellerListing.findMany({
      where: { userId: session.user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(listings);
  } catch (error) {
    console.error('GET /api/seller/listings error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : créer une annonce (déjà existant)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, unitPrice, description, endDate } = body;

    if (!productId || !quantity || !unitPrice || !endDate) {
      return NextResponse.json({ error: 'Champs manquants : produit, quantité, prix, date de fin' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, userId: session.user.id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice);
    const parsedEndDate = new Date(endDate);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 });
    }

    if (Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: 'Date de fin invalide' }, { status: 400 });
    }

    const listing = await prisma.sellerListing.create({
      data: {
        userId: session.user.id,
        productId: product.id,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice,
        description: description || null,
        endDate: parsedEndDate,
        isActive: true,
      },
      include: { product: true },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error('POST /api/seller/listings error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}