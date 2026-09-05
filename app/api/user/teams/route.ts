import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id, isActive: true } } },
        ],
      },
      include: {
        members: {
          where: { isActive: true },
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
        },
        agents: {
          where: { isActive: true },
          include: {
            userAgent: {
              include: {
                agent: {
                  select: { id: true, name: true, type: true, specialty: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('GET /api/user/teams error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const normalizeTeamFamily = (value: string) => {
  const clean = (value ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!clean) return null;
  if (clean.includes('vendeur')) return 'vendeur';
  if (clean.includes('artisan')) return 'artisan';
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const suppliedSpecialty = String(body.specialty || '').trim();
    const family = normalizeTeamFamily(suppliedSpecialty || name) || null;

    if (!name) {
      return NextResponse.json({ error: 'Nom de l\'equipe requis' }, { status: 400 });
    }

    if (family && !['vendeur', 'artisan'].includes(family)) {
      return NextResponse.json({ error: 'Une équipe doit être rattachée à une famille artisan ou vendeur' }, { status: 400 });
    }

    const created = await prisma.team.create({
      data: {
        ownerId: session.user.id,
        name,
        specialty: family || suppliedSpecialty || null,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
            isActive: true,
          },
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/user/teams error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
