// app/api/artisan/proposals/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer tous les projets de l'artisan
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json([]);
    }

    // Récupérer les offres liées à ces projets, avec les infos du vendeur et du produit
    const proposals = await prisma.vendorProposal.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        product: {
          select: { name: true, salePrice: true },
        },
        user: {
          select: { name: true, companyName: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Reformater pour correspondre au type attendu dans la page artisan
    const formatted = proposals.map(p => ({
      id: p.id,
      projectId: p.projectId,
      productId: p.productId,
      userId: p.userId,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      status: p.status,
      message: p.message,
      marketingMessage: p.marketingMessage,
      deliveryDate: p.deliveryDate,
      createdAt: p.createdAt,
      product: p.product,
      vendor: p.user,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/artisan/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}