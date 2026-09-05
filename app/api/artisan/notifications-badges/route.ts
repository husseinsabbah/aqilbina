import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const professional = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, trade: true },
    });

    if (!professional || (professional.role !== 'artisan' && professional.trade !== 'artisan')) {
      return NextResponse.json({ demandes: false, offres: false });
    }

    const [pendingRequestsCount, projects] = await Promise.all([
      prisma.projectRecipient.count({
        where: { professionalId: userId, status: 'INVITE' },
      }),
      prisma.project.findMany({
        where: { userId },
        select: { id: true },
      }),
    ]);

    const projectIds = projects.map((p) => p.id);
    const unviewedProposalsCount = projectIds.length
      ? await prisma.vendorProposal.count({
          where: { projectId: { in: projectIds }, viewedAt: null },
        })
      : 0;

    return NextResponse.json({
      demandes: pendingRequestsCount > 0,
      offres: unviewedProposalsCount > 0,
    });
  } catch (error) {
    console.error('GET /api/artisan/notifications-badges error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
