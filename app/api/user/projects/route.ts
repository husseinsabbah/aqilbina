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

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { teamId: true },
    });

    const accessibleTeamIds = teamMemberships.map((member) => member.teamId);

    const teamProjectAccesses = accessibleTeamIds.length > 0
      ? await prisma.projectTeamAccess.findMany({
          where: {
            teamId: { in: accessibleTeamIds },
          },
          select: { projectId: true, permission: true },
        })
      : [];

    const permissionRank: Record<string, number> = { READ: 1, COMMENT: 2, EDIT: 3, VALIDATE: 4 };
    const projectPermissionMap = new Map<string, string>();

    for (const access of teamProjectAccesses) {
      const current = projectPermissionMap.get(access.projectId) || 'READ';
      const currentRank = permissionRank[current] ?? 0;
      const nextRank = permissionRank[access.permission] ?? 0;
      if (nextRank > currentRank) {
        projectPermissionMap.set(access.projectId, access.permission);
      }
    }

    const sharedProjectIds = [...new Set(teamProjectAccesses.map((access) => access.projectId))];

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          ...(sharedProjectIds.length > 0 ? [{ id: { in: sharedProjectIds } }] : []),
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        status: true,
        clientFeedbackStatus: true,
        sharePublicUrl: true,
        clientName: true,
        clientEmail: true,
        createdAt: true,
        updatedAt: true,
        projectAccessPinSentAt: true,
        projectAccessPinExpiresAt: true,
        userId: true,
      },
    });

    const normalized = projects.map((project) => {
      const status = String(project.status || 'ACTIVE').toUpperCase();
      const isArchived = ['TERMINE', 'REFUSE', 'ARCHIVE'].includes(status);
      const isSharedProject = project.userId !== session.user.id;
      const projectPermission = project.userId === session.user.id
        ? 'VALIDATE'
        : projectPermissionMap.get(project.id) || 'READ';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH_URL || 'http://localhost:3000';
      const normalizedUrl = project.sharePublicUrl
        ? project.sharePublicUrl.includes('/undefined/projets/')
          ? project.sharePublicUrl.replace(/\/undefined\/projets\//, '/projets/')
          : project.sharePublicUrl
        : `${baseUrl.replace(/\/$/, '')}/projets/${project.id}`;

      return {
        ...project,
        isArchived,
        isSharedProject,
        projectPermission,
        sharePublicUrl: normalizedUrl,
        statusLabel: {
          ACTIVE: 'Demande active',
          PENDING: 'En attente',
          NEGOCIATION: 'Négociation',
          ACCEPTE: 'Projet accepté',
          REFUSE: 'Projet refusé',
          TERMINE: 'Projet terminé',
          ARCHIVE: 'Archivé',
          BROUILLON: 'Brouillon',
        }[status] || 'Demande active',
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('GET /api/user/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
