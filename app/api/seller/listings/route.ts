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
    const { productId, quantity, unitPrice, description } = body;
    // ... (le reste de ton code POST)
  } catch (error) {
    // ...
  }
}