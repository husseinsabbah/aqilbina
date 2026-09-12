import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageCatalog, hasCatalogManagementRole, validateCatalogProductCompatibility } from '@/lib/role-access';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasCatalogManagementRole(session)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/seller/products error:', error);
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
    const {
      name,
      description,
      category,
      brand,
      purchasePrice,
      salePrice,
      stock,
      tvaRate,
      imageUrl,
      catalogId,
    } = body;

    if (!name || !category || !catalogId) {
      return NextResponse.json({ error: 'Nom, catégorie et catalogue requis' }, { status: 400 });
    }

    const catalog = await prisma.catalog.findUnique({
      where: { id: catalogId },
    });

    if (!catalog || !canManageCatalog(session, catalog.userId)) {
      return NextResponse.json({ error: 'Catalogue introuvable' }, { status: 404 });
    }

    const compatibility = validateCatalogProductCompatibility(catalog.name, String(category));
    if (!compatibility.ok) {
      return NextResponse.json({ error: compatibility.message || 'Produit incompatible avec ce catalogue' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        userId: session.user.id,
        catalogId,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category: String(category).trim(),
        brand: brand ? String(brand).trim() : null,
        purchasePrice: Number(purchasePrice ?? 0),
        salePrice: Number(salePrice ?? 0),
        stock: Number(stock ?? 0),
        tvaRate: Number(tvaRate ?? 20),
        imageUrl: imageUrl ? String(imageUrl) : null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/seller/products error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}