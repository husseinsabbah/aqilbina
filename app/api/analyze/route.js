// app/api/analyze/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import os from "os";

const prisma = new PrismaClient();
const execPromise = util.promisify(exec);

async function callOllama(prompt, model = "mistral:7b-instruct-q4_K_M") {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
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

function normalizeTradeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildTradeGuidance(selectedTrades) {
  const normalized = selectedTrades
    .map((trade) => normalizeTradeName(trade))
    .filter(Boolean);

  const tradeRules = {
    carrelage: {
      allowed: [
        "carrelage", "colle a carrelage", "joint de carrelage", "sous-couche", "profilé de finition", "accessoire de pose", "ragréage", "découpe"
      ],
      reminder: "Pour le carrelage, propose seulement des éléments utiles au sol/mur, au collage, au jointoiement, au ragréage, à la finition et aux accessoires de pose."
    },
    electricite: {
      allowed: [
        "câble électrique", "gaines", "boite electrique", "prise", "interrupteur", "spot", "goulotte", "rail led", "tableau électrique", "luminaires", "dérivation"
      ],
      reminder: "Pour l'électricité, propose seulement des éléments de câblage, de distribution, d'éclairage, de sécurité et de raccordement."
    },
    plomberie: {
      allowed: [
        "tuyau", "robinet", "sanitaire", "canalisation", "colonne", "douche", "lavabo", "wc", "réseau plomberie"
      ],
      reminder: "Pour la plomberie, propose seulement les matériaux et prestations nécessaires au réseau, aux raccords et au sanitaire."
    },
    peinture: {
      allowed: [
        "peinture", "enduit", "primer", "apprêt", "joint de placo", "accessoire peinture"
      ],
      reminder: "Pour la peinture, propose seulement les matériaux de préparation, d'apprêt et de finition de surface."
    },
    menuiserie: {
      allowed: [
        "porte", "fenêtre", "placard", "bois", "menuiserie", "accessoire menuiserie"
      ],
      reminder: "Pour la menuiserie, propose uniquement les éléments utiles à la fabrication, à la pose et aux finitions de menuiseries."
    }
  };

  if (!normalized.length) {
    return "Aucun métier n'est sélectionné. Tu dois rester générique, mais éviter les métiers absents et rester prudent sur les propositions.";
  }

  const rules = normalized
    .map((trade) => tradeRules[trade] || null)
    .filter(Boolean)
    .map((rule) => rule.reminder)
    .join(" ");

  return rules;
}

function buildUserProfileContext(user) {
  const role = user?.role || user?.trade || "non précisé";
  const trade = user?.trade || "non précisé";
  const catalogNames = Array.isArray(user?.catalogs)
    ? user.catalogs.map((catalog) => catalog?.name || "catalogue").filter(Boolean)
    : [];
  const catalogCategories = Array.isArray(user?.catalogs)
    ? user.catalogs.flatMap((catalog) => Array.isArray(catalog?.products) ? catalog.products.map((product) => product?.category || "") : []).filter(Boolean)
    : [];
  const serviceNames = Array.isArray(user?.services)
    ? user.services.map((service) => service?.name || "service").filter(Boolean)
    : [];

  return {
    role,
    trade,
    catalogNames,
    catalogCategories,
    serviceNames,
  };
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let file = null;
    let projectId = null;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      projectId = body.projectId || null;
      file = body.file || null;
    } else {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        file = formData.get("file") || null;
        projectId = formData.get("projectId") || null;
      }
    }

    if (!file && !projectId) {
      return NextResponse.json({ error: "Aucun fichier ni projet fourni" }, { status: 400 });
    }

    let extractedText = "";
    let tempFilePath = null;

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(file.name);
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `upload-${Date.now()}${ext}`);
      fs.writeFileSync(tempFilePath, buffer);

      console.log("🔍 OCR du document...");
      const { stdout: extractedTextResult, stderr: ocrError } = await execPromise(
        `py scripts/ocr.py "${tempFilePath}"`
      );
      if (ocrError) console.warn("⚠️ Erreur OCR (non bloquante):", ocrError);
      extractedText = extractedTextResult;
    }

    let project;
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          user: {
            include: {
              catalogs: {
                include: {
                  products: true,
                },
              },
              services: true,
            },
          },
          recipients: true,
        },
      });
      if (!project) throw new Error("Projet introuvable");
    }

    if (!file && project) {
      const metadata = project.metadata || {};
      const description = project.description || "";
      const surface = project.surface || metadata.surface || 0;
      const budgetEstimate = project.budgetEstimate || 0;
      const projectName = project.name || "Projet";
      const clientName = project.clientName || "Client";
      const selectedTrades = Array.isArray(metadata.selectedTrades) ? metadata.selectedTrades : [];
      const pieces = Array.isArray(metadata.pieces) ? metadata.pieces : [];
      extractedText = [
        `Projet: ${projectName}`,
        `Client: ${clientName}`,
        `Description: ${description}`,
        `Surface: ${surface} m²`,
        `Budget: ${budgetEstimate} €`,
        `Métiers sélectionnés: ${selectedTrades.length ? selectedTrades.join(", ") : "non précisé"}`,
        `Pièces: ${pieces.length ? pieces.map((piece) => `${piece.type || "Pièce"} ${piece.solSurface || 0}m² / ${piece.murSurface || 0}m²`).join(" | ") : "non détaillé"}`,
      ].join("\n");
    }

    if (!file && !project) {
      throw new Error("Aucun contenu exploitable pour l'analyse");
    }

    if (tempFilePath) {
      fs.unlinkSync(tempFilePath);
    }

    const selectedTrades = Array.isArray(project?.metadata?.selectedTrades)
      ? project.metadata.selectedTrades
          .map((trade) => String(trade).trim())
          .filter(Boolean)
      : [];
    const selectedTradesText = selectedTrades.length > 0 ? selectedTrades.join(", ") : "non précisé";
    const projectType = String(project?.type || project?.metadata?.workType || "non précisé");
    const buildingType = String(project?.metadata?.batiment || "non précisé");
    const surface = Number(project?.surface || 0);
    const budget = Number(project?.budgetEstimate || 0);
    const piecesText = Array.isArray(project?.metadata?.pieces) && project.metadata.pieces.length > 0
      ? project.metadata.pieces
          .map((piece) => `${piece.type || "Pièce"} : ${piece.solSurface || 0} m² sol / ${piece.murSurface || 0} m² mur / ${piece.hauteur || 0} m hauteur`)
          .join(" | ")
      : "non détaillé";

    const structuredPrompt = `
Tu es un assistant expert en estimation de devis de bâtiment et de rénovation. Ton objectif est de produire un devis professionnel, lisible et exploitable pour un artisan, un vendeur ou un promoteur, sans afficher de code ni de JSON en brut dans la réponse finale.

Contexte du projet :
- Nom du projet : ${project?.name || "Projet"}
- Type de projet : ${projectType}
- Type de bâtiment : ${buildingType}
- Surface totale : ${surface} m²
- Pièces concernées : ${piecesText}
- Budget estimé : ${budget} €
- Métiers sélectionnés : ${selectedTradesText}
- Description cliente : ${project?.description || "Aucune description détaillée"}

Rôle et priorité :
- Tu dois analyser le chantier comme un expert métier.
- Tu dois respecter strictement les métiers sélectionnés par le client.
- Tu dois tenir compte du type de projet (neuf, rénovation, extension, aménagement, dépannage), du type de chantier, de la surface, des pièces, de la structure et du budget.
- Tu dois proposer un devis clair, exploitable et professionnel, prêt à être relu et modifié manuellement par un artisan, un vendeur ou un promoteur.

Règles absolues :
1. N'invente aucun métier non sélectionné par le client.
2. Si le client a choisi "carrelage" et "electricite", propose seulement des lignes liées à ces deux métiers.
3. Exclue toute plomberie, peinture, menuiserie, préparation ou finition non demandée, sauf si elle est strictement nécessaire à la réalisation du chantier.
4. Si le chantier est en rénovation, prends en compte la dépose, le ragréage, les joints de dilatation, la préparation du support et les contraintes d'ancien bâti.
5. Si le chantier est en neuf, prends en compte les préparations, la mise à niveau, le calepinage, les sous-couches, les accessoires de pose, le câblage et les raccordements nécessaires.
6. Respecte les données métier suivantes :
   - Carrelage : carreaux, colle, joints, sous-couche, profilés, accessoires de pose, protection, découpes.
   - Électricité : câbles, gaines, boîtes, prises, interrupteurs, spots, tableau, goulottes, rails, luminaires, dérivation.
7. Pour chaque ligne, donne : nom, metier, quantite, unite, prixUnitaire, total, justification, imageUrl.
8. Les prix unitaire et total doivent être des nombres en euros, sans texte.
9. total = quantite × prixUnitaire.
10. estimationTotale = somme de tous les totals.
11. Les quantités doivent être réalistes et proportionnées à la surface et au type de chantier.
12. Si une information manque, fais une estimation prudente et précise, et précise le niveau de certitude dans la justification.
13. Le devis final doit être lisible par un professionnel lambda, pas seulement par un développeur.

Format de sortie JSON strict attendu :
{
  "produits": [
    {
      "nom": "Nom du produit ou prestation",
      "metier": "carrelage",
      "quantite": 12,
      "unite": "m²",
      "prixUnitaire": 33,
      "total": 396,
      "justification": "Explication courte et concrète",
      "imageUrl": null
    }
  ],
  "estimationTotale": 1200,
  "conclusion": "Texte court, commercial et lisible pour un artisan ou un client"
}

Règles de sortie :
- 3 à 8 lignes maximum, seules celles pertinentes pour les métiers sélectionnés.
- Organise le devis par métier.
- ajoute des lignes d’accessoires obligatoires si nécessaires.
- imageUrl doit être null si aucune image n’est disponible.
- Réponds uniquement avec un JSON valide, sans markdown, sans commentaires, sans texte supplémentaire.
`;

    const responseText = await callOllama(structuredPrompt, "mistral:7b-instruct-q4_K_M");
    let parsedResult = { produits: [], conclusion: "" };

    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedResult = JSON.parse(match[0]);
        } catch {
          parsedResult = { produits: [], conclusion: responseText };
        }
      } else {
        parsedResult = { produits: [], conclusion: responseText };
      }
    }

    if (!projectId && !project) {
      const user = await prisma.user.findUnique({
        where: { email: "artisan@test.com" },
      });
      if (!user) throw new Error("Utilisateur test (artisan@test.com) non trouvé. Lance d'abord le seed.");
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: `Projet ${new Date().toLocaleDateString()}`,
          type: "carrelage",
          surface: Number(extractedText.match(/Surface:\s*(\d+(?:[.,]\d+)?)/)?.[1]?.replace(",", ".")) || 0,
          status: "BROUILLON",
        },
      });
    }

    const agent = await prisma.agent.findFirst({
      where: { type: "ia", isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (agent && project) {
      await prisma.aiRecommendation.create({
        data: {
          projectId: project.id,
          agentId: agent.id,
          createdByUserId: project.userId,
          category: "devis",
          content: JSON.stringify(parsedResult),
          status: "APPROVED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      projectId: project?.id || projectId,
      devis: JSON.stringify(parsedResult),
      analysisResult: JSON.stringify(parsedResult),
      details: parsedResult,
    });
  } catch (error) {
    console.error("❌ Erreur globale:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}