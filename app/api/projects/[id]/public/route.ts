import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
        recipients: {
          include: {
            professional: {
              select: {
                id: true,
                name: true,
                companyName: true,
                city: true,
                role: true,
                trade: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        },
        vendorProposals: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                salePrice: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const rawDescription = project.description ?? '';
    let parsedDescription = rawDescription;
    try {
      const parsed = JSON.parse(rawDescription);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsedDescription = typeof parsed.description === 'string' ? parsed.description.trim() : '';
      }
    } catch {
      parsedDescription = rawDescription;
    }

    const depositPercent = project.depositPercent ?? (
      project.clientBudgetMax && project.clientBudgetMax > 0 && project.depositAmount
        ? (project.depositAmount / project.clientBudgetMax) * 100
        : null
    );

    const winner = project.recipients.find((recipient) => recipient.status === 'RETENU');

    return NextResponse.json({
      id: project.id,
      name: project.name,
      clientName: project.clientName || 'Non renseigné',
      clientPhone: project.clientPhone,
      clientEmail: project.clientEmail,
      clientAddress: project.clientAddress,
      description: parsedDescription,
      surface: project.surface,
      createdAt: project.createdAt,
      status: project.status,
      budgetEstimate: project.budgetEstimate,
      clientBudgetMax: project.clientBudgetMax,
      depositAmount: project.depositAmount,
      depositPercent,
      depositProofUrl: project.depositProofUrl,
      depositValidated: Boolean(project.depositValidated) || (depositPercent !== null && depositPercent >= 25),
      requiresPin: Boolean(project.projectAccessPinHash),
      metadata: project.metadata || {},
      recipients: project.recipients.map((recipient) => ({
        id: recipient.id,
        professionalId: recipient.professionalId,
        trade: recipient.trade,
        status: recipient.status,
        message: recipient.message,
        createdAt: recipient.createdAt,
        professional: recipient.professional,
      })),
      winner: winner ? {
        id: winner.id,
        professionalId: winner.professionalId,
        trade: winner.trade,
        status: winner.status,
        professional: winner.professional,
      } : null,
      items: project.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPriceHtAtSale: item.unitPriceHtAtSale,
        productName: item.product?.name || item.service?.name || 'Produit demandé',
        product: item.product,
        service: item.service,
      })),
      vendorProposals: project.vendorProposals.map((proposal) => ({
        id: proposal.id,
        userId: proposal.userId,
        quantity: proposal.quantity,
        unitPrice: proposal.unitPrice,
        message: proposal.message,
        status: proposal.status,
        deliveryDate: proposal.deliveryDate,
        createdAt: proposal.createdAt,
        user: proposal.user,
        product: proposal.product,
      })),
    });
  } catch (error) {
    console.error('GET /api/projects/[id]/public error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}