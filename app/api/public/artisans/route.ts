import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const artisans = await prisma.user.findMany({
      where: { trade: 'artisan' },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        phone: true,
      },
      orderBy: { companyName: 'asc' },
    });
    return NextResponse.json(artisans);
  } catch (error) {
    console.error('GET /api/public/artisans error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}