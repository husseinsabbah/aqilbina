import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body ?? {};

    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: updatedUser.id,
        action: 'ROLE_UPDATED',
        details: `Rôle changé en ${updatedUser.role}`,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
