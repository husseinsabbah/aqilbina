import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!catalog) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    return NextResponse.json(catalog);
  } catch (error) {
    console.error('GET /api/admin/catalogs/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!catalog) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    await prisma.catalog.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: catalog.userId,
        action: 'CATALOG_DELETED',
        details: `Catalogue ${catalog.name} supprimé`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/catalogs/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
