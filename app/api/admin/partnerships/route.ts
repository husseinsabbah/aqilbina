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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const partnerships = await prisma.partnership.findMany({
      include: {
        initiator: {
          select: { id: true, name: true, email: true, role: true, trade: true, companyName: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, role: true, trade: true, companyName: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(partnerships);
  } catch (error) {
    console.error('GET /api/admin/partnerships error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const partnershipId = String(body?.partnershipId ?? '').trim();
    const status = String(body?.status ?? '').trim();
    const note = String(body?.note ?? '').trim();
    const mode = String(body?.mode ?? 'request').trim().toLowerCase();

    const allowedStatuses = ['PENDING', 'VALIDATED', 'REJECTED'];
    if (!partnershipId || !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Partenariat et statut requis' }, { status: 400 });
    }

    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId },
    });

    if (!partnership) {
      return NextResponse.json({ error: 'Partenariat introuvable' }, { status: 404 });
    }

    let nextStatus = partnership.status;
    let nextEvaluationStatus = partnership.evaluationStatus;

    if (mode === 'cancel') {
      if (status === 'VALIDATED') {
        nextStatus = 'CANCELLED';
        nextEvaluationStatus = 'VALIDATED';
      } else if (status === 'REJECTED') {
        nextStatus = 'ACTIVE';
        nextEvaluationStatus = 'REJECTED';
      } else if (status === 'PENDING') {
        nextStatus = 'ACTIVE';
        nextEvaluationStatus = 'PENDING';
      }
    } else {
      if (status === 'VALIDATED') {
        nextStatus = 'ACTIVE';
        nextEvaluationStatus = 'VALIDATED';
      } else if (status === 'REJECTED') {
        nextStatus = 'REJECTED';
        nextEvaluationStatus = 'REJECTED';
      } else if (status === 'PENDING') {
        nextStatus = 'PENDING';
        nextEvaluationStatus = 'PENDING';
      }
    }

    const updated = await prisma.partnership.update({
      where: { id: partnershipId },
      data: {
        status: nextStatus,
        evaluationStatus: nextEvaluationStatus,
        notes: note || partnership.notes || null,
        reviewedByAdminId: session.user.id,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: partnership.initiatorId,
        action: mode === 'cancel'
          ? status === 'VALIDATED'
            ? 'PARTNERSHIP_CANCELLATION_APPROVED'
            : status === 'REJECTED'
              ? 'PARTNERSHIP_CANCELLATION_REJECTED'
              : 'PARTNERSHIP_CANCELLATION_RESET'
          : status === 'VALIDATED'
            ? 'PARTNERSHIP_VALIDATED'
            : status === 'REJECTED'
              ? 'PARTNERSHIP_REJECTED'
              : 'PARTNERSHIP_RESET_TO_PENDING',
        details: `Décision admin ${mode === 'cancel' ? 'annulation' : 'partenariat'} ${status.toLowerCase()} pour ${partnership.targetRole}`,
        metadata: JSON.stringify({ partnershipId, targetUserId: partnership.targetUserId, role: partnership.targetRole, mode }),
      },
    });

    return NextResponse.json({ partnership: updated });
  } catch (error) {
    console.error('PATCH /api/admin/partnerships error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
