import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const allowedPermissions = ['READ', 'COMMENT', 'EDIT', 'VALIDATE'] as const;

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
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
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const memberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
    });
    const memberTeamIds = memberships.map((m) => m.teamId);

    const canRead = project.userId === session.user.id || memberTeamIds.length > 0;
    if (!canRead) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const accessRows = await prisma.projectTeamAccess.findMany({
      where: { projectId: id },
      include: {
        team: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: { select: { id: true, name: true, email: true, role: true, trade: true } },
              },
            },
          },
        },
        grantedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(accessRows);
  } catch (error) {
    console.error('GET /api/projects/[id]/team-access error:', error);
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
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le proprietaire du projet peut accorder cet acces' }, { status: 403 });
    }

    const body = await request.json();
    const teamId = String(body.teamId || '').trim();
    const permission = String(body.permission || 'READ').toUpperCase();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId requis' }, { status: 400 });
    }

    if (!allowedPermissions.includes(permission as (typeof allowedPermissions)[number])) {
      return NextResponse.json({ error: 'Permission invalide' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, ownerId: true } });
    if (!team || team.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Equipe introuvable pour ce compte' }, { status: 404 });
    }

    const access = await prisma.projectTeamAccess.upsert({
      where: { projectId_teamId: { projectId: id, teamId } },
      update: {
        permission,
        grantedById: session.user.id,
      },
      create: {
        projectId: id,
        teamId,
        permission,
        grantedById: session.user.id,
      },
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/team-access error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Seul le proprietaire du projet peut retirer cet acces' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const accessId = String(body.accessId || '').trim();

    if (!accessId) {
      return NextResponse.json({ error: 'accessId requis' }, { status: 400 });
    }

    await prisma.projectTeamAccess.delete({ where: { id: accessId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/projects/[id]/team-access error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
