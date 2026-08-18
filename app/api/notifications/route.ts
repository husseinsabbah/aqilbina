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

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}