import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const listings = await prisma.sellerListing.findMany({
      where: { isActive: true },
      include: {
        product: true,
        vendor: {
          select: { companyName: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error('GET /api/artisan/listings error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}