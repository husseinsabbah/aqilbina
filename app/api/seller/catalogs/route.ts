import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET : récupérer tous les catalogues du vendeur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const catalogs = await prisma.catalog.findMany({
      where: { userId: session.user.id },
      include: {
        products: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Ajouter le nombre de produits
    const catalogsWithCount = catalogs.map(cat => ({
      ...cat,
      productCount: cat.products.length,
      products: undefined,
    }));

    return NextResponse.json(catalogsWithCount);
  } catch (error) {
    console.error("GET /api/seller/catalogs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : créer un nouveau catalogue
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedName) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const finalName = normalizedName;

    const existing = await prisma.catalog.findFirst({
      where: {
        userId: session.user.id,
        name: finalName,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un catalogue avec ce nom existe déjà" },
        { status: 400 }
      );
    }

    const catalog = await prisma.catalog.create({
      data: {
        userId: session.user.id,
        name: finalName,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(catalog, { status: 201 });
  } catch (error) {
    console.error("POST /api/seller/catalogs error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}