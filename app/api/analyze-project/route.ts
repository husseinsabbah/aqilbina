// app/api/analyze-project/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

type ProjectMetadata = {
  pieces?: Array<{
    type?: string | null;
    solSurface?: number | null;
    murSurface?: number | null;
    hauteur?: number | null;
    equipements?: string[] | null;
  }>;
  chantiers?: string[] | null;
  selectedTrades?: string[] | null;
  files?: string[] | null;
};

const prisma = new PrismaClient();

async function callOllama(prompt: string, model: string = "mistral:7b-instruct-q4_K_M") {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
    }),
  });
  if (!response.ok) {
    throw new Error(`Erreur Ollama (${response.status}): ${response.statusText}`);
  }
  const data = await response.json();
  return data.response;
}

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId requis" }, { status: 400 });
    }

    // Récupérer le projet avec toutes ses métadonnées
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true,
        recipients: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const metadata = (project.metadata as ProjectMetadata | null) ?? {};
    const pieces = metadata.pieces ?? [];
    const chantiers = metadata.chantiers ?? [];
    const selectedTrades = metadata.selectedTrades ?? [];
    const description = project.description || "";
    const surface = project.surface || 0;
    const budgetEstimate = project.budgetEstimate || 0;
    const clientName = project.clientName || "Client";
    const projectName = project.name;
    const files = metadata.files ?? [];

    // Construction du prompt
    const tradesStr = selectedTrades.length > 0 ? selectedTrades.join(", ") : "général (tous métiers)";
    const piecesStr = pieces.length > 0
      ? pieces.map((piece) => {
          const equip = piece.equipements?.length ? `, équipements : ${piece.equipements.join(", ")}` : "";
          return `- ${piece.type ?? "Pièce"} : sol ${piece.solSurface || 0} m², murs ${piece.murSurface || 0} m², hauteur ${piece.hauteur || 0} m${equip}`;
        }).join("\n")
      : "Aucune pièce détaillée.";

    const chantiersStr = chantiers.length > 0 ? chantiers.join(", ") : "Aucun";

    const prompt = `
Tu es un expert en travaux de bâtiment, spécialisé dans les métiers suivants : ${tradesStr}.
Analyse la demande de devis ci-dessous et propose une estimation détaillée, concrète et professionnelle.

Projet : ${projectName}
Client : ${clientName}
Description : ${description}
Surface totale estimée : ${surface} m²
Budget approximatif du client : ${budgetEstimate} €
Pièces concernées :
${piecesStr}
Types de chantiers : ${chantiersStr}
Fichiers joints (images/vidéos) : ${files.length > 0 ? files.join(", ") : "Aucun"}

Règles :
- Propose des produits concrets (nom, quantité, unité, prix unitaire, total) adaptés aux métiers sélectionnés.
- Si plusieurs métiers sont demandés, répartis les produits par métier.
- Inclus les éventuels travaux préparatoires (ex: démolition, réparation, étanchéité).
- Donne des prix réalistes pour le marché français (hors TVA).
- Indique les éventuelles dégradations ou précautions à prendre (ex: fissures, humidité, accès).

Réponds en JSON STRICT avec les champs suivants :
- surface: nombre (surface totale en m²)
- pieces: tableau d'objets { type: string, sol: number, mur: number, hauteur: number, equipements: string[] }
- degradations: liste de chaînes (dégâts ou contraintes détectées)
- produits: tableau d'objets { nom: string, quantite: number, unite: string, prixUnitaire: number, total: number, trade?: string (optionnel) }
- estimationTotale: number (somme des totaux)
- remarques: texte (conseils techniques, points d'attention)
`;

    const rawResponse = await callOllama(prompt);
    let analysis: unknown;
    try {
      analysis = JSON.parse(rawResponse);
    } catch {
      console.error("❌ Erreur parsing JSON:", rawResponse);
      throw new Error("La réponse de l'IA n'est pas un JSON valide.");
    }

    // Sauvegarder l'analyse dans AiRecommendation (optionnel)
    await prisma.aiRecommendation.create({
      data: {
        projectId: project.id,
        agentId: "system", // ou un agent spécifique
        createdByUserId: project.userId,
        category: "analyse-projet",
        content: JSON.stringify(analysis),
        status: "APPROVED",
      },
    });

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("❌ Erreur analyse projet:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}