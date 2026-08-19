import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth';

const prisma = new PrismaClient();

// ============================================================
// SUGGESTION DE PRODUITS EN FONCTION DU PROJET
// ============================================================
const normalizeText = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MATERIAL_RULES: Record<string, { required: string[]; optional?: string[] }> = {
  carrelage: {
    required: ['carrelage', 'colle a carrelage', 'joint de carrelage', 'croisillons'],
    optional: ['primaire d accrochage', 'mortier de chape', 'resine d etancheite'],
  },
  peinture: {
    required: ['peinture', 'apprêt', 'primaire'],
    optional: ['enduit', 'ruban de masquage'],
  },
  plomberie: {
    required: ['tuyaux', 'raccords', 'joints', 'colliers', 'siphon'],
    optional: ['robinetterie', 'chauffe eau'],
  },
  electricite: {
    required: ['cables', 'gaines', 'boites de derivation', 'prises', 'interrupteurs'],
    optional: ['supports', 'domotique'],
  },
  menuiserie: {
    required: ['menuiserie', 'vis', 'quincaillerie', 'colle', 'joint'],
    optional: ['vernis', 'traitement bois'],
  },
  maconnerie: {
    required: ['ciment', 'mortier', 'brique', 'parpaing', 'chape', 'enduit'],
    optional: ['treillis', 'sable', 'gravier'],
  },
  isolation: {
    required: ['isolant', 'membrane', 'bande adhesif', 'fixations'],
    optional: ['pare vapeur'],
  },
  toiture: {
    required: ['couverture', 'sous toiture', 'liteaux', 'fixations', 'etancheite'],
    optional: ['gouttieres', 'cheneaux'],
  },
  chauffage: {
    required: ['tuyaux', 'isolant', 'vannes', 'thermostat', 'fluides'],
    optional: ['pompe', 'supports'],
  },
  dalle: {
    required: ['dalle', 'sable', 'gravier', 'sous couche', 'coulis'],
    optional: ['bordure', 'stabilisateur'],
  },
  general: { required: [], optional: [] },
};

const detectTrade = (project: any): string => {
  const text = [
    project?.type,
    project?.name,
    project?.description,
    project?.workType,
    project?.floorWork,
    project?.wallWork,
    project?.ceilingWork,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes('carrelage')) return 'carrelage';
  if (text.includes('peinture')) return 'peinture';
  if (text.includes('plomberie')) return 'plomberie';
  if (text.includes('electricite') || text.includes('électricité')) return 'electricite';
  if (text.includes('menuiserie')) return 'menuiserie';
  if (text.includes('maçonnerie') || text.includes('maconnerie')) return 'maconnerie';
  if (text.includes('isolation')) return 'isolation';
  if (text.includes('toiture')) return 'toiture';
  if (text.includes('chauffage') || text.includes('climatisation')) return 'chauffage';
  if (text.includes('dalle') || text.includes('terrasse')) return 'dalle';

  return 'general';
};

const findProductMatch = (catalog: any[], material: string) => {
  const target = normalizeText(material);

  return catalog.find((product) => {
    const name = normalizeText(product?.name ?? '');
    const category = normalizeText(product?.category ?? '');
    return (
      name.includes(target) ||
      category.includes(target) ||
      target.includes(name) ||
      target.includes(category)
    );
  });
};

const analyzeProjectRequirements = (project: any, vendorProducts: any[] = []) => {
  const trade = detectTrade(project);
  const rules = MATERIAL_RULES[trade] ?? MATERIAL_RULES.general;

  const required = (rules.required || []).map((material) => {
    const match = findProductMatch(vendorProducts, material);
    return {
      material,
      available: !!match,
      match: match?.name ?? null,
    };
  });

  return {
    trade,
    required,
  };
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    // 1. Récupérer le projet
    const project: any = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    // 2. Récupérer le catalogue de l'utilisateur
    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
    });

    const analysis = analyzeProjectRequirements(project, products);
    const requiredMatches = analysis.required.filter((item) => item.available);
    const missingRequired = analysis.required.filter((item) => !item.available);

    const suggestions: any[] = [];

    if (requiredMatches.length > 0) {
      suggestions.push({
        area: analysis.trade,
        label: `Matériaux requis (${analysis.trade})`,
        surface: project.surface || 0,
        unit: 'm²',
        recommendedProducts: requiredMatches.map((item) => {
          const product = products.find((p) => p.name === item.match || p.name?.toLowerCase().includes(item.material.toLowerCase()));
          if (!product) return null;
          return {
            id: product.id,
            name: product.name,
            price: product.salePrice,
            stock: product.stock,
            imageUrl: product.imageUrl,
          };
        }).filter(Boolean),
      });
    }

    if (missingRequired.length > 0) {
      suggestions.push({
        area: 'manquants',
        label: 'Matériaux requis mais absents du catalogue',
        surface: project.surface || 0,
        unit: 'm²',
        recommendedProducts: missingRequired.map((item) => ({
          id: `missing-${item.material}`,
          name: item.material,
          price: 0,
          stock: 0,
          imageUrl: null,
          missing: true,
        })),
      });
    }

    // 4. Si aucune suggestion, message
    if (suggestions.length === 0) {
      return NextResponse.json({
        message: 'Aucun produit suggéré. Vérifiez que votre catalogue contient des produits adaptés à ce projet.',
        suggestions: [],
      });
    }

    return NextResponse.json({ suggestions, trade: analysis.trade, missingRequired });
  } catch (error) {
    console.error('Selector error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}