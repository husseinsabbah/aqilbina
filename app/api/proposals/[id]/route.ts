import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';
import { prisma } from '@/lib/prisma';

// ============================================================
// PUT : Accepter ou refuser une proposition
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['ACCEPTE', 'REFUSE'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide. Utilisez ACCEPTE ou REFUSE.' },
        { status: 400 }
      );
    }

    const proposal = await prisma.vendorProposal.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!proposal) {
      return NextResponse.json({ error: 'Proposition introuvable' }, { status: 404 });
    }
    if (proposal.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const updated = await prisma.vendorProposal.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/proposals/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}