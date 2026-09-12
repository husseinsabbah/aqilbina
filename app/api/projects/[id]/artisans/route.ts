import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const normalizeText = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getProjectTrades = (project: { metadata?: any } | null) => {
  const metadata = project?.metadata ?? {};
  const raw = [
    ...(Array.isArray(metadata.selectedTrades) ? metadata.selectedTrades : []),
    ...(Array.isArray(metadata.tradeValues) ? metadata.tradeValues : []),
    ...(Array.isArray(metadata.selectedTradeLabels) ? metadata.selectedTradeLabels : []),
    ...(Array.isArray(metadata.tradeLabels) ? metadata.tradeLabels : []),
  ];

  return raw
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .map((item) => normalizeText(item));
};

const tradeMatchesProject = (projectTrades: string[], artisanTrade?: string | null) => {
  if (!projectTrades.length) return true;
  const normalizedArtisanTrade = normalizeText(artisanTrade);
  if (!normalizedArtisanTrade) return false;

  return projectTrades.some((trade) => {
    if (trade === normalizedArtisanTrade) return true;
    return trade.includes(normalizedArtisanTrade) || normalizedArtisanTrade.includes(trade);
  });
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { id } = await params;
    const url = new URL(request.url);
    const search = (url.searchParams.get('q') || '').trim();

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        metadata: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Vous n’êtes pas propriétaire du projet.' }, { status: 403 });
    }

    const projectTrades = getProjectTrades(project);

    const professionals = await prisma.user.findMany({
      where: {
        OR: [{ role: 'artisan' }, { trade: 'artisan' }],
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { companyName: { contains: search } },
                { city: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        trade: true,
        certificationAnswers: true,
        certificationLabel: true,
        certificationScore: true,
      },
      orderBy: { companyName: 'asc' },
    });

    const safeProfessionals = professionals
      .filter((professional) => tradeMatchesProject(projectTrades, professional.trade))
      .map((professional) => ({
        id: professional.id,
        name: professional.name,
        companyName: professional.companyName,
        city: professional.city,
        trade: professional.trade,
        certificationLabel: professional.certificationLabel,
        certificationScore: professional.certificationScore,
      }));

    return NextResponse.json({ artisans: safeProfessionals });
  } catch (error) {
    console.error('GET /api/projects/[id]/artisans error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const artisanId = String(body?.artisanId ?? '').trim();
    const message = String(body?.message ?? '').trim();

    if (!artisanId) {
      return NextResponse.json({ error: 'Identifiant artisan requis.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        metadata: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Vous n’êtes pas propriétaire du projet.' }, { status: 403 });
    }

    const artisan = await prisma.user.findUnique({
      where: { id: artisanId },
      select: {
        id: true,
        name: true,
        role: true,
        trade: true,
      },
    });

    if (!artisan) {
      return NextResponse.json({ error: 'Artisan introuvable.' }, { status: 404 });
    }

    const role = String(artisan.role ?? artisan.trade ?? '').trim().toLowerCase();
    if (role !== 'artisan' && String(artisan.trade ?? '').trim().toLowerCase() !== 'artisan') {
      return NextResponse.json({ error: 'Cet utilisateur n’est pas un artisan.' }, { status: 400 });
    }

    const projectTrades = getProjectTrades(project);
    const artisanTrade = String(artisan.trade ?? '').trim();
    if (!tradeMatchesProject(projectTrades, artisanTrade)) {
      return NextResponse.json({ error: 'Cet artisan ne correspond pas au métier demandé.' }, { status: 400 });
    }

    const recipient = await prisma.projectRecipient.upsert({
      where: {
        projectId_professionalId: {
          projectId: id,
          professionalId: artisanId,
        },
      },
      update: {
        trade: artisanTrade || 'artisan',
        status: 'INVITE',
        message: message || 'Invitation envoyée au professionnel.',
      },
      create: {
        projectId: id,
        professionalId: artisanId,
        trade: artisanTrade || 'artisan',
        status: 'INVITE',
        message: message || 'Invitation envoyée au professionnel.',
      },
    });

    return NextResponse.json({
      ok: true,
      recipientId: recipient.id,
      status: recipient.status,
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/artisans error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? '').trim().toLowerCase();
    const message = String(body?.message ?? '').trim();

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide. Utilisez accept ou reject.' }, { status: 400 });
    }

    const recipient = await prisma.projectRecipient.findUnique({
      where: {
        projectId_professionalId: {
          projectId: id,
          professionalId: session.user.id,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Aucune invitation de projet trouvée pour ce compte.' }, { status: 404 });
    }

    const nextStatus = action === 'accept' ? 'CANDIDAT' : 'REFUSE';
    const updatedRecipient = await prisma.projectRecipient.update({
      where: { id: recipient.id },
      data: {
        status: nextStatus,
        message: message || (action === 'accept'
          ? 'J’accepte l’invitation et je suis prêt à proposer une solution.'
          : 'Je refuse cette demande pour le moment.'),
      },
    });

    if (action === 'accept') {
      await prisma.project.update({
        where: { id },
        data: {
          status: 'NEGOCIATION',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      projectId: id,
      recipientId: updatedRecipient.id,
      status: updatedRecipient.status,
    });
  } catch (error) {
    console.error('PATCH /api/projects/[id]/artisans error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
