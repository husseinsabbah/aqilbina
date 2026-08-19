import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason = (body.reason || 'AUTRE').toString();
    const details = (body.details || '').toString().trim();
    const clientName = (body.clientName || 'Client').toString();

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    await prisma.project.update({
      where: { id },
      data: {
        clientFeedbackStatus: 'REJECTED',
        clientFeedbackMessage: details || `Refus du devis par ${clientName}`,
        clientRejectReason: reason,
        clientRejectDetails: details,
      },
    });

    const summary = `Client: ${clientName}\nRaison: ${reason}\nDétails: ${details || 'Aucun détail'}`;

    console.log('[CLIENT_FEEDBACK]', summary);

    return NextResponse.json({
      ok: true,
      reason,
      details,
      message: 'Refus enregistré',
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/client-feedback error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
