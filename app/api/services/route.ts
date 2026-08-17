// app/api/services/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const body = await request.json();
    const { name, description, serviceCategory, unit, unitPrice, isActive } = body;
    if (!name || !serviceCategory || !unit || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Nom, catégorie, unité et prix sont obligatoires' },
        { status: 400 }
      );
    }
    const service = await prisma.service.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        serviceCategory,
        unit,
        unitPrice: parseFloat(unitPrice),
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('POST /api/services error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}