import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TRADE_NAME_OPTIONS = [
  'Carrelage',
  'Plomberie',
  'Électricité',
  'Peinture',
  'Menuiserie',
  'Maçonnerie',
  'Couvreur',
  'Isolation',
  'Climatisation',
  'Chauffage',
  'Ventilation',
  'Étanchéité',
  'Ferronnerie',
  'Serrurerie',
  'Vitrerie',
  'Autre',
];

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findClosestTradeName = (value: string) => {
  const cleanValue = normalizeName(value);
  if (!cleanValue) return '';

  const exact = TRADE_NAME_OPTIONS.find((option) => normalizeName(option) === cleanValue);
  if (exact) return exact;

  let bestMatch = '';
  let bestScore = 0;

  TRADE_NAME_OPTIONS.forEach((option) => {
    const optionValue = normalizeName(option);
    if (!optionValue) return;

    const startsWith = optionValue.startsWith(cleanValue) || cleanValue.startsWith(optionValue) ? 0.9 : 0;
    const includes = optionValue.includes(cleanValue) || cleanValue.includes(optionValue) ? 0.7 : 0;
    const overlap = [...new Set(cleanValue.split(''))].filter((char) => optionValue.includes(char)).length;
    const overlapScore = overlap > 0 ? overlap / Math.max(cleanValue.length, optionValue.length) : 0;
    const score = Math.max(startsWith, includes, overlapScore);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  });

  return bestScore >= 0.3 ? bestMatch : '';
};

const sanitizeAgentName = (value: string, fallback: string) => {
  const cleanName = (value || fallback || 'Agent').trim();
  const normalized = cleanName.replace(/\s+/g, ' ');
  const match = findClosestTradeName(normalized);
  return match || normalized;
};

export async function GET() {
  return NextResponse.json({ message: 'Route fonctionnelle' });
}

const ensureCatalogForUser = async (userId: string, name: string, description: string) => {
  const existing = await prisma.catalog.findFirst({
    where: { userId, name },
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.catalog.create({
      data: {
        userId,
        name,
        description,
      },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === 'P2002') {
      return prisma.catalog.findFirst({
        where: { userId, name },
      }) ?? null;
    }
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, quantity = 1, agentNames = [] } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'agentId requis' }, { status: 400 });
    }

    let agent = await prisma.agent.findUnique({
      where: { id: agentId, isActive: true },
    });

    if (!agent) {
      const legacyAgentMap: Record<string, string> = {
        '1': 'Agent Artisan',
        '2': 'Agent Vendeur Matériel',
        '3': 'Agent Vendeur Quincaillerie',
        '4': 'Agent Pro',
      };

      const legacyName = legacyAgentMap[agentId];
      if (legacyName) {
        agent = await prisma.agent.findFirst({
          where: { name: legacyName, isActive: true },
        });
      }
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable ou inactif' }, { status: 404 });
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const requestedNames = Array.isArray(agentNames) ? agentNames : [];

    const hasExistingActive = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        agentId: agent.id,
        OR: [
          { status: 'TRIAL', trialEndDate: { gt: new Date() } },
          { status: 'ACTIVE', endDate: { gt: new Date() } },
        ],
      },
    });

    if (hasExistingActive) {
      return NextResponse.json({
        error: 'Vous avez déjà un abonnement actif pour cet agent.',
      }, { status: 409 });
    }

    const customNames = Array.from({ length: safeQuantity }, (_, index) => {
      const rawValue = requestedNames[index] ?? '';
      return sanitizeAgentName(rawValue, `${agent.name} ${index + 1}`);
    });

    const duplicateNames = customNames.filter((name, index) => customNames.findIndex((item) => item.toLowerCase() === name.toLowerCase()) !== index);
    if (duplicateNames.length > 0) {
      return NextResponse.json({ error: 'Les noms d’agents doivent être différents' }, { status: 400 });
    }

    const effectiveAgentId = agent.id;

    const created = [];
    let defaultCatalog = null;

    if (agent.type === 'vendeur') {
      const catalogName = 'Catalogue Carrelage';

      const existingCatalog = await prisma.catalog.findFirst({
        where: {
          userId: session.user.id,
          name: catalogName,
        },
      });

      if (existingCatalog) {
        defaultCatalog = existingCatalog;
      } else {
        const legacyCatalog = await prisma.catalog.findFirst({
          where: {
            userId: session.user.id,
            name: {
              in: ['Catalogue Vendeur', 'Catalogue vendeur', 'Catalogue Vendeur Matériel'],
            },
          },
        });

        if (legacyCatalog) {
          defaultCatalog = await prisma.catalog.update({
            where: { id: legacyCatalog.id },
            data: { name: catalogName },
          });
        } else {
          defaultCatalog = await ensureCatalogForUser(
            session.user.id,
            catalogName,
            'Catalogue principal pour les produits de carrelage'
          );
        }
      }
    }

    for (let i = 0; i < safeQuantity; i++) {
      const catalogName = `Catalogue ${customNames[i] || agent.name}`;
      const agentCatalog = await ensureCatalogForUser(
        session.user.id,
        catalogName,
        `Catalogue de ${customNames[i] || agent.name}`
      );

      const userAgent = await prisma.userAgent.create({
        data: {
          userId: session.user.id,
          agentId: effectiveAgentId,
          customName: customNames[i],
          status: 'TRIAL',
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startDate: new Date(),
        },
      });

      created.push({ ...userAgent, catalog: agentCatalog });
    }

    return NextResponse.json({ success: true, agents: created, catalog: defaultCatalog }, { status: 201 });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
