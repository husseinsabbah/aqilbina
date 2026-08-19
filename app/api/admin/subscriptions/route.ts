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

    const subscriptions = await prisma.userAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
            specialty: true,
          },
        },
      },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('GET /api/admin/subscriptions error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { userAgentId, status } = body ?? {};

    if (!userAgentId || !status) {
      return NextResponse.json({ error: 'userAgentId et status requis' }, { status: 400 });
    }

    const allowedStatuses = ['PENDING', 'TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const userAgent = await prisma.userAgent.findUnique({
      where: { id: userAgentId },
      include: { user: true, agent: true },
    });

    if (!userAgent) {
      return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });
    }

    const updated = await prisma.userAgent.update({
      where: { id: userAgentId },
      data: {
        status,
        cancelledAt: status === 'CANCELLED' ? new Date() : userAgent.cancelledAt,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: userAgent.userId,
        action: 'SUBSCRIPTION_UPDATED',
        details: `Abonnement ${userAgent.agent.name} mis à ${status}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/subscriptions error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
