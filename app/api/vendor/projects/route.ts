import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET : récupérer tous les projets disponibles pour le vendeur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les produits du vendeur avec leur stock
    const sellerProducts = await prisma.product.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        stock: true,
        reservedStock: true,
        category: true,
      },
    });

    // Récupérer les projets des artisans (publiques ou partagés)
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['PUBLIE', 'EN_COURS'] },
        userId: { not: session.user.id },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Enrichir les projets avec les disponibilités des produits du vendeur
    const enrichedProjects = projects.map(project => {
      const availabilityDetails = project.items
        .filter(item => item.product)
        .map(item => {
          const sellerProduct = sellerProducts.find(p => p.id === item.productId);
          const available = sellerProduct ? sellerProduct.stock - sellerProduct.reservedStock : 0;
          return {
            name: item.product?.name || 'Produit inconnu',
            quantity: item.quantity,
            available: available > 0,
            stock: sellerProduct?.stock || 0,
            productId: item.productId,
          };
        });

      const allAvailable = availabilityDetails.every(d => d.available);
      const someAvailable = availabilityDetails.some(d => d.available);

      const color = allAvailable ? 'green' : someAvailable ? 'orange' : 'red';

      return {
        id: project.id,
        name: project.name,
        type: project.type,
        surface: project.surface,
        clientName: project.clientName || 'Client anonyme',
        description: project.description,
        needs: project.items.map(item => ({
          id: item.id,
          name: item.product?.name || item.service?.name || 'Prestation',
          quantity: item.quantity,
        })),
        availabilityDetails,
        color,
        createdAt: project.createdAt,
      };
    });

    return NextResponse.json(enrichedProjects);
  } catch (error) {
    console.error('GET /api/vendor/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}