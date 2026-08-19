import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      const artisans = await prisma.user.findMany({
        where: { trade: 'artisan' },
        select: {
          id: true,
          name: true,
          companyName: true,
          city: true,
        },
        orderBy: { companyName: 'asc' },
      });

      return NextResponse.json(artisans);
    }

    const artisan = await prisma.user.findFirst({
      where: {
        trade: 'artisan',
        OR: [
          { name: { contains: q } },
          { companyName: { contains: q } },
          { city: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
      },
      orderBy: { companyName: 'asc' },
    });

    return NextResponse.json(artisan ?? { id: null, name: null, companyName: null, city: null });
  } catch (error) {
    console.error('GET /api/public/search-artisan error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
