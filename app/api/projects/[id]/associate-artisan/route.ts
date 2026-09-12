import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const normalizeProfileValue = (value?: string | null) =>
  String(value ?? '').trim().toLowerCase();

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
      return NextResponse.json({ error: 'Vous n’êtes pas propriétaire de ce projet.' }, { status: 403 });
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

    const artisanRole = normalizeProfileValue(artisan.role || artisan.trade);
    if (artisanRole !== 'artisan') {
      return NextResponse.json({ error: 'Cet utilisateur n’est pas un artisan.' }, { status: 400 });
    }

    const normalizedTrade = normalizeProfileValue(artisan.trade) || 'artisan';
    const nextMetadata = typeof project.metadata === 'object' && project.metadata !== null
      ? { ...(project.metadata as Record<string, unknown>) }
      : {};

    const recipient = await prisma.projectRecipient.upsert({
      where: {
        projectId_professionalId: {
          projectId: id,
          professionalId: artisanId,
        },
      },
      update: {
        trade: normalizedTrade,
        status: 'INVITE',
        message: message || 'Association artisan au projet.',
      },
      create: {
        projectId: id,
        professionalId: artisanId,
        trade: normalizedTrade,
        status: 'INVITE',
        message: message || 'Association artisan au projet.',
      },
    });

    await prisma.project.update({
      where: { id },
      data: {
        metadata: {
          ...nextMetadata,
          associatedArtisanId: artisanId,
          associatedArtisanName: artisan.name,
          associatedArtisanTrade: normalizedTrade,
          associatedArtisanAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      projectId: id,
      artisanId: artisan.id,
      recipientId: recipient.id,
      status: recipient.status,
    });
  } catch (error) {
    console.error('POST /api/projects/[id]/associate-artisan error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
