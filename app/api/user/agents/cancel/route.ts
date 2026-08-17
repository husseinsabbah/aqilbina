import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { userAgentId } = body;

    if (!userAgentId) {
      return NextResponse.json({ error: 'userAgentId requis' }, { status: 400 });
    }

    const userAgent = await prisma.userAgent.findUnique({
      where: { id: userAgentId },
    });

    if (!userAgent || userAgent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    if (userAgent.status === 'CANCELLED') {
      return NextResponse.json({ message: 'Agent déjà annulé' }, { status: 200 });
    }

    const updated = await prisma.userAgent.update({
      where: { id: userAgentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        endDate: new Date(),
      },
    });

    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    console.error('Cancel agent error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
