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

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        adminUser: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(logs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      createdAt: log.createdAt,
      adminUser: log.adminUser,
      targetUser: log.targetUser,
    })));
  } catch (error) {
    console.error('GET /api/admin/audit error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { action, details, targetUserId, metadata } = body ?? {};

    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: targetUserId || null,
        action,
        details: details || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/admin/audit error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
