import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const detail = request.nextUrl.searchParams.get('detail') === 'true';

    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });

    if (detail) {
      return NextResponse.json(
        userAgents.map((userAgent) => ({
          ...userAgent,
          agent: userAgent.agent,
        }))
      );
    }

    return NextResponse.json(
      userAgents.map((userAgent) => ({
        id: userAgent.id,
        name: userAgent.customName || userAgent.agent.name,
        type: userAgent.agent.type,
        category: userAgent.agent.specialty ?? null,
        agentId: userAgent.agentId,
        customName: userAgent.customName,
        status: userAgent.status,
        startDate: userAgent.startDate,
        endDate: userAgent.endDate,
        trialEndDate: userAgent.trialEndDate,
      }))
    );
  } catch (error) {
    console.error('Erreur récupération agents utilisateur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
