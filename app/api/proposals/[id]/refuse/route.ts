import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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

    const isArtisan = session.user.role === 'artisan' || session.user.trade === 'artisan';
    if (!isArtisan) {
      return NextResponse.json({ error: 'Accès réservé aux artisans' }, { status: 403 });
    }

    const proposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: { product: true, project: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }

    if (proposal.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (proposal.status !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Cette offre a déjà été traitée' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || 'AUTRE').toString();
    const details = (body.details || '').toString().trim();
    const quantity = proposal.quantity;

    // 1. Libérer le stock gelé
    await prisma.product.update({
      where: { id: proposal.productId },
      data: {
        reservedStock: { decrement: quantity },
      },
    });

    // 2. Marquer l'offre comme refusée
    const updated = await prisma.vendorProposal.update({
      where: { id },
      data: {
        status: 'REFUSE',
        feedbackReason: reason,
        clientRejectReason: reason,
        clientRejectDetails: details || proposal.clientRejectDetails || null,
      },
    });

    // 3. Notifier le vendeur
    await prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'OFFRE_REFUSEE',
        title: 'Offre refusée',
        message: `Votre offre pour "${proposal.product.name}" a été refusée par ${session.user.name}`,
        link: `/vendeur/offres/${id}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/refuse error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}