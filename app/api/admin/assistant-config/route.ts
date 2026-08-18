import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const where = session.user.role === 'admin'
      ? {}
      : { userId: session.user.id };

    const configs = await prisma.assistantConfig.findMany({
      where,
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('GET /api/admin/assistant-config error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, name, role, tone, systemPrompt, rules, isActive } = body;

    if (!agentId || !name || !role || !tone || !systemPrompt || !rules) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const userAgent = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        agentId,
      },
    });

    if (!userAgent && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Agent non autorisé' }, { status: 403 });
    }

    const config = await prisma.assistantConfig.create({
      data: {
        userId: session.user.id,
        agentId,
        name,
        role,
        tone,
        systemPrompt,
        rules,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/assistant-config error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
