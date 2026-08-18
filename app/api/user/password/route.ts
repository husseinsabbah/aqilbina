import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body ?? {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mot de passe actuel et nouveau requis' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidCurrentPassword) {
      return NextResponse.json({ error: 'Le mot de passe actuel est incorrect' }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/user/password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
