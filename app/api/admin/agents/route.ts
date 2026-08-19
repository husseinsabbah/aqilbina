import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userAgents: {
          select: {
            id: true,
            status: true,
            userId: true,
          },
        },
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('GET /api/admin/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      specialty,
      description,
      priceMonthly,
      priceYearly,
      isActive,
    } = body ?? {};

    if (!name || !type) {
      return NextResponse.json({ error: 'Nom et type requis' }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        specialty: specialty?.trim() || null,
        description: description?.trim() || null,
        priceMonthly: Number(priceMonthly ?? 0),
        priceYearly: Number(priceYearly ?? 0),
        isActive: Boolean(isActive ?? true),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'AGENT_CREATED',
        details: `Agent ${agent.name} créé`,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
