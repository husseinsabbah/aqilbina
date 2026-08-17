import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cette route sera appelée par un cron (ex: toutes les heures)
export async function GET() {
  try {
    const now = new Date();

    // Récupérer toutes les offres en attente dont la date d'expiration est passée
    const expiredProposals = await prisma.vendorProposal.findMany({
      where: {
        status: 'EN_ATTENTE',
        expirationDate: { lt: now },
      },
      include: { product: true },
    });

    let count = 0;
    for (const proposal of expiredProposals) {
      // 1. Libérer le stock gelé
      await prisma.product.update({
        where: { id: proposal.productId },
        data: { reservedStock: { decrement: proposal.quantity } },
      });

      // 2. Marquer l'offre comme expirée
      await prisma.vendorProposal.update({
        where: { id: proposal.id },
        data: { status: 'EXPIREE' },
      });

      // 3. Notifier le vendeur
      await prisma.notification.create({
        data: {
          userId: proposal.userId,
          type: 'OFFRE_EXPIREE',
          title: 'Offre expirée',
          message: `Votre offre pour "${proposal.product.name}" est expirée. Vous pouvez la relancer ou l'annuler.`,
          link: `/vendeur/offres/${proposal.id}`,
        },
      });

      count++;
    }

    return NextResponse.json({ message: `${count} offres expirées traitées` });
  } catch (error) {
    console.error('GET /api/cron/expire-proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}