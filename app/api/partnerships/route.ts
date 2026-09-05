import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PARTNER_ROLES = ['artisan', 'vendeur', 'promoteur'];

const normalizeRole = (value?: string | null) => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (PARTNER_ROLES.includes(normalized)) return normalized;
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const role = normalizeRole(request.nextUrl.searchParams.get('role'));

    const partnerships = await prisma.partnership.findMany({
      where: {
        OR: [
          { initiatorId: session.user.id },
          { targetUserId: session.user.id },
        ],
      },
      include: {
        initiator: {
          select: { id: true, name: true, email: true, role: true, trade: true, companyName: true, city: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, role: true, trade: true, companyName: true, city: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!role) {
      return NextResponse.json({ partnerships });
    }

    const candidates = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        OR: [
          { role: role },
          { trade: role },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trade: true,
        companyName: true,
        city: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ partnerships, candidates });
  } catch (error) {
    console.error('GET /api/partnerships error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const targetUserId = String(body?.targetUserId ?? '').trim();
    const targetRole = normalizeRole(body?.targetRole ?? '');

    if (!targetUserId || !targetRole) {
      return NextResponse.json({ error: 'Profil cible et rôle requis' }, { status: 400 });
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous associer à vous-même' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, trade: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Utilisateur cible introuvable' }, { status: 404 });
    }

    const matchesRole = [targetUser.role, targetUser.trade].some((value) => normalizeRole(value) === targetRole);
    if (!matchesRole) {
      return NextResponse.json({ error: 'Cette personne ne correspond pas au profil recherché' }, { status: 400 });
    }

    const existing = await prisma.partnership.findFirst({
      where: {
        OR: [
          {
            initiatorId: session.user.id,
            targetUserId,
          },
          {
            initiatorId: targetUserId,
            targetUserId: session.user.id,
          },
        ],
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Une demande ou un partenariat existe déjà avec ce profil' }, { status: 409 });
    }

    const partnership = await prisma.partnership.create({
      data: {
        initiatorId: session.user.id,
        targetUserId,
        targetRole,
        status: 'PENDING',
        evaluationStatus: 'PENDING',
      },
      include: {
        initiator: { select: { id: true, name: true, email: true, role: true, trade: true, companyName: true } },
        targetUser: { select: { id: true, name: true, email: true, role: true, trade: true, companyName: true } },
      },
    });

    return NextResponse.json({ partnership }, { status: 201 });
  } catch (error) {
    console.error('POST /api/partnerships error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const partnershipId = String(body?.partnershipId ?? '').trim();
    const action = String(body?.action ?? '').trim().toLowerCase();
    const reasons = Array.isArray(body?.reasons) ? body.reasons.map((item) => String(item).trim()).filter(Boolean) : [];
    const details = String(body?.details ?? '').trim();
    const decision = String(body?.decision ?? '').trim().toLowerCase();

    if (!partnershipId || !['cancel', 'respond'].includes(action)) {
      return NextResponse.json({ error: 'Partenariat et action requis' }, { status: 400 });
    }

    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId },
      include: {
        initiator: true,
        targetUser: true,
      },
    });

    if (!partnership) {
      return NextResponse.json({ error: 'Partenariat introuvable' }, { status: 404 });
    }

    const isParticipant = [partnership.initiatorId, partnership.targetUserId].includes(session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Vous n’êtes pas participant à ce partenariat' }, { status: 403 });
    }

    if (action === 'respond') {
      if (!['accept', 'reject'].includes(decision)) {
        return NextResponse.json({ error: 'Décision invalide' }, { status: 400 });
      }

      if (partnership.targetUserId !== session.user.id) {
        return NextResponse.json({ error: 'Seul le profil destinataire peut accepter ou refuser la demande' }, { status: 403 });
      }

      const updated = await prisma.partnership.update({
        where: { id: partnershipId },
        data: {
          status: decision === 'accept' ? 'ACTIVE' : 'REJECTED',
          evaluationStatus: decision === 'accept' ? 'VALIDATED' : 'REJECTED',
          notes: decision === 'accept'
            ? `Demande acceptée par ${partnership.targetUser.name || partnership.targetUser.email}`
            : `Demande refusée par ${partnership.targetUser.name || partnership.targetUser.email}`,
        },
      });

      return NextResponse.json({ partnership: updated });
    }

    const updated = await prisma.partnership.update({
      where: { id: partnershipId },
      data: {
        status: 'CANCELLED',
        evaluationStatus: 'PENDING',
        cancellationReasons: reasons.join(', '),
        cancellationDetails: details || null,
      },
    });

    return NextResponse.json({ partnership: updated });
  } catch (error) {
    console.error('PATCH /api/partnerships error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
