// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/role-access';

// ========== GET : récupérer un projet avec ses items ==========
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ========== PUT : mettre à jour les notes de paiement (ou autres) ==========
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const auth = requireRole(session, ['artisan'], 'Accès réservé aux artisans');
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const {
      paymentNotes,
      attachmentUrl,
      startDate,
      endDate,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      clientFeedbackStatus,
      clientFeedbackMessage,
      clientRejectReason,
      clientRejectDetails,
      sharePublicUrl,
      projectProgressMedia,
      portfolioMedia,
      clientBudgetMax,
    } = body;

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        paymentNotes: paymentNotes ?? project.paymentNotes,
        attachmentUrl: attachmentUrl ?? project.attachmentUrl,
        startDate: startDate ? new Date(startDate) : project.startDate,
        endDate: endDate ? new Date(endDate) : project.endDate,
        clientName: clientName ?? project.clientName,
        clientPhone: clientPhone ?? project.clientPhone,
        clientEmail: clientEmail ?? project.clientEmail,
        clientAddress: clientAddress ?? project.clientAddress,
        clientFeedbackStatus: clientFeedbackStatus ?? project.clientFeedbackStatus,
        clientFeedbackMessage: clientFeedbackMessage ?? project.clientFeedbackMessage,
        clientRejectReason: clientRejectReason ?? project.clientRejectReason,
        clientRejectDetails: clientRejectDetails ?? project.clientRejectDetails,
        sharePublicUrl: sharePublicUrl ?? project.sharePublicUrl,
        projectProgressMedia: projectProgressMedia ?? project.projectProgressMedia,
        portfolioMedia: portfolioMedia ?? project.portfolioMedia,
        clientBudgetMax: clientBudgetMax !== undefined ? (clientBudgetMax === '' || clientBudgetMax === null ? null : Number(clientBudgetMax)) : project.clientBudgetMax,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('PUT /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}