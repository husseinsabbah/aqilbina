import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const proposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }

    if (proposal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (!['EN_ATTENTE', 'EXPIREE'].includes(proposal.status)) {
      return NextResponse.json(
        { error: 'Cette offre ne peut pas être annulée' },
        { status: 400 }
      );
    }

    const quantity = proposal.quantity;

    // 1. Libérer le stock gelé (si l'offre est en attente)
    if (proposal.status === 'EN_ATTENTE') {
      await prisma.product.update({
        where: { id: proposal.productId },
        data: { reservedStock: { decrement: quantity } },
      });
    }

    // 2. Marquer l'offre comme annulée (on utilise le statut REFUSE pour simplifier)
    const updated = await prisma.vendorProposal.update({
      where: { id },
      data: { status: 'REFUSE' },
    });

    // 3. Notifier l'artisan (optionnel)
    await prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'OFFRE_ANNULEE',
        title: 'Offre annulée',
        message: `L'offre pour "${proposal.product.name}" a été annulée par le vendeur`,
        link: `/artisan/projets/${proposal.projectId}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/cancel error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}