import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trade: true,
        companyName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role } = body ?? {};

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Email, nom et mot de passe requis' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role === 'admin' ? 'admin' : 'user',
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: newUser.id,
        action: 'ADMIN_CREATED',
        details: `Compte ${newUser.email} créé avec le rôle ${newUser.role}`,
      },
    });

    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body ?? {};

    if (!userId || !role || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'userId et rôle valides requis' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: updatedUser.id,
        action: 'ROLE_UPDATED',
        details: `Rôle changé en ${updatedUser.role}`,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('PATCH /api/admin/users error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
