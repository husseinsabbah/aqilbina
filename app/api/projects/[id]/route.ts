// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

// ========== GET : récupérer un projet avec ses items ==========
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const { permission } = await getUserProjectPermission(session.user.id, projectId);
    if (!permission) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json({
      ...project,
      userPermission: permission,
    });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ========== PUT : mettre à jour les notes de paiement (ou autres) ==========
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const { permission } = await getUserProjectPermission(session.user.id, projectId);
    if (!permission || !['EDIT', 'VALIDATE'].includes(permission)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const {
      paymentNotes,
      attachmentUrl,
      startDate,
      endDate,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      clientFeedbackStatus,
      clientFeedbackMessage,
      clientRejectReason,
      clientRejectDetails,
      sharePublicUrl,
      projectProgressMedia,
      portfolioMedia,
      portfolioRating,
      portfolioReview,
      clientBudgetMax,
      depositAmount,
      depositPercent,
      depositProofUrl,
      depositValidated,
      handoffStatus,
      handoffTargetFamily,
      handoffMessage,
    } = body;

    const normalizedDepositAmount = depositAmount !== undefined
      ? (depositAmount === '' || depositAmount === null ? null : Number(depositAmount))
      : project.depositAmount;

    const normalizedDepositPercent = depositPercent !== undefined
      ? (depositPercent === '' || depositPercent === null ? null : Number(depositPercent))
      : project.depositPercent;

    const normalizedDepositValidated = depositValidated !== undefined
      ? Boolean(depositValidated)
      : project.depositValidated;

    const normalizedProgressMedia = Array.isArray(projectProgressMedia)
      ? JSON.stringify(projectProgressMedia)
      : (typeof projectProgressMedia === 'string' ? projectProgressMedia : project.projectProgressMedia);

    const existingMetadata = (project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata))
      ? { ...(project.metadata as Record<string, unknown>) }
      : {};

    const nextMetadata = {
      ...existingMetadata,
      ...(handoffStatus !== undefined ? { handoffStatus: handoffStatus || 'none' } : {}),
      ...(handoffTargetFamily !== undefined ? { handoffTargetFamily: handoffTargetFamily || null } : {}),
      ...(handoffMessage !== undefined ? { handoffMessage: handoffMessage || '' } : {}),
      handoffUpdatedAt: new Date().toISOString(),
    };

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        paymentNotes: paymentNotes ?? project.paymentNotes,
        attachmentUrl: attachmentUrl ?? project.attachmentUrl,
        startDate: startDate ? new Date(startDate) : project.startDate,
        endDate: endDate ? new Date(endDate) : project.endDate,
        clientName: clientName ?? project.clientName,
        clientPhone: clientPhone ?? project.clientPhone,
        clientEmail: clientEmail ?? project.clientEmail,
        clientAddress: clientAddress ?? project.clientAddress,
        clientFeedbackStatus: clientFeedbackStatus ?? project.clientFeedbackStatus,
        clientFeedbackMessage: clientFeedbackMessage ?? project.clientFeedbackMessage,
        clientRejectReason: clientRejectReason ?? project.clientRejectReason,
        clientRejectDetails: clientRejectDetails ?? project.clientRejectDetails,
        sharePublicUrl: sharePublicUrl ?? project.sharePublicUrl,
        projectProgressMedia: normalizedProgressMedia ?? project.projectProgressMedia,
        portfolioMedia: portfolioMedia ?? project.portfolioMedia,
        portfolioRating: portfolioRating !== undefined ? (portfolioRating === '' || portfolioRating === null ? null : Number(portfolioRating)) : project.portfolioRating,
        portfolioReview: portfolioReview ?? project.portfolioReview,
        clientBudgetMax: clientBudgetMax !== undefined ? (clientBudgetMax === '' || clientBudgetMax === null ? null : Number(clientBudgetMax)) : project.clientBudgetMax,
        depositAmount: normalizedDepositAmount,
        depositPercent: normalizedDepositPercent,
        depositProofUrl: depositProofUrl ?? project.depositProofUrl,
        depositValidated: normalizedDepositValidated || (
          normalizedDepositPercent !== null && normalizedDepositPercent >= 25
        ) || (
          normalizedDepositAmount !== null && project.clientBudgetMax !== null && project.clientBudgetMax > 0 && (normalizedDepositAmount / project.clientBudgetMax) * 100 >= 25
        ),
        metadata: nextMetadata,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('PUT /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}