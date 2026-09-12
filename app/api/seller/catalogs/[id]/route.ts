import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { canManageCatalog } from '@/lib/role-access';

// GET : récupérer un catalogue spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const catalog = await prisma.catalog.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!catalog || !canManageCatalog(session, catalog.userId)) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    if (!catalog) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    return NextResponse.json(catalog);
  } catch (error) {
    console.error('GET /api/seller/catalogs/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT : modifier un catalogue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: catalogId } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Vérifier que le catalogue appartient au vendeur
    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
    });

    if (!catalog || !canManageCatalog(session, catalog.userId)) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    if (name && name.trim().length > 0) {
      // Vérifier l'unicité du nom
      const existing = await prisma.catalog.findFirst({
        where: {
          userId: session.user.id,
          name: name.trim(),
          id: { not: catalogId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Un catalogue avec ce nom existe déjà' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.catalog.update({
      where: { id: catalogId },
      data: {
        name: name?.trim() || catalog.name,
        description: description?.trim() || catalog.description,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/seller/catalogs/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE : supprimer un catalogue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: catalogId } = await params;

    // Vérifier que le catalogue appartient au vendeur
    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    if (!catalog || !canManageCatalog(session, catalog.userId)) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    if (catalog.products.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un catalogue qui contient des produits' },
        { status: 400 }
      );
    }

    await prisma.catalog.delete({
      where: { id: catalogId },
    });

    return NextResponse.json({ message: 'Catalogue supprimé' });
  } catch (error) {
    console.error('DELETE /api/seller/catalogs/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}