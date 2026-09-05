import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const validStatuses = ['PENDING', 'VALIDATED', 'REJECTED', 'MODIFIED'] as const;

async function getProjectAndTeams(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      userId: true,
      teamAccesses: {
        select: {
          teamId: true,
          permission: true,
        },
      },
    },
  });

  if (!project) return { project: null, access: null };

  const memberships = await prisma.teamMember.findMany({
    where: { userId, isActive: true },
    select: { teamId: true, role: true },
  });

  const memberTeams = new Set(memberships.map((m) => m.teamId));
  const projectTeamAccess = project.teamAccesses.filter((entry) => memberTeams.has(entry.teamId));

  return {
    project,
    access: {
      isOwner: project.userId === userId,
      teamPermissions: projectTeamAccess.map((entry) => entry.permission),
      teamIds: projectTeamAccess.map((entry) => entry.teamId),
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;
    const { project, access } = await getProjectAndTeams(id, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (!access?.isOwner && (access?.teamIds.length || 0) === 0) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const recommendations = await prisma.aiRecommendation.findMany({
      where: { projectId: id },
      include: {
        agent: { select: { id: true, name: true, type: true, specialty: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        validatedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('GET /api/projects/[id]/recommendations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;
    const { project, access } = await getProjectAndTeams(id, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (!access?.isOwner && (access?.teamIds.length || 0) === 0) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const body = await request.json();
    const agentId = String(body.agentId || '').trim();
    const category = String(body.category || '').trim();
    const content = String(body.content || '').trim();
    const sourceContext = body.sourceContext ? String(body.sourceContext) : null;

    if (!agentId || !category || !content) {
      return NextResponse.json({ error: 'agentId, category et content sont requis' }, { status: 400 });
    }

    const recommendation = await prisma.aiRecommendation.create({
      data: {
        projectId: id,
        agentId,
        category,
        content,
        sourceContext,
        createdByUserId: session.user.id,
        status: 'PENDING',
      },
      include: {
        agent: { select: { id: true, name: true, type: true, specialty: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(recommendation, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/recommendations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;
    const { project, access } = await getProjectAndTeams(id, session.user.id);

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const canValidate = access?.isOwner || (access?.teamPermissions || []).some((permission) => ['VALIDATE', 'EDIT'].includes(permission));
    if (!canValidate) {
      return NextResponse.json({ error: 'Acces refuse pour validation' }, { status: 403 });
    }

    const body = await request.json();
    const recommendationId = String(body.recommendationId || '').trim();
    const status = String(body.status || '').trim().toUpperCase();
    const validationNote = body.validationNote ? String(body.validationNote) : null;

    if (!recommendationId || !validStatuses.includes(status as (typeof validStatuses)[number])) {
      return NextResponse.json({ error: 'recommendationId et status valide sont requis' }, { status: 400 });
    }

    const updated = await prisma.aiRecommendation.update({
      where: { id: recommendationId },
      data: {
        status,
        validationNote,
        validatedByUserId: session.user.id,
        validatedAt: new Date(),
      },
      include: {
        agent: { select: { id: true, name: true, type: true, specialty: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        validatedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/projects/[id]/recommendations error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
