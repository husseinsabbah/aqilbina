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

const buildCatalogNameFromValue = (value?: string | null) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Catalogue Vendeur';
  const withoutPrefix = trimmed.replace(/^Catalogue\s+/i, '').trim();
  return `Catalogue ${withoutPrefix || 'Vendeur'}`;
};

const isSupervisorSpecialty = (specialty?: string | null) => {
  const normalized = (specialty ?? '').toLowerCase().trim();
  return ['superviseur', 'supervision', 'coordination', 'gestion'].includes(normalized);
};

const getSupervisorLabel = (type: string) => {
  const normalized = (type ?? '').toLowerCase();
  if (normalized === 'artisan') return 'Superviseur Artisan';
  if (normalized === 'vendeur') return 'Superviseur Vendeur';
  return 'Superviseur';
};

const ensureRoleSupervisorAgent = async (type: string) => {
  const supervisorType = type.toLowerCase();
  const supervisorName = getSupervisorLabel(supervisorType);

  const supervisorAgent = await prisma.agent.findFirst({
    where: {
      type: supervisorType,
      OR: [
        { specialty: { in: ['superviseur', 'supervision', 'coordination', 'gestion'] } },
        { name: { contains: 'superviseur' } },
      ],
    },
  });

  if (supervisorAgent) {
    return supervisorAgent;
  }

  return prisma.agent.upsert({
    where: { id: `seed-${supervisorType}-superviseur` },
    update: {
      name: supervisorName,
      type: supervisorType,
      specialty: 'superviseur',
      description: `Agent de supervision pour coordonner plusieurs agents ${supervisorType === 'artisan' ? 'artisanaux' : 'vendeurs'} spécialisés.`,
      isActive: true,
    },
    create: {
      id: `seed-${supervisorType}-superviseur`,
      name: supervisorName,
      type: supervisorType,
      specialty: 'superviseur',
      description: `Agent de supervision pour coordonner plusieurs agents ${supervisorType === 'artisan' ? 'artisanaux' : 'vendeurs'} spécialisés.`,
      priceMonthly: supervisorType === 'artisan' ? 59 : 79,
      priceYearly: supervisorType === 'artisan' ? 590 : 790,
      isActive: true,
    },
  });
};

const ensureFamilySupervisorTeam = async (userId: string, agentType: string) => {
  const familyType = agentType.toLowerCase();
  if (!['vendeur', 'artisan'].includes(familyType)) return null;

  const teamName = getSupervisorLabel(familyType);
  const existing = await prisma.team.findFirst({
    where: { ownerId: userId, name: teamName },
  });

  if (existing) return existing;

  return prisma.team.create({
    data: {
      ownerId: userId,
      name: teamName,
      specialty: familyType,
      members: {
        create: {
          userId,
          role: 'OWNER',
          isActive: true,
        },
      },
    },
  });
};

const assignUserAgentToFamilyTeam = async (userId: string, agentType: string, userAgentId: string) => {
  const familyType = agentType.toLowerCase();
  if (!['vendeur', 'artisan'].includes(familyType)) return null;

  const team = await ensureFamilySupervisorTeam(userId, familyType);
  if (!team) return null;

  return prisma.teamAgent.upsert({
    where: {
      teamId_userAgentId: {
        teamId: team.id,
        userAgentId,
      },
    },
    update: {
      isActive: true,
      assignedById: userId,
    },
    create: {
      teamId: team.id,
      userAgentId,
      assignedById: userId,
      isActive: true,
    },
  });
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

    

    const customNames = Array.from({ length: safeQuantity }, (_, index) => {
      const rawValue = requestedNames[index] ?? '';
      return sanitizeAgentName(rawValue, `${agent.name} ${index + 1}`);
    });

    const duplicateNames = customNames.filter((name, index) => customNames.findIndex((item) => item.toLowerCase() === name.toLowerCase()) !== index);
    if (duplicateNames.length > 0) {
      return NextResponse.json({ error: 'Les noms d’agents doivent être différents' }, { status: 400 });
    }

    const effectiveAgentId = agent.id;

    const activeUserAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id, status: { in: ['TRIAL', 'ACTIVE'] } },
      include: { agent: true },
    });

    const roleFamilies = ['vendeur', 'artisan'];

    for (const roleFamily of roleFamilies) {
      const specializedAgents = activeUserAgents.filter(
        (userAgent) =>
          userAgent.agent.type === roleFamily && !isSupervisorSpecialty(userAgent.agent.specialty)
      );

      const isSupervisorAgentOfFamily = agent.type === roleFamily && isSupervisorSpecialty(agent.specialty);
      const familyNeedsSupervisor = !isSupervisorAgentOfFamily && specializedAgents.length + (agent.type === roleFamily ? safeQuantity : 0) > 2;

      if (familyNeedsSupervisor) {
        const supervisorAgent = await ensureRoleSupervisorAgent(roleFamily);
        const supervisorName = getSupervisorLabel(roleFamily);

        const supervisorUserAgent = await prisma.userAgent.upsert({
          where: {
            userId_agentId_customName: {
              userId: session.user.id,
              agentId: supervisorAgent.id,
              customName: supervisorName,
            },
          },
          update: {
            status: 'TRIAL',
            trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            startDate: new Date(),
          },
          create: {
            userId: session.user.id,
            agentId: supervisorAgent.id,
            customName: supervisorName,
            status: 'TRIAL',
            trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            startDate: new Date(),
          },
        });

        await assignUserAgentToFamilyTeam(session.user.id, roleFamily, supervisorUserAgent.id);
      }
    }

    const created = [];
    let defaultCatalog = null;

    if (agent.type === 'vendeur') {
      const vendorTrade = [session.user.trade, agent.specialty, 'Vendeur']
        .map((value) => (value ?? '').trim())
        .find((value) => Boolean(value));
      const catalogName = buildCatalogNameFromValue(vendorTrade);
      const catalogDescription = vendorTrade
        ? `Catalogue principal pour les produits ${vendorTrade}`
        : 'Catalogue principal pour les produits du vendeur';

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
              in: [
                'Catalogue Vendeur',
                'Catalogue vendeur',
                'Catalogue Vendeur Matériel',
                'Catalogue Carrelage',
                'Catalogue Quincaillerie',
              ],
            },
          },
        });

        if (legacyCatalog) {
          defaultCatalog = await prisma.catalog.update({
            where: { id: legacyCatalog.id },
            data: { name: catalogName, description: catalogDescription },
          });
        } else {
          defaultCatalog = await ensureCatalogForUser(
            session.user.id,
            catalogName,
            catalogDescription
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

      await assignUserAgentToFamilyTeam(session.user.id, agent.type, userAgent.id);

      created.push({ ...userAgent, catalog: agentCatalog });
    }

    return NextResponse.json({ success: true, agents: created, catalog: defaultCatalog }, { status: 201 });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
