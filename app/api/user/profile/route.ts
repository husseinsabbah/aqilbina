import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const serializeUserProfile = (user: {
  id: string;
  email: string;
  name: string;
  companyName?: string | null;
  brandColor?: string | null;
  imageUrl?: string | null;
  trade?: string | null;
}) => ({
  ...user,
  logoUrl: user.imageUrl ?? null,
  trade: user.trade ?? null,
});

// ============================================================
// GET : Récupérer le profil
// ============================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        brandColor: true,
        imageUrl: true,
        trade: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json(serializeUserProfile(user));
  } catch (error) {
    console.error('GET /api/user/profile error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// PUT : Mettre à jour le profil
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    console.log('📌 PUT /api/user/profile appelé');

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body reçu :', body);

    const { companyName, brandColor, logoUrl, trade } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!existingUser) {
      console.log('❌ Utilisateur introuvable');
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const updateData: Record<string, string | null> = {};
    if (companyName !== undefined) updateData.companyName = companyName === '' ? null : companyName;
    if (brandColor !== undefined) updateData.brandColor = brandColor === '' ? null : brandColor;
    if (logoUrl !== undefined) updateData.imageUrl = logoUrl === '' ? null : logoUrl;
    if (trade !== undefined) updateData.trade = trade === '' ? null : trade;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        brandColor: true,
        imageUrl: true,
        trade: true,
      },
    });

    console.log('✅ Utilisateur mis à jour :', updatedUser);

    return NextResponse.json(serializeUserProfile(updatedUser));
  } catch (error) {
    console.error('🔥 Erreur PUT /api/user/profile :', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}