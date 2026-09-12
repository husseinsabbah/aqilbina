import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActorTaxonomy, getProfessionalFamilyByRole, getProfessionalFamilyLabel } from "@/lib/trade-rules";

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

    const enrichedProfessionals = professionals.map((professional) => {
      const family = getProfessionalFamilyByRole(professional.role, professional.trade);
      const taxonomy = getActorTaxonomy(professional.role, professional.trade);
      return {
        ...professional,
        family,
        familyLabel: getProfessionalFamilyLabel(family),
        taxonomy,
      };
    });

    return NextResponse.json(enrichedProfessionals);
  } catch (error) {
    console.error("Erreur recherche:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}