import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET : récupérer les catégories de services distinctes de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les catégories de services distinctes de l'utilisateur
    const services = await prisma.service.findMany({
      where: { userId: session.user.id },
      select: { serviceCategory: true },
      distinct: ['serviceCategory'],
    });

    // Transformer en format { id, label }
    const categories = services
      .filter(s => s.serviceCategory)
      .map(s => ({
        id: s.serviceCategory,
        label: s.serviceCategory,
      }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/user/service-types error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}