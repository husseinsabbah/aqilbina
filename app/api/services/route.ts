import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth';

const prisma = new PrismaClient();

// GET : récupérer tous les services de l'utilisateur
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
    console.error('GET /api/services error:', error);
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
    const { name, unit, unitPriceHt, tvaRate } = body;
    if (!name || !unit || unitPriceHt === undefined) {
      return NextResponse.json({ error: 'Nom, unité et prix HT sont obligatoires' }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: {
        name,
        unit,
        unitPriceHt: parseFloat(unitPriceHt),
        tvaRate: tvaRate ? parseFloat(tvaRate) : 20.0,
        userId: session.user.id,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}