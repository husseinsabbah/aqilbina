import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function buildEstimate(project: any) {
  const surface = Number(project.surface || 0);
  const defaultMaterials = [
    { material: 'Carrelage', unit: 'm²', quantity: Math.max(surface * 1.1, 1), priceUnit: 18 },
    { material: 'Colle', unit: 'kg', quantity: Math.max(surface * 0.6, 1), priceUnit: 8 },
    { material: 'Joint', unit: 'kg', quantity: Math.max(surface * 0.2, 1), priceUnit: 6 },
    { material: 'Croisillons', unit: 'unité', quantity: Math.max(surface * 2, 10), priceUnit: 0.3 },
  ];

  return defaultMaterials.map((item) => ({
    ...item,
    totalPrice: Number((item.quantity * item.priceUnit).toFixed(2)),
  }));
}

function buildSteps(project: any) {
  const base = [
    { title: 'Préparation du chantier', description: 'Vérifier le support, les mesures et l’accès au site.', order: 1, durationDays: 1 },
    { title: 'Préparation du support', description: 'Nettoyage, planéité et application des protections.', order: 2, durationDays: 2 },
    { title: 'Pose des matériaux', description: 'Mise en œuvre selon le type de projet et les recommandations techniques.', order: 3, durationDays: 3 },
    { title: 'Finitions', description: 'Jointoiement, nettoyage et vérification finale.', order: 4, durationDays: 2 },
  ];

  if (project.type?.toLowerCase().includes('peinture')) {
    return [
      { title: 'Diagnostic', description: 'Contrôle de l’état des murs et préparation du support.', order: 1, durationDays: 1 },
      { title: 'Préparation', description: 'Ponçage et traitement des défauts.', order: 2, durationDays: 2 },
      { title: 'Peinture', description: 'Application des couches et vérification de la finition.', order: 3, durationDays: 3 },
    ];
  }

  return base;
}

function buildComparisons(project: any) {
  const surface = Number(project.surface || 0);
  const basePrice = Math.max(surface * 20, 200);
  return [
    {
      vendorName: 'Vendeur A',
      totalPrice: Number((basePrice * 0.95).toFixed(2)),
      deliveryDays: 3,
      products: JSON.stringify([{ name: 'Carrelage', price: Number((surface * 18).toFixed(2)) }]),
      score: 92,
    },
    {
      vendorName: 'Vendeur B',
      totalPrice: Number((basePrice * 1.05).toFixed(2)),
      deliveryDays: 5,
      products: JSON.stringify([{ name: 'Carrelage premium', price: Number((surface * 23).toFixed(2)) }]),
      score: 88,
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body ?? {};

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: { include: { product: true, service: true } },
      },
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const estimateItems = buildEstimate(project);
    const stepItems = buildSteps(project);
    const comparisons = buildComparisons(project);

    const savedEstimates = await Promise.all(
      estimateItems.map((item) =>
        prisma.projectEstimate.create({
          data: {
            projectId: project.id,
            material: item.material,
            quantity: Number(item.quantity),
            unit: item.unit,
            priceUnit: Number(item.priceUnit),
            totalPrice: Number(item.totalPrice),
          },
        })
      )
    );

    const savedSteps = await Promise.all(
      stepItems.map((step) =>
        prisma.projectStep.create({
          data: {
            projectId: project.id,
            title: step.title,
            description: step.description,
            order: step.order,
            durationDays: step.durationDays,
          },
        })
      )
    );

    const savedComparisons = await Promise.all(
      comparisons.map((comparison) =>
        prisma.offerComparison.create({
          data: {
            projectId: project.id,
            vendorId: session.user.id,
            totalPrice: Number(comparison.totalPrice),
            deliveryDays: comparison.deliveryDays,
            products: comparison.products,
            score: comparison.score,
          },
        })
      )
    );

    return NextResponse.json({
      estimate: savedEstimates,
      steps: savedSteps,
      comparisons: savedComparisons,
      summary: {
        materials: estimateItems.length,
        steps: stepItems.length,
        offers: comparisons.length,
      },
    });
  } catch (error) {
    console.error('POST /api/artisan/assistant error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
