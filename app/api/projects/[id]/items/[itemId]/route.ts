import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================
// PUT : Mettre à jour un item (prix ou quantité)
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: projectId, itemId } = await params;
    const body = await request.json();
    const { unitPriceHtAtSale, quantity } = body;

    // Vérifier que le projet appartient à l'utilisateur
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Mettre à jour l'item
    const updated = await prisma.projectItem.update({
      where: { id: itemId },
      data: {
        unitPriceHtAtSale: unitPriceHtAtSale !== undefined ? parseFloat(unitPriceHtAtSale) : undefined,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/projects/[id]/items/[itemId] error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE : Supprimer un item
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: projectId, itemId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await prisma.projectItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id]/items/[itemId] error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}