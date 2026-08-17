import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET : récupérer un service spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('GET /api/user/services/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT : modifier un service
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceId = params.id;
    const body = await request.json();

    const existing = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
    }

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        unit: body.unit || existing.unit,
        unitPrice: body.unitPrice !== undefined ? parseFloat(body.unitPrice) : existing.unitPrice,
        serviceCategory: body.serviceCategory || existing.serviceCategory,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/user/services/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE : supprimer un service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceId = params.id;

    const existing = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un service par défaut' },
        { status: 400 }
      );
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    return NextResponse.json({ message: 'Service supprimé' });
  } catch (error) {
    console.error('DELETE /api/user/services/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}