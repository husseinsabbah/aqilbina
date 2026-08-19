// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/role-access';

// ===== GET : Récupérer les projets de l’utilisateur connecté =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ===== POST : Créer un nouveau projet =====
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
        error: 'Vous devez activer un abonnement pour créer un projet.',
      }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      type,
      surface,
      budgetEstimate,
      clientBudgetMax,
      items = [],
      solDetails,
      murDetails,
      status,
    } = body;

    const validItems = Array.isArray(items)
      ? items.filter((item: any) => item && (item.productId || item.serviceId))
      : [];

    if (!name || validItems.length === 0) {
      return NextResponse.json(
        { error: 'Nom et au moins un item (produit ou service) sont obligatoires' },
        { status: 400 }
      );
    }

    // Construire la description enrichie (si des détails sol/murs sont fournis)
    let fullDescription = description || null;
    if (solDetails || murDetails) {
      const details = {
        description: description || null,
        sol: solDetails || null,
        mur: murDetails || null,
      };
      fullDescription = JSON.stringify(details);
    }

    const defaultCatalog = await prisma.catalog.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    }) ?? await prisma.catalog.create({
      data: {
        userId: session.user.id,
        name: 'Catalogue principal',
        description: 'Catalogue principal généré automatiquement',
      },
    });

    // Préparer les items (produits et services)
    const projectItems = await Promise.all(validItems.map(async (item: any) => {
      if (item.productId) {
        const productId = String(item.productId);

        const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
        const createdProduct = existingProduct ?? await prisma.product.create({
          data: {
            id: productId,
            userId: session.user.id,
            catalogId: defaultCatalog.id,
            name: String(item.name || 'Produit requis').trim() || 'Produit requis',
            description: 'Produit généré automatiquement pour ce projet',
            category: 'Divers',
            purchasePrice: Number(item.unitPriceHtAtSale || 0) * 1.2,
            salePrice: Number(item.unitPriceHtAtSale || 0) * 1.2,
            stock: 999,
            tvaRate: Number(item.tvaRate || 20),
          },
        });

        return {
          productId: createdProduct.id,
          quantity: Number(item.quantity || 1),
          unitPriceHtAtSale: Number(item.unitPriceHtAtSale || 0),
          tvaRate: Number(item.tvaRate || 20),
        };
      }

      if (item.serviceId) {
        const serviceId = String(item.serviceId);

        const existingService = await prisma.service.findUnique({ where: { id: serviceId } });
        const createdService = existingService ?? await prisma.service.create({
          data: {
            id: serviceId,
            userId: session.user.id,
            name: String(item.name || 'Prestation demandée').trim() || 'Prestation demandée',
            serviceCategory: 'prestation',
            unit: 'm²',
            unitPrice: Number(item.unitPriceHtAtSale || 0) * 1.2,
            isActive: true,
          },
        });

        return {
          serviceId: createdService.id,
          quantity: Number(item.quantity || 1),
          unitPriceHtAtSale: Number(item.unitPriceHtAtSale || 0),
          tvaRate: Number(item.tvaRate || 20),
        };
      }

      throw new Error('Chaque item doit avoir soit productId soit serviceId');
    }));

    // Créer le projet
    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: fullDescription,
        type: type || null,
        surface: surface ? parseFloat(surface) : null,
        budgetEstimate: budgetEstimate ? parseFloat(budgetEstimate) : null,
        clientBudgetMax: clientBudgetMax ? parseFloat(clientBudgetMax) : null,
        status: status && ['BROUILLON', 'PUBLIE', 'EN_COURS', 'EN_ATTENTE'].includes(status)
          ? status
          : 'PUBLIE',
        items: {
          create: projectItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}