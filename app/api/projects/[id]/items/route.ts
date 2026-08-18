import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth';
import { prisma } from '@/lib/prisma'; // 👈 Utilisation de l'instance partagée

// ============================================================
// GET : Récupérer tous les items d'un projet
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const items = await prisma.projectItem.findMany({
      where: { projectId },
      select: {
        id: true,
        quantity: true,
        unitPriceHtAtSale: true,
        tvaRate: true,
        productId: true,
        serviceId: true,
      },
    });

    const formattedItems = await Promise.all(items.map(async (item) => {
      const rawItem = item as any;
      const product = rawItem.productId ? await prisma.product.findUnique({ where: { id: rawItem.productId }, select: { name: true, salePrice: true } }) : null;
      const service = rawItem.serviceId ? await prisma.service.findUnique({ where: { id: rawItem.serviceId }, select: { name: true, unitPrice: true } }) : null;
      return {
        id: rawItem.id,
        quantity: rawItem.quantity,
        unitPriceHtAtSale: rawItem.unitPriceHtAtSale,
        tvaRate: rawItem.tvaRate,
        customLabel: (rawItem as any).customLabel ?? null,
        customPrice: (rawItem as any).customPrice ?? null,
        product: product || undefined,
        service: service ? { ...service, unitPriceHt: service.unitPrice } : undefined,
      };
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('GET /api/projects/[id]/items error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// POST : Ajouter un item (produit, service ou personnalisé)
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { productId, serviceId, quantity, customLabel, customPrice } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantité requise' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Cas 1 : Produit personnalisé (sans catalogue)
    if (customLabel && customPrice !== undefined) {
      const item = await (prisma.projectItem as any).create({
        data: {
          projectId,
          quantity,
          unitPriceHtAtSale: parseFloat(customPrice),
          tvaRate: 20,
          customLabel,
          customPrice: parseFloat(customPrice),
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    // Cas 2 : Service existant
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (!service) {
        return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
      }
      const item = await (prisma.projectItem as any).create({
        data: {
          projectId,
          serviceId,
          quantity,
          unitPriceHtAtSale: service.unitPrice ?? service.unitPrice,
          tvaRate: 20,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    // Cas 3 : Produit existant
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
      }
      const unitPriceHtAtSale = product.salePrice / (1 + product.tvaRate / 100);
      const item = await (prisma.projectItem as any).create({
        data: {
          projectId,
          productId,
          quantity,
          unitPriceHtAtSale,
          tvaRate: product.tvaRate || 20,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Produit, service ou produit personnalisé requis' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/projects/[id]/items error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}