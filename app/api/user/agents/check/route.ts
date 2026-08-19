import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ hasActive: false }, { status: 401 });
    }

    const now = new Date();
    const userAgents = await prisma.userAgent.findMany({
      where: { userId: session.user.id },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeAgents = userAgents.filter((userAgent) => {
      const isTrialActive = userAgent.status === 'TRIAL' && userAgent.trialEndDate && userAgent.trialEndDate > now;
      const isActiveSubscription = userAgent.status === 'ACTIVE' && userAgent.endDate && userAgent.endDate > now;
      return isTrialActive || isActiveSubscription;
    });

    const activeAgent = activeAgents[0] ?? null;

    return NextResponse.json({
      hasActive: activeAgents.length > 0,
      activeAgent: activeAgent ? {
        id: activeAgent.id,
        agentId: activeAgent.agentId,
        name: activeAgent.customName || activeAgent.agent.name,
        status: activeAgent.status,
        trialEndDate: activeAgent.trialEndDate,
        endDate: activeAgent.endDate,
      } : null,
    });
  } catch (error) {
    console.error('Check agent error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}