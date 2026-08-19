// app/api/projects/[id]/proposals/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/role-access';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: projectId } = await params;

    // Vérifier que le projet appartient à l'artisan
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const proposals = await prisma.vendorProposal.findMany({
      where: { projectId },
      include: {
        product: { select: { name: true, salePrice: true } },
        user: { select: { name: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('GET /api/projects/[id]/proposals error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}