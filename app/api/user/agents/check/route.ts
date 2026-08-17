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

    const userAgents = await prisma.userAgent.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { status: 'TRIAL', trialEndDate: { gt: new Date() } },
          { status: 'ACTIVE', endDate: { gt: new Date() } },
        ],
      },
    });

    return NextResponse.json({ hasActive: userAgents.length > 0 });
  } catch (error) {
    console.error('Check agent error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}