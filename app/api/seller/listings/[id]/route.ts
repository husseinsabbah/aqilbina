import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.sellerListing.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

    if (isActive === undefined && body.action !== 'cancel') {
      return NextResponse.json({ error: 'Aucune action valide fournie' }, { status: 400 });
    }

    const updated = await prisma.sellerListing.update({
      where: { id },
      data: {
        isActive: body.action === 'cancel' ? false : isActive,
      },
      include: { product: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/seller/listings/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.sellerListing.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await prisma.sellerListing.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/seller/listings/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
