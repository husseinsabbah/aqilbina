// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/role-access';

// ===== GET : Récupérer les projets de l’utilisateur connecté =====
function normalizePublicProjectUrl(projectId: string, url?: string | null) {
  if (!url) return `http://localhost:3000/projets/${projectId}`;
  const trimmed = url.trim();
  const normalized = trimmed.replace(/\/$/, '');
  if (normalized.includes('/undefined/projets/')) {
    return normalized.replace(/\/undefined\/projets\//, '/projets/');
  }
  if (normalized.includes('/projets/')) {
    return normalized;
  }
  return `${normalized}/projets/${projectId}`;
}

function getPublicBaseUrl(): string {
  const rawBase = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH_URL || 'http://localhost:3000';
  return rawBase.replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        ...(q
          ? {
              OR: [
                { clientName: { contains: q } },
                { clientPhone: { contains: q } },
                { clientEmail: { contains: q } },
              ],
            }
          : {}),
      },
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

    return NextResponse.json(projects.map((project) => ({
      ...project,
      sharePublicUrl: normalizePublicProjectUrl(project.id, project.sharePublicUrl || `${getPublicBaseUrl()}/projets/${project.id}`),
    })));
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

    const deduplicatedItems = validItems.filter((item: any, index: number, arr: any[]) => {
      const key = item.productId ? `product:${item.productId}` : `service:${item.serviceId}`;
      return arr.findIndex((candidate) => {
        const candidateKey = candidate.productId ? `product:${candidate.productId}` : `service:${candidate.serviceId}`;
        return candidateKey === key;
      }) === index;
    });

    if (!name || deduplicatedItems.length === 0) {
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
    const projectItems = await Promise.all(deduplicatedItems.map(async (item: any) => {
      if (item.productId) {
        const productId = String(item.productId);

        const createdProduct = await prisma.product.upsert({
          where: { id: productId },
          update: {},
          create: {
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

        const createdService = await prisma.service.upsert({
          where: { id: serviceId },
          update: {},
          create: {
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
        sharePublicUrl: `${getPublicBaseUrl()}/projets/${Date.now()}`,
        items: {
          create: projectItems,
        },
      },
      include: { items: true },
    });

    const finalProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        sharePublicUrl: `${getPublicBaseUrl()}/projets/${project.id}`,
      },
      include: { items: true },
    });

    return NextResponse.json(finalProject, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}