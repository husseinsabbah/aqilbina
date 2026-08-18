import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Récupérer la proposition avec les relations
    const proposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: {
        project: true,
        product: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 });
    }

    // Vérifier que l'artisan est bien le propriétaire du projet
    if (proposal.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Vérifier que la proposition est encore en attente
    if (proposal.status !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Cette proposition a déjà été traitée' },
        { status: 400 }
      );
    }

    // Mettre à jour le statut
    const updated = await prisma.vendorProposal.update({
      where: { id },
      data: { status: 'ACCEPTE' },
    });

    // Le stock a déjà été réservé lors de la création de l'offre
    // On pourrait ajouter une logique pour ne pas le déduire deux fois

    // Ajouter le produit au devis de l'artisan
    // (On suppose que addItem est géré côté frontend, ou on le fait ici)
    // Mais on va laisser le frontend gérer l'ajout au devis.

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/proposals/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}