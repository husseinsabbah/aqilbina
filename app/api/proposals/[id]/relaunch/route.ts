import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity, unitPrice, message, deliveryDate, marketingMessage } = body;

    // Récupérer l'offre existante (doit être expirée ou en attente)
    const oldProposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: { product: true, project: true },
    });

    if (!oldProposal) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }

    if (oldProposal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Si l'offre est encore en attente, on la marque comme "RELANCEE" pour annuler l'ancienne
    // Si elle est expirée, on la laisse en "EXPIREE" et on crée une nouvelle offre
    if (oldProposal.status === 'EN_ATTENTE') {
      await prisma.vendorProposal.update({
        where: { id },
        data: { status: 'RELANCEE' },
      });
    } else if (oldProposal.status === 'EXPIREE') {
      // On ne modifie pas l'ancienne, on crée une nouvelle offre
    } else {
      return NextResponse.json(
        { error: 'Cette offre ne peut pas être relancée' },
        { status: 400 }
      );
    }

    // Calcul du stock disponible (physique - réservé)
    const product = await prisma.product.findUnique({
      where: { id: oldProposal.productId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    const availableStock = product.stock - product.reservedStock;
    const newQuantity = parseFloat(quantity) || oldProposal.quantity;
    if (newQuantity > availableStock) {
      return NextResponse.json(
        { error: `Stock insuffisant. Disponible : ${availableStock}` },
        { status: 400 }
      );
    }

    // 1. Si l'ancienne offre était en attente, on a déjà libéré son stock en la passant en RELANCEE
    //    Mais si elle était expirée, le stock est déjà libéré (par le cron)
    // 2. Créer la nouvelle offre
    const newProposal = await prisma.vendorProposal.create({
      data: {
        projectId: oldProposal.projectId,
        productId: oldProposal.productId,
        userId: session.user.id,
        quantity: newQuantity,
        unitPrice: parseFloat(unitPrice) || oldProposal.unitPrice,
        message: message || oldProposal.message || null,
        marketingMessage: marketingMessage || oldProposal.marketingMessage || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : oldProposal.deliveryDate || null,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
        status: 'EN_ATTENTE',
      },
    });

    // 3. Geler le stock pour la nouvelle offre
    await prisma.product.update({
      where: { id: oldProposal.productId },
      data: { reservedStock: { increment: newQuantity } },
    });

    // 4. Notifier l'artisan
    await prisma.notification.create({
      data: {
        userId: oldProposal.project.userId,
        type: 'OFFRE_RELANCEE',
        title: 'Offre relancée',
        message: `Le vendeur a relancé une offre pour le projet "${oldProposal.project.name}"`,
        link: `/artisan/projets/${oldProposal.projectId}`,
      },
    });

    return NextResponse.json(newProposal, { status: 201 });
  } catch (error) {
    console.error('POST /api/proposals/[id]/relaunch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}