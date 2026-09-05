import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../auth';
import { prisma } from '@/lib/prisma';

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
    void body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Ici, vous pouvez stocker le statut "fourni par le client" dans un champ dédié
    // ou dans un champ JSON. Pour l'exemple, on va l'ajouter dans un champ JSON.
    const updated = await prisma.projectItem.update({
      where: { id: itemId },
      data: {
        // Si vous avez ajouté un champ `clientProvided` dans le schéma Prisma
        // clientProvided: isClientProvided,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erreur client-provided:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}