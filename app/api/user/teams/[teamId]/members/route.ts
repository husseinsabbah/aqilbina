import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const memberRoles = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'] as const;

async function assertOwnerOrManager(userId: string, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { userId, isActive: true },
        select: { role: true },
      },
    },
  });

  if (!team) return { ok: false as const, status: 404, error: 'Equipe introuvable' };
  const isOwner = team.ownerId === userId;
  const isManager = team.members.some((member) => ['OWNER', 'MANAGER'].includes(member.role));

  if (!isOwner && !isManager) return { ok: false as const, status: 403, error: 'Acces refuse' };
  return { ok: true as const, ownerId: team.ownerId };
}

async function getMembershipForTeam(teamId: string, membershipId: string) {
  return prisma.teamMember.findUnique({
    where: { id: membershipId },
    include: {
      team: { select: { id: true, ownerId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            trade: true,
            phone: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('GET /api/user/teams/[teamId]/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const explicitUserId = String(body.userId || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const role = String(body.role || 'MEMBER').toUpperCase();

    if (!memberRoles.includes(role as (typeof memberRoles)[number])) {
      return NextResponse.json({ error: 'Role membre invalide' }, { status: 400 });
    }

    let targetUserId = explicitUserId;

    if (!targetUserId) {
      if (!email && !phone) {
        return NextResponse.json({ error: 'userId, email ou phone requis' }, { status: 400 });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
        select: { id: true },
      });

      if (!user) {
        if (!email) {
          return NextResponse.json({ error: 'Un email valide est requis pour créer le compte du membre.' }, { status: 400 });
        }

        const tempPassword = `Aqil-${Math.random().toString(36).slice(2, 10)}!`;
        const generatedName = String(body.name || '').trim() || email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Membre équipe';
        const createdUser = await prisma.user.create({
          data: {
            name: generatedName,
            email,
            password: await bcrypt.hash(tempPassword, 10),
            phone: phone || null,
            role: 'user',
            trade: null,
            companyName: null,
          },
          select: { id: true },
        });

        targetUserId = createdUser.id;
      } else {
        targetUserId = user.id;
      }
    }

    const membership = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      update: { role, isActive: true },
      create: {
        teamId,
        userId: targetUserId,
        role,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            trade: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('POST /api/user/teams/[teamId]/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const membershipId = String(body.membershipId || '').trim();
    const role = body.role ? String(body.role).toUpperCase() : undefined;
    const isActive = body.isActive === undefined ? undefined : Boolean(body.isActive);

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId requis' }, { status: 400 });
    }

    const membership = await getMembershipForTeam(teamId, membershipId);
    if (!membership) {
      return NextResponse.json({ error: 'Membre introuvable pour cette équipe' }, { status: 404 });
    }

    const isOwner = access.ownerId === session.user.id;
    const isTargetOwner = membership.team.ownerId === membership.userId;
    const isSelfTarget = membership.userId === session.user.id;

    if (!isOwner && isTargetOwner) {
      return NextResponse.json({ error: 'Seul le proprietaire peut modifier le proprietaire de l\'equipe' }, { status: 403 });
    }

    if (!isOwner && isSelfTarget) {
      return NextResponse.json({ error: 'Un manager ne peut pas modifier sa propre role ni sa participation' }, { status: 403 });
    }

    if (role && !memberRoles.includes(role as (typeof memberRoles)[number])) {
      return NextResponse.json({ error: 'Role membre invalide' }, { status: 400 });
    }

    if (!isOwner && role === 'OWNER') {
      return NextResponse.json({ error: 'Seul le proprietaire peut attribuer le role OWNER' }, { status: 403 });
    }

    const updated = await prisma.teamMember.update({
      where: { id: membershipId },
      data: {
        ...(role ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, trade: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/user/teams/[teamId]/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { teamId } = await params;
    const access = await assertOwnerOrManager(session.user.id, teamId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => ({}));
    const membershipId = String(body.membershipId || '').trim();

    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId requis' }, { status: 400 });
    }

    const membership = await getMembershipForTeam(teamId, membershipId);
    if (!membership) {
      return NextResponse.json({ error: 'Membre introuvable pour cette équipe' }, { status: 404 });
    }

    const isOwner = access.ownerId === session.user.id;
    const isTargetOwner = membership.team.ownerId === membership.userId;
    const isSelfTarget = membership.userId === session.user.id;

    if (!isOwner && (isTargetOwner || isSelfTarget)) {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer ce membre' }, { status: 403 });
    }

    await prisma.teamMember.delete({ where: { id: membershipId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/user/teams/[teamId]/members error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
