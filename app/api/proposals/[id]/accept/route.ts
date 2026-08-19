import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/role-access';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Récupérer l'offre avec le produit
    const proposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: { product: true, project: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est bien l'artisan du projet
    if (proposal.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (proposal.status !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Cette offre a déjà été traitée' },
        { status: 400 }
      );
    }

    const quantity = proposal.quantity;

    // 1. Déduire le stock physique (le stock gelé devient définitif)
    await prisma.product.update({
      where: { id: proposal.productId },
      data: {
        stock: { decrement: quantity },
        reservedStock: { decrement: quantity },
      },
    });

    // 2. Marquer l'offre comme acceptée
    const updated = await prisma.vendorProposal.update({
      where: { id },
      data: {
        status: 'ACCEPTE',
        expirationDate: null, // plus besoin d'expiration
      },
    });

    // 3. Notifier le vendeur
    await prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'OFFRE_ACCEPTEE',
        title: 'Offre acceptée !',
        message: `Votre offre pour "${proposal.product.name}" a été acceptée par ${session.user.name}`,
        link: `/vendeur/offres/${id}`,
      },
    });

    // 4. Notifier l'artisan (confirmation)
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'OFFRE_ACCEPTEE',
        title: 'Vous avez accepté une offre',
        message: `Vous avez accepté l'offre pour "${proposal.product.name}"`,
        link: `/artisan/projets/${proposal.projectId}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/proposals/[id]/accept error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}