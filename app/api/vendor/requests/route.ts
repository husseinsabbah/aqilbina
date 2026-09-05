import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const professionalId = session?.user?.id;

    if (!professionalId) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const professional = await prisma.user.findUnique({
      where: { id: professionalId },
      select: { role: true, trade: true },
    });

    if (!professional || !['vendeur', 'artisan'].includes((professional.role || professional.trade || '').toLowerCase())) {
      return NextResponse.json({ error: 'Accès réservé aux professionnels.' }, { status: 403 });
    }

    const requests = await prisma.projectRecipient.findMany({
      where: { professionalId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            surface: true,
            budgetEstimate: true,
            metadata: true,
            sharePublicUrl: true,
            projectAccessPin: true,
            clientName: true,
            clientAddress: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.projectRecipient.updateMany({
      where: { professionalId, status: 'INVITE' },
      data: { status: 'VUE' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/vendor/requests error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
