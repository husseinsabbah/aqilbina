import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un vendeur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { trade: true },
    });

    if (user?.trade !== 'vendeur') {
      return NextResponse.json({ error: 'Accès réservé aux vendeurs' }, { status: 403 });
    }

    // Récupérer tous les projets avec leurs relations
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['BROUILLON', 'EN_ATTENTE'] },
      },
      include: {
        user: {
          select: {
            name: true,
            companyName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/admin/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}