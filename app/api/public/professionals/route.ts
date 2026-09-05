import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const allowedRoles = ['artisan', 'vendeur', 'promoteur'] as const;

export async function GET(request: NextRequest) {
  try {
    const role = (request.nextUrl.searchParams.get('role') || 'artisan').trim().toLowerCase();
    const trade = (request.nextUrl.searchParams.get('trade') || '').trim().toLowerCase();

    if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
      return NextResponse.json({ error: 'Catégorie professionnelle invalide.' }, { status: 400 });
    }

    const professionals = await prisma.user.findMany({
      where: {
        OR: [{ role }, { trade: role }],
        ...(trade ? { trade } : {}),
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        phone: true,
        trade: true,
        certificationScore: true,
        certificationLabel: true,
      },
      orderBy: { companyName: 'asc' },
    });

    return NextResponse.json(professionals);
  } catch (error) {
    console.error('GET /api/public/professionals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}