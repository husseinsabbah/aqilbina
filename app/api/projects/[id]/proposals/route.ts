import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { items, deliveryDays, message } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Devis vide" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est un professionnel
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || (user.role !== "artisan" && user.role !== "vendeur")) {
      return NextResponse.json({ error: "Seuls les professionnels peuvent envoyer un devis." }, { status: 403 });
    }

    // Vérifier que le projet existe
    const project = await prisma.project.findUnique({
      where: { id },
    });
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    // Calculer le total
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Créer la proposition
    const proposal = await prisma.vendorProposal.create({
      data: {
        projectId: id,
        userId: session.user.id,
        productId: "placeholder", // À adapter si vous avez un vrai produit
        quantity: totalQuantity,
        unitPrice: totalPrice,
        message: message || null,
        status: "EN_ATTENTE",
        deliveryDate: deliveryDays ? new Date(Date.now() + deliveryDays * 86400000) : null,
        marketingMessage: message || null,
      },
    });

    // Mettre à jour le statut du projet si nécessaire
    await prisma.project.update({
      where: { id },
      data: { status: "NEGOCIATION" },
    });

    return NextResponse.json({ success: true, proposalId: proposal.id });
  } catch (error) {
    console.error("Erreur envoi devis:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}