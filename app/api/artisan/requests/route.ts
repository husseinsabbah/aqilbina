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

    if (!professional || (professional.role !== 'artisan' && professional.trade !== 'artisan')) {
      return NextResponse.json({ error: 'Accès réservé aux artisans.' }, { status: 403 });
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

    // Marquer les nouvelles demandes comme vues dès que l'artisan consulte la liste
    await prisma.projectRecipient.updateMany({
      where: { professionalId, status: 'INVITE' },
      data: { status: 'VUE' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/artisan/requests error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}