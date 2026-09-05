import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = (body.action || body.status || 'REJECTED').toString().toUpperCase();
    const reason = (body.reason || 'AUTRE').toString();
    const details = (body.details || '').toString().trim();
    const clientName = (body.clientName || 'Client').toString();
    const depositAmount = body.depositAmount !== undefined ? Number(body.depositAmount) : null;
    const depositPercent = body.depositPercent !== undefined ? Number(body.depositPercent) : null;
    const depositProofUrl = (body.depositProofUrl || '').toString().trim();

    const isTerminated = ['TERMINE', 'TERMINATED', 'FINALISE', 'FINALIZED'].includes(action);

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const isAccepted = action === 'ACCEPTED' || action === 'ACCEPT';
    const isDiscountRequest = action === 'REQUEST_DISCOUNT';

    const nextStatus = isTerminated
      ? 'TERMINE'
      : isAccepted
        ? 'ACCEPTE'
        : isDiscountRequest
          ? 'NEGOCIATION'
          : 'REFUSE';

    const nextDepositPercent = depositPercent ?? (project.depositPercent ?? null);
    const nextDepositAmount = depositAmount ?? (project.depositAmount ?? null);
    const nextDepositProofUrl = depositProofUrl || project.depositProofUrl || null;

    await prisma.project.update({
      where: { id },
      data: {
        status: nextStatus,
        clientFeedbackStatus: isAccepted ? 'ACCEPTED' : isDiscountRequest ? 'REQUEST_DISCOUNT' : 'REJECTED',
        clientFeedbackMessage: isAccepted
          ? (details || `Devis accepté par ${clientName}`)
          : isDiscountRequest
            ? (details || `Demande de remise envoyée par ${clientName}`)
            : (details || `Refus du devis par ${clientName}`),
        clientRejectReason: isAccepted || isDiscountRequest ? null : reason,
        clientRejectDetails: isAccepted || isDiscountRequest ? null : details,
        depositAmount: isAccepted ? (nextDepositAmount ?? project.depositAmount) : project.depositAmount,
        depositPercent: isAccepted ? (nextDepositPercent ?? project.depositPercent) : project.depositPercent,
        depositProofUrl: isAccepted ? nextDepositProofUrl : project.depositProofUrl,
        depositValidated: isAccepted
          ? Boolean(project.depositValidated || (nextDepositPercent !== null && nextDepositPercent >= 25) || (nextDepositAmount !== null && project.clientBudgetMax !== null && project.clientBudgetMax > 0 && (nextDepositAmount / project.clientBudgetMax) * 100 >= 25))
          : project.depositValidated,
      },
    });

    const summary = `Client: ${clientName}\nAction: ${action}\nRaison: ${reason}\nDétails: ${details || 'Aucun détail'}`;

    console.log('[CLIENT_FEEDBACK]', summary);

    return NextResponse.json({
      ok: true,
      action,
      reason,
      details,
      message: isAccepted ? 'Acceptation enregistrée' : 'Refus enregistré',
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/client-feedback error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
