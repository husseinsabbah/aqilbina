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

      console.log("🔍 Lancement de PaddleOCR...");
      const { stdout: extractedTextResult, stderr: ocrError } = await execPromise(
        `py scripts/ocr.py "${tempFilePath}"`
      );
      if (ocrError) console.warn("⚠️ Erreur OCR (non bloquante):", ocrError);
      extractedText = extractedTextResult;
      console.log("📄 Texte extrait:", extractedText.substring(0, 200) + "...");
    }

    let project;
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true, recipients: true },
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
      const projectText = [
        `Projet: ${projectName}`,
        `Client: ${clientName}`,
        `Description: ${description}`,
        `Surface: ${surface} m²`,
        `Budget: ${budgetEstimate} €`,
        `Métiers: ${selectedTrades.length ? selectedTrades.join(", ") : "général"}`,
        `Pièces: ${pieces.length ? pieces.map((piece) => `${piece.type || "Pièce"} ${piece.solSurface || 0}m² / ${piece.murSurface || 0}m²`).join(" | ") : "non détaillé"}`,
      ].join("\n");
      extractedText = projectText;
    }

    if (!file && !project) {
      throw new Error("Aucun contenu exploitable pour l'analyse");
    }

    if (tempFilePath) {
      fs.unlinkSync(tempFilePath);
    }

    const agents = await prisma.agent.findMany({
      where: { type: "ia", isActive: true },
    });
    const findAgent = (nameSubstring) =>
      agents.find((a) => a.name.includes(nameSubstring));

    console.log("👁️ Agent Visionneur : analyse de la photo...");
    const visionPrompt = `
Analyse cette description de chantier extraite d'une photo :
"${extractedText}"

Donne-moi un JSON STRICT avec ces champs :
- support: (type de sol, ex: "dalle béton", "carrelage existant", "plancher bois")
- fissures: (true/false)
- exterieur: (true/false)
- humidite: (true/false)
- ensoleillement: ("faible", "moyen", "fort")
- obstacles: (liste d'obstacles, ex: ["poteau", "regard"])
- surface_approx: (estimation en m², nombre)
`;
    const visionRaw = await callOllama(visionPrompt);
    const visionData = JSON.parse(visionRaw);

    console.log("🧠 Agent Expert 3S : application des règles métier...");
    const expertPrompt = `
Données extraites par l'analyse : ${JSON.stringify(visionData)}

Tu es un maître carreleur. Applique la règle des 3S (Support, Surface, Sollicitation).
Réponds en JSON STRICT avec :
- colle: (type, ex: "C2FT", "C2TE S1")
- carrelage: (type, ex: "grès cérame givré R11")
- joint: (type, ex: "époxy", "ciment")
- pente: (si extérieur, en %, ex: 1.5, sinon null)
- remarques: (contraintes techniques en texte)
`;
    const expertRaw = await callOllama(expertPrompt);
    const expertData = JSON.parse(expertRaw);

    console.log("🧮 Agent Calculette : calcul des quantités...");
    const surface = visionData.surface_approx || 0;
    const calcPrompt = `
Surface approximative : ${surface} m²
Produits recommandés : ${JSON.stringify(expertData)}

Calcule les quantités pour ce chantier de carrelage.
Réponds en JSON STRICT avec :
- carreaux_m2: (surface + 10% de chute, nombre)
- sacs_colle: (nombre, basé sur 5kg/m²)
- joint_kg: (nombre, basé sur 0.5kg/m²)
- temps_heures: (estimation en heures, basé sur 1.5h/m²)
`;
    const calcRaw = await callOllama(calcPrompt);
    const calcData = JSON.parse(calcRaw);

    console.log("✍️ Agent Rédacteur : génération du devis...");
    const redacteurPrompt = `
Tu es un maître carreleur expérimenté qui rédige des devis pour des clients.
À partir de ces données :
- Analyse visuelle : ${JSON.stringify(visionData)}
- Produits techniques : ${JSON.stringify(expertData)}
- Quantités : ${JSON.stringify(calcData)}

Rédige un devis clair, professionnel et pédagogique en français.
Structure-le avec :
1. Introduction (référence du projet)
2. Produits recommandés (avec justifications techniques et sécuritaires)
3. Quantités estimées
4. Temps de pose estimé
5. Conclusion
Sois rassurant et explique les choix (ex: pourquoi un carrelage antidérapant est obligatoire à l'extérieur).
`;
    const devisFinal = await callOllama(redacteurPrompt, "mistral:7b-instruct-q4_K_M");

    if (tempFilePath) {
      fs.unlinkSync(tempFilePath);
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
          surface: surface,
          status: "BROUILLON",
        },
      });
    }

    const agentVision = findAgent("Visionneur");
    const agentExpert = findAgent("Expert 3S");
    const agentCalc = findAgent("Calculette");
    const agentRedact = findAgent("Rédacteur");

    await prisma.aiRecommendation.createMany({
      data: [
        {
          projectId: project.id,
          agentId: agentVision.id,
          createdByUserId: project.userId,
          category: "vision",
          content: JSON.stringify(visionData),
          status: "APPROVED",
        },
        {
          projectId: project.id,
          agentId: agentExpert.id,
          createdByUserId: project.userId,
          category: "expertise",
          content: JSON.stringify(expertData),
          status: "APPROVED",
        },
        {
          projectId: project.id,
          agentId: agentCalc.id,
          createdByUserId: project.userId,
          category: "calcul",
          content: JSON.stringify(calcData),
          status: "APPROVED",
        },
        {
          projectId: project.id,
          agentId: agentRedact.id,
          createdByUserId: project.userId,
          category: "devis",
          content: devisFinal,
          status: "APPROVED",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      devis: devisFinal,
      details: {
        vision: visionData,
        expert: expertData,
        calcul: calcData,
      },
    });
  } catch (error) {
    console.error("❌ Erreur globale:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}