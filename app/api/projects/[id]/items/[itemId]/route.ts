import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const permissionRank: Record<string, number> = {
  READ: 1,
  COMMENT: 2,
  EDIT: 3,
  VALIDATE: 4,
};

async function getUserProjectPermission(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return { project: null, permission: null };
  }

  if (project.userId === userId) {
    return { project, permission: 'VALIDATE' };
  }

  const accesses = await prisma.projectTeamAccess.findMany({
    where: {
      projectId,
      team: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    },
    select: { permission: true },
  });

  const maxPermission = accesses.reduce((best, access) => {
    const rank = permissionRank[access.permission] ?? 0;
    return rank > best ? rank : best;
  }, 0);

  if (maxPermission <= 0) {
    return { project, permission: null };
  }

  const highest = Object.entries(permissionRank)
    .filter(([, rank]) => rank === maxPermission)
    .map(([name]) => name)[0] || 'READ';

  return { project, permission: highest };
}

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

    const { project, permission } = await getUserProjectPermission(session.user.id, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    if (!permission || !['EDIT', 'VALIDATE'].includes(permission)) {
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

    const { project, permission } = await getUserProjectPermission(session.user.id, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    if (!permission || !['EDIT', 'VALIDATE'].includes(permission)) {
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