import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { userAgents: true },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('GET /api/admin/agents/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const current = await prisma.agent.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? current.name,
        type: body.type?.trim() ?? current.type,
        specialty: body.specialty === undefined ? current.specialty : (body.specialty?.trim() || null),
        description: body.description === undefined ? current.description : (body.description?.trim() || null),
        priceMonthly: body.priceMonthly !== undefined ? Number(body.priceMonthly) : current.priceMonthly,
        priceYearly: body.priceYearly !== undefined ? Number(body.priceYearly) : current.priceYearly,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : current.isActive,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'AGENT_UPDATED',
        details: `Agent ${updated.name} mis à jour`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/admin/agents/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { userAgents: true },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    const hasActiveSubscription = agent.userAgents.some((userAgent) =>
      ['TRIAL', 'ACTIVE', 'PENDING'].includes(userAgent.status)
    );

    if (hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un agent avec des abonnements actifs' },
        { status: 409 }
      );
    }

    await prisma.agent.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'AGENT_DELETED',
        details: `Agent ${agent.name} supprimé`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/agents/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
