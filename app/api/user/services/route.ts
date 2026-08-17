import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET : récupérer tous les services du vendeur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('GET /api/user/services error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : créer un nouveau service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, unit, unitPrice, serviceCategory } = body;

    if (!name || !unit || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Champs manquants : name, unit, unitPrice' },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        serviceCategory: serviceCategory || 'prestation',
        unit,
        unitPrice: parseFloat(unitPrice),
        isActive: true,
        userId: session.user.id,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('POST /api/user/services error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}