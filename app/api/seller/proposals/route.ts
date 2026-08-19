// app/api/seller/proposals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// ===== GET : Récupérer les offres envoyées par le vendeur connecté =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const proposals = await prisma.vendorProposal.findMany({
      where: { userId: session.user.id },
      include: {
        product: { select: { name: true, salePrice: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('GET /api/seller/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ===== POST : Créer une offre (avec gel du stock) =====
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const activeSubscription = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          { status: 'TRIAL', trialEndDate: { gt: new Date() } },
          { status: 'ACTIVE', endDate: { gt: new Date() } },
        ],
      },
    });

    if (!activeSubscription) {
      return NextResponse.json({
        error: 'Vous devez activer un abonnement pour soumettre une offre.',
      }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, productId, quantity, unitPrice, message, deliveryDate, marketingMessage } = body;

    if (!projectId || !productId || !quantity || !unitPrice) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Produit introuvable ou non autorisé' }, { status: 404 });
    }

    const availableStock = product.stock - product.reservedStock;
    if (parseFloat(quantity) > availableStock) {
      return NextResponse.json(
        { error: `Stock insuffisant. Disponible : ${availableStock}` },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    // Créer l'offre
    const proposal = await prisma.vendorProposal.create({
      data: {
        projectId,
        productId,
        userId: session.user.id,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        message: message || null,
        marketingMessage: marketingMessage || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'EN_ATTENTE',
      },
    });

    // Geler le stock
    await prisma.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: parseFloat(quantity) } },
    });

    // Notifier l'artisan
    await prisma.notification.create({
      data: {
        userId: project.userId,
        type: 'NOUVELLE_OFFRE',
        title: 'Nouvelle offre reçue',
        message: `Vous avez reçu une offre de ${session.user.name || 'un vendeur'} pour le projet "${project.name}"`,
        link: `/artisan/projets/${projectId}`,
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error('POST /api/seller/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}