import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trade, companyName, profileType } = body;
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const phone = String(body.phone ?? '').trim() || null;
    const address = String(body.address ?? '').trim() || null;
    const age = body.age === null || body.age === undefined || body.age === '' ? null : Number(body.age);
    const name = String(body.name ?? '').trim() || [firstName, lastName].filter(Boolean).join(' ') || companyName || 'Utilisateur';

    const normalizedProfileType = String(profileType || trade || 'user').toLowerCase();
    const normalizedTrade = String(trade || '').trim();

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        email,
        password: hashedPassword,
        trade: normalizedTrade || null,
        companyName: companyName || null,
        phone,
        address,
        age,
        role: ['artisan', 'vendeur', 'promoteur'].includes(normalizedProfileType)
          ? normalizedProfileType
          : 'user',
      },
    });

    return NextResponse.json(
      { message: 'Utilisateur créé avec succès', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}