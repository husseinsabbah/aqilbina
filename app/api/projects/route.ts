// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ===== GET : Récupérer les projets de l’utilisateur connecté =====
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isArtisan = session.user.role === 'artisan' || session.user.trade === 'artisan';
    if (!isArtisan) {
      return NextResponse.json({ error: 'Accès réservé aux artisans' }, { status: 403 });
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const isArtisan = session.user.role === 'artisan' || session.user.trade === 'artisan';
    if (!isArtisan) {
      return NextResponse.json({ error: 'Accès réservé aux artisans' }, { status: 403 });
    }

    const body = await request.json();

    // Extraction sécurisée des champs
    const {
      name,
      description,
      type,
      surface,
      budgetEstimate,
      items = [],
      solDetails,
      murDetails,
      status,
    } = body;

    if (!name || !items || items.length === 0) {
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

    // Préparer les items (produits et services)
    const projectItems = items.map((item: any) => {
      if (item.productId) {
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPriceHtAtSale: item.unitPriceHtAtSale,
          tvaRate: item.tvaRate || 20,
        };
      } else if (item.serviceId) {
        return {
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPriceHtAtSale: item.unitPriceHtAtSale,
          tvaRate: item.tvaRate || 20,
        };
      } else {
        throw new Error('Chaque item doit avoir soit productId soit serviceId');
      }
    });

    // Créer le projet
    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: fullDescription,
        type: type || null,
        surface: surface ? parseFloat(surface) : null,
        budgetEstimate: budgetEstimate ? parseFloat(budgetEstimate) : null,
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