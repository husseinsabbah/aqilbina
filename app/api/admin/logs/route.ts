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

    const [assistantLogs, adminLogs] = await Promise.all([
      prisma.assistantLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          agent: {
            select: { id: true, name: true, type: true, specialty: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          adminUser: {
            select: { id: true, name: true, email: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      assistantLogs,
      adminLogs,
    });
  } catch (error) {
    console.error('GET /api/admin/logs error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
