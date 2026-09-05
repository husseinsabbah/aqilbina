import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function assertOwnerOrManager(userId: string, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId, isActive: true },
        select: { role: true },
      },
    },
  });

  if (!team) return { ok: false as const, status: 404, error: 'Equipe introuvable' };
  const isOwner = team.ownerId === userId;
  const isManager = team.members.some((member) => ['OWNER', 'MANAGER'].includes(member.role));

  if (!isOwner && !isManager) return { ok: false as const, status: 403, error: 'Acces refuse' };
  return { ok: true as const, ownerId: team.ownerId };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const agents = await prisma.teamAgent.findMany({
      where: { teamId },
      include: {
        userAgent: {
          include: {
            agent: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('GET /api/user/teams/[teamId]/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const userAgentId = String(body.userAgentId || '').trim();

    if (!userAgentId) {
      return NextResponse.json({ error: 'userAgentId requis' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, specialty: true, name: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Equipe introuvable' }, { status: 404 });
    }

    const userAgent = await prisma.userAgent.findUnique({
      where: { id: userAgentId },
      include: { agent: true },
    });

    if (!userAgent || userAgent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent IA introuvable pour ce compte' }, { status: 404 });
    }

    const teamFamily = (team.specialty ?? team.name ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedTeamFamily = teamFamily.includes('vendeur') ? 'vendeur' : teamFamily.includes('artisan') ? 'artisan' : null;

    if (normalizedTeamFamily && userAgent.agent.type !== normalizedTeamFamily) {
      return NextResponse.json({
        error: `Cet agent appartient à la famille ${userAgent.agent.type} et ne peut pas être ajouté à une équipe ${normalizedTeamFamily}.`,
      }, { status: 400 });
    }

    const assignment = await prisma.teamAgent.upsert({
      where: { teamId_userAgentId: { teamId, userAgentId } },
      update: { isActive: true, assignedById: session.user.id },
      create: {
        teamId,
        userAgentId,
        assignedById: session.user.id,
        isActive: true,
      },
      include: {
        userAgent: { include: { agent: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('POST /api/user/teams/[teamId]/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const teamAgentId = String(body.teamAgentId || '').trim();
    const isActive = body.isActive === undefined ? undefined : Boolean(body.isActive);

    if (!teamAgentId || isActive === undefined) {
      return NextResponse.json({ error: 'teamAgentId et isActive requis' }, { status: 400 });
    }

    const updated = await prisma.teamAgent.update({
      where: { id: teamAgentId },
      data: { isActive },
      include: { userAgent: { include: { agent: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/user/teams/[teamId]/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => ({}));
    const teamAgentId = String(body.teamAgentId || '').trim();

    if (!teamAgentId) {
      return NextResponse.json({ error: 'teamAgentId requis' }, { status: 400 });
    }

    const assignment = await prisma.teamAgent.findUnique({
      where: { id: teamAgentId },
      select: { id: true, teamId: true, userAgent: { select: { userId: true } } },
    });

    if (!assignment || assignment.teamId !== teamId) {
      return NextResponse.json({ error: 'Assignation d\'agent introuvable' }, { status: 404 });
    }

    if (assignment.userAgent.userId !== session.user.id && access.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer cette assignation' }, { status: 403 });
    }

    await prisma.teamAgent.delete({ where: { id: teamAgentId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/user/teams/[teamId]/agents error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
