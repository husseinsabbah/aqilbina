import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer l'utilisateur avec ses produits et services
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        products: true,
        services: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Artisan introuvable' },
        { status: 404 }
      );
    }

    // Vérification du métier : certains profils artisan utilisent un trade spécialisé
    const isArtisanProfile = user.role === 'artisan' || user.trade === 'artisan';

    if (!isArtisanProfile) {
      return NextResponse.json(
        { error: 'Cet utilisateur n\'est pas un artisan' },
        { status: 400 }
      );
    }

    // Retourner les données complètes
    return NextResponse.json({
      artisan: {
        id: user.id,
        name: user.name,
        companyName: user.companyName,
        phone: user.phone,
        address: user.address,
        city: user.city,
        description: user.description,
        website: user.website,
        imageUrl: user.imageUrl,
      },
      products: user.products || [],
      services: user.services || [],
    });
  } catch (error) {
    console.error('GET /api/client/[id]/catalogue error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}