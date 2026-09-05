import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// Si vous utilisez Stripe, importez Stripe
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { userAgentId } = body;

    if (!userAgentId) {
      return NextResponse.json({ error: 'userAgentId requis' }, { status: 400 });
    }

    // Récupérer le UserAgent
    const userAgent = await prisma.userAgent.findUnique({
      where: { id: userAgentId },
      include: { agent: true },
    });
    if (!userAgent || userAgent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });
    }

    // Vérifier que l'essai est encore valide
    if (userAgent.status !== 'TRIAL') {
      return NextResponse.json({ error: 'Cet abonnement n\'est pas en essai' }, { status: 400 });
    }
    if (userAgent.trialEndDate && userAgent.trialEndDate < new Date()) {
      return NextResponse.json({ error: 'La période d\'essai est expirée' }, { status: 400 });
    }

    // --- Intégration Stripe ---
    // Si vous utilisez Stripe, créez un abonnement ou un paiement unique.
    // Ici on simule un paiement réussi.
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: 'price_xxx' }],
    //   default_payment_method: paymentMethodId,
    //   trial_end: Math.floor(Date.now() / 1000) + 14 * 86400, // si vous voulez prolonger l'essai
    // });
    // Puis mettez à jour userAgent avec stripeSubscriptionId

    // Mettre à jour le UserAgent
    const updated = await prisma.userAgent.update({
      where: { id: userAgentId },
      data: {
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +1 mois
        // stripeSubscriptionId: subscription.id,
        trialEndDate: null, // fin de l'essai
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}