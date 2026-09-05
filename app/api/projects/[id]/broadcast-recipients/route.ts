import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        recipients: { select: { professionalId: true, trade: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const existingIds = new Set(project.recipients.map((recipient) => recipient.professionalId));
    const referenceTrade = project.recipients.find((recipient) => recipient.trade && recipient.trade !== 'vendeur')?.trade;

    if (!referenceTrade) {
      return NextResponse.json({ error: 'Impossible de déterminer le métier concerné par ce devis.' }, { status: 400 });
    }

    const matchingProfessionals = await prisma.user.findMany({
      where: {
        trade: referenceTrade,
        OR: [{ role: 'artisan' }, { trade: 'artisan' }],
      },
      select: { id: true },
    });

    // On n'invite que les artisans du métier qui n'ont pas déjà reçu ce devis.
    const newRecipients = matchingProfessionals.filter((professional) => !existingIds.has(professional.id));

    if (newRecipients.length > 0) {
      await prisma.projectRecipient.createMany({
        data: newRecipients.map((professional) => ({
          projectId: id,
          professionalId: professional.id,
          trade: referenceTrade,
        })),
      });
    }

    return NextResponse.json({ ok: true, addedCount: newRecipients.length });
  } catch (error) {
    console.error('POST /api/projects/[id]/broadcast-recipients error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
