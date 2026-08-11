import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 params est une Promise
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: projectId } = await params; // 👈 Résoudre params

    // Vérifier l'accès au projet
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
        product: {
          select: { name: true, salePrice: true },
        },
        service: {
          select: { name: true, unitPriceHt: true },
        },
      },
    });

    const formattedItems = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceHtAtSale: item.unitPriceHtAtSale,
      tvaRate: item.tvaRate,
      product: item.product || undefined,
      service: item.service || undefined,
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('GET /api/projects/[id]/items error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

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
    const { productId, serviceId, quantity } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantité requise' }, { status: 400 });
    }
    if (!productId && !serviceId) {
      return NextResponse.json({ error: 'Produit ou service requis' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    let unitPriceHtAtSale = 0;
    let tvaRate = 0;

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
      }
      unitPriceHtAtSale = product.salePrice / (1 + product.tvaRate / 100);
      tvaRate = product.tvaRate;
    } else if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (!service) {
        return NextResponse.json({ error: 'Service introuvable' }, { status: 404 });
      }
      unitPriceHtAtSale = service.unitPriceHt;
      tvaRate = service.tvaRate;
    }

    const item = await prisma.projectItem.create({
      data: {
        projectId,
        productId: productId || null,
        serviceId: serviceId || null,
        quantity,
        unitPriceHtAtSale,
        tvaRate,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/items error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}