import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const catalogs = await prisma.catalog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            salePrice: true,
          },
        },
      },
    });

    return NextResponse.json(
      catalogs.map((catalog) => ({
        ...catalog,
        productCount: catalog.products.length,
      }))
    );
  } catch (error) {
    console.error('GET /api/admin/catalogs error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
