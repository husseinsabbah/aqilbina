import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const allowedStatuses = ['INVITE', 'VUE', 'CANDIDAT', 'NEGOCIATION', 'RETENU', 'REFUSE', 'NON_RETENU'] as const;

const permissionRank: Record<string, number> = {
  READ: 1,
  COMMENT: 2,
  EDIT: 3,
  VALIDATE: 4,
};

async function getUserProjectPermission(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return { project: null, permission: null };
  }

  if (project.userId === userId) {
    return { project, permission: 'VALIDATE' };
  }

  const accesses = await prisma.projectTeamAccess.findMany({
    where: {
      projectId,
      team: {
        members: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    },
    select: { permission: true },
  });

  const maxPermission = accesses.reduce((best, access) => {
    const rank = permissionRank[access.permission] ?? 0;
    return rank > best ? rank : best;
  }, 0);

  if (maxPermission <= 0) {
    return { project, permission: null };
  }

  const highest = Object.entries(permissionRank)
    .filter(([, rank]) => rank === maxPermission)
    .map(([name]) => name)[0] || 'READ';

  return { project, permission: highest };
}

const normalizeStatus = (value: unknown) => {
  const nextValue = String(value ?? '').trim().toUpperCase();
  return allowedStatuses.includes(nextValue as (typeof allowedStatuses)[number]) ? nextValue : null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const { project, permission } = await getUserProjectPermission(session.user.id, id);
    if (!project || !permission) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const projectFull = await prisma.project.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!projectFull) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const recipients = await prisma.projectRecipient.findMany({
      where: { projectId: id },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            companyName: true,
            city: true,
            role: true,
            trade: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      projectId: projectFull.id,
      projectStatus: projectFull.status,
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        projectId: recipient.projectId,
        professionalId: recipient.professionalId,
        trade: recipient.trade,
        status: recipient.status,
        message: recipient.message,
        createdAt: recipient.createdAt,
        professional: recipient.professional,
      })),
      userPermission: permission,
    });
  } catch (error) {
    console.error('GET /api/projects/[id]/recipients error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const recipientId = String(body.recipientId || body.id || '').trim();
    const status = normalizeStatus(body.status);
    const message = String(body.message || '').trim();
    const pin = String(body.pin || '').trim();

    if (!recipientId) {
      return NextResponse.json({ error: 'Identifiant du professionnel requis.' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }

    const recipient = await prisma.projectRecipient.findUnique({
      where: { id: recipientId },
      include: { project: true },
    });

    if (!recipient || recipient.projectId !== id) {
      return NextResponse.json({ error: 'Professionnel introuvable pour ce projet.' }, { status: 404 });
    }

    const { permission } = await getUserProjectPermission(session.user.id, id);
    const isProjectOwner = session.user.id === recipient.project.userId;
    const isRecipientProfessional = session.user.id === recipient.professionalId;
    const canEditRecipients = isProjectOwner || (permission && ['EDIT', 'VALIDATE'].includes(permission));

    if (status === 'RETENU') {
      if (!isProjectOwner) {
        return NextResponse.json({ error: 'Seul le proprietaire du projet peut selectionner un professionnel.' }, { status: 403 });
      }
      if (!pin || !recipient.project.projectAccessPinHash || !(await bcrypt.compare(pin, recipient.project.projectAccessPinHash))) {
        return NextResponse.json({ error: 'Code PIN projet incorrect.' }, { status: 401 });
      }
    } else if (!isRecipientProfessional && !canEditRecipients) {
      return NextResponse.json({ error: 'Vous n\'avez pas les permissions pour modifier ce destinataire.' }, { status: 403 });
    }

    if (status === 'RETENU' && recipient.status !== 'CANDIDAT' && recipient.status !== 'NEGOCIATION' && recipient.status !== 'RETENU') {
      return NextResponse.json({ error: 'Ce professionnel doit d’abord se porter candidat.' }, { status: 409 });
    }

    if (isProjectOwner && status !== 'RETENU') {
      return NextResponse.json({ error: 'Le client utilise uniquement la sélection par PIN.' }, { status: 403 });
    }

    let nextProjectStatus = recipient.project.status;

    await prisma.$transaction(async (tx) => {
      if (status === 'RETENU') {
        await tx.projectRecipient.updateMany({
          where: {
            projectId: id,
            id: { not: recipientId },
          },
          data: { status: 'NON_RETENU' },
        });

        await tx.projectRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'RETENU',
            message: message || recipient.message || 'Professionnel retenu pour le projet.',
          },
        });

        nextProjectStatus = 'ACCEPTE';
      } else {
        await tx.projectRecipient.update({
          where: { id: recipientId },
          data: {
            status,
            message: message || recipient.message || null,
          },
        });

        if (['VUE', 'CANDIDAT', 'NEGOCIATION'].includes(status)) {
          nextProjectStatus = 'NEGOCIATION';
        } else if (['REFUSE', 'NON_RETENU'].includes(status)) {
          const hasRetained = await tx.projectRecipient.findFirst({
            where: {
              projectId: id,
              status: 'RETENU',
            },
            select: { id: true },
          });

          nextProjectStatus = hasRetained ? 'ACCEPTE' : 'ACTIVE';
        }
      }

      await tx.project.update({
        where: { id },
        data: { status: nextProjectStatus },
      });
    });

    return NextResponse.json({
      ok: true,
      status,
      projectStatus: nextProjectStatus,
      recipientId,
    });
  } catch (error) {
    console.error('PATCH /api/projects/[id]/recipients error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
