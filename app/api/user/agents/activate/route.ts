import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({ message: 'Route fonctionnelle' });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, quantity = 1 } = body;

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

    const effectiveAgentId = agent.id;

    const existing = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        agentId: effectiveAgentId,
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'Vous avez déjà cet agent' }, { status: 400 });
    }

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
          defaultCatalog = await prisma.catalog.create({
            data: {
              userId: session.user.id,
              name: catalogName,
              description: 'Catalogue principal pour les produits de carrelage',
            },
          });
        }
      }
    }

    for (let i = 0; i < quantity; i++) {
      const userAgent = await prisma.userAgent.create({
        data: {
          userId: session.user.id,
          agentId: effectiveAgentId,
          status: 'TRIAL',
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startDate: new Date(),
        },
      });
      created.push(userAgent);
    }

    return NextResponse.json({ success: true, agents: created, catalog: defaultCatalog }, { status: 201 });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}