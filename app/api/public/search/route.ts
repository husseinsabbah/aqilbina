import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const q = searchParams.get("q") || "";

    // Construction du filtre avec le bon typage
    const where: Prisma.UserWhereInput = {
      role: { in: ["artisan", "vendeur", "promoteur"] },
    };

    // Filtrer par rôle (si spécifié)
    if (role && role !== "all") {
      where.role = role;
    }

    // Recherche textuelle (nom, companyName, city, trade)
    if (q) {
      const searchTerm = q.trim();
      where.OR = [
        { name: { contains: searchTerm } },
        { companyName: { contains: searchTerm } },
        { city: { contains: searchTerm } },
        { trade: { contains: searchTerm } },
      ];
    }

    const professionals = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        companyName: true,
        city: true,
        trade: true,
        role: true,
        certificationScore: true,
      },
      take: 50,
      orderBy: [{ certificationScore: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(professionals);
  } catch (error) {
    console.error("Erreur recherche:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}