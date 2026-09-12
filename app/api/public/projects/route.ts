import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getActorTaxonomy, getBroadcastTargetRoles, normalizeProjectActorRole } from "@/lib/trade-rules";

const prisma = new PrismaClient();

function normalizePublicProjectUrl(projectId: string, url?: string | null) {
  if (!url) return `http://localhost:3000/projets/${projectId}`;
  const trimmed = url.trim();
  const normalized = trimmed.replace(/\/$/, "");
  if (normalized.includes("/undefined/projets/")) {
    return normalized.replace(/\/undefined\/projets\//, "/projets/");
  }
  if (normalized.includes("/projets/")) {
    return normalized;
  }
  return `${normalized}/projets/${projectId}`;
}

function normalizeSearchToken(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractSearchTokensFromUser(user: { trade?: string | null; role?: string | null; products?: Array<{ category?: string | null }> | null }) {
  const rawValues = [user.trade, user.role, ...(user.products ?? []).map((product) => product.category)];
  const tokens = rawValues
    .map((value) => normalizeSearchToken(value))
    .flatMap((value) => value.split(/\s+/).filter(Boolean));

  return Array.from(new Set(tokens.filter((token) => token.length > 1)));
}

function userMatchesSelectedCategory(
  user: { trade?: string | null; role?: string | null; products?: Array<{ category?: string | null }> | null },
  requestedTrades: string[]
) {
  if (requestedTrades.length === 0) return true;

  const tokens = extractSearchTokensFromUser(user);
  const requested = requestedTrades
    .map((trade) => normalizeSearchToken(trade))
    .filter(Boolean);

  if (requested.length === 0) return true;

  return requested.some((requestedTrade) => {
    if (tokens.includes(requestedTrade)) return true;
    return tokens.some((token) => token.includes(requestedTrade) || requestedTrade.includes(token));
  });
}

function getPublicBaseUrl(): string {
  const rawBase = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.AUTH_URL || "http://localhost:3000";
  return rawBase.replace(/\/$/, "");
}

async function saveFile(file: File, basePath: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name);
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const fullPath = path.join(basePath, filename);
  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath, { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/projects/${filename}`;
}

async function getOrCreateSystemUser(): Promise<{ id: string }> {
  const systemEmail = "system@aqilbina.com";
  let user = await prisma.user.findUnique({
    where: { email: systemEmail },
    select: { id: true },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash("system-" + randomBytes(8).toString("hex"), 10);
    user = await prisma.user.create({
      data: {
        email: systemEmail,
        name: "Client public Aqil Bina",
        role: "user",
        password: passwordHash,
      },
      select: { id: true },
    });
  }

  return user;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const dataStr = formData.get("data");
    if (!dataStr || typeof dataStr !== "string") {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const body = JSON.parse(dataStr);
    const {
      artisanId,
      professionalRole,
      professionalTrade,
      selectedTrades,
      targetRole,
      targetTrades,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      projectName,
      projectType,
      workType,
      description,
      budgetEstimate,
      batiment,
      chantiers,
      pieces,
      desiredStartDate,
      desiredEndDate,
      projectInfo,
      siteInfo,
      clientInfo,
    } = body;

    const normalizedTargetRole = normalizeProjectActorRole(targetRole ?? professionalRole);
    const rawChosenTrades = Array.isArray(targetTrades) ? targetTrades : Array.isArray(selectedTrades) ? selectedTrades : [];
    const selectedTradeValues = rawChosenTrades
      .map((entry) => (typeof entry === "string" ? entry : entry?.value ?? entry?.trade ?? ""))
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => String(value));

    const selectedTradeLabels = rawChosenTrades
      .map((entry) => (typeof entry === "string" ? entry : entry?.label ?? entry?.value ?? entry?.trade ?? ""))
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => String(value));

    const finalClientName = clientName ?? clientInfo?.name ?? "";
    const finalClientPhone = clientPhone ?? clientInfo?.phone ?? "";
    const finalClientEmail = clientEmail ?? clientInfo?.email ?? "";
    const finalClientAddress = clientAddress ?? clientInfo?.address ?? "";
    const finalProjectName = projectName ?? projectInfo?.name ?? "";
    const finalProjectType = projectType ?? projectInfo?.type ?? "";
    const finalWorkType = workType ?? projectInfo?.workType ?? null;
    const finalDescription = description ?? projectInfo?.description ?? "";
    const finalBudgetEstimate = budgetEstimate ?? projectInfo?.budgetEstimate ?? null;
    const finalBatiment = batiment ?? siteInfo?.batiment ?? "";
    const finalChantiers = chantiers ?? siteInfo?.chantiers ?? [];
    const finalPieces = pieces ?? siteInfo?.pieces ?? [];

    if (!finalClientName || !finalClientEmail || !finalClientPhone || !finalProjectName) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    const canonicalTrade = selectedTradeValues[0] ?? professionalTrade ?? normalizedTargetRole;
    const targetRoles = getBroadcastTargetRoles(normalizedTargetRole);
    const actorTaxonomy = getActorTaxonomy(normalizedTargetRole, canonicalTrade);

    // Gestion du broadcast
    let finalUserId: string;
    const isBroadcast = artisanId === "broadcast" || !artisanId;

    if (isBroadcast) {
      const systemUser = await getOrCreateSystemUser();
      finalUserId = systemUser.id;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: artisanId },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Artisan introuvable." }, { status: 400 });
      }
      finalUserId = artisanId;
    }

    const pin = randomBytes(3).toString("hex").toUpperCase();

    // Sauvegarde des fichiers
    const files = formData.getAll("files");
    const fileUrls: string[] = [];
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public/uploads/projects");
      for (const file of files) {
        if (file instanceof File) {
          try {
            const url = await saveFile(file, uploadDir);
            fileUrls.push(url);
          } catch (err) {
            console.error("Erreur sauvegarde fichier:", err);
          }
        }
      }
    }

    // Calcul de la surface totale
    let totalSurface: number | null = null;
    if (pieces && Array.isArray(pieces) && pieces.length > 0) {
      let sum = 0;
      for (const piece of pieces) {
        const sol = parseFloat(piece.solSurface);
        if (!isNaN(sol) && sol > 0) {
          sum += sol;
        }
      }
      if (sum > 0) totalSurface = sum;
    }

    // Création du projet avec les dates
    const project = await prisma.project.create({
      data: {
        userId: finalUserId,
        name: finalProjectName,
        description: finalDescription || null,
        type: finalProjectType || null,
        surface: totalSurface,
        budgetEstimate: finalBudgetEstimate || null,
        status: "ACTIVE",
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        clientEmail: finalClientEmail,
        clientAddress: finalClientAddress,
        startDate: desiredStartDate ? new Date(desiredStartDate) : null,
        endDate: desiredEndDate ? new Date(desiredEndDate) : null,
        metadata: {
          projectType: finalProjectType || null,
          selectedTrades: selectedTradeValues.length > 0 ? selectedTradeValues : (Array.isArray(selectedTrades) ? selectedTrades : []),
          selectedTradeLabels: selectedTradeLabels.length > 0 ? selectedTradeLabels : (Array.isArray(selectedTrades) ? selectedTrades : []),
          tradeValues: selectedTradeValues,
          tradeLabels: selectedTradeLabels,
          workType: finalWorkType || null,
          professionalRole: normalizedTargetRole,
          professionalTrade: canonicalTrade,
          actorTaxonomy,
          targetRoles,
          batiment: finalBatiment,
          chantiers: finalChantiers,
          pieces: finalPieces || [],
          files: fileUrls,
          details: {
            description: finalDescription || "",
          },
        },
      },
    });

    // Gestion des invitations
    if (isBroadcast) {
      const requestedTrades = selectedTradeValues.length > 0
        ? selectedTradeValues
            .map((trade) => normalizeSearchToken(String(trade)))
            .filter((trade) => trade.length > 0 && !["general", "all", "tous", "toutes", "professionnel", "professionnels"].includes(trade))
        : [];

      const eligibleProfileRoles = Array.from(new Set(targetRoles.filter((role) => ["artisan", "vendeur", "promoteur"].includes(role))));
      const recipients = await prisma.user.findMany({
        where: {
          OR: [
            { role: { in: eligibleProfileRoles } },
            { trade: { in: eligibleProfileRoles } },
          ],
        },
        select: {
          id: true,
          trade: true,
          role: true,
          products: {
            select: { category: true },
          },
        },
      });

      const filteredRecipients = recipients.filter((recipient) => {
        const normalizedRole = normalizeProjectActorRole(recipient.role || recipient.trade || "");
        const roleMatches = eligibleProfileRoles.includes(normalizedRole);

        if (!roleMatches) return false;

        if (requestedTrades.length === 0) return true;

        if (normalizedTargetRole === "all") {
          return userMatchesSelectedCategory(recipient, requestedTrades);
        }

        if (normalizedTargetRole === "vendeur") {
          return normalizedRole === "vendeur" && userMatchesSelectedCategory(recipient, requestedTrades);
        }

        if (normalizedTargetRole === "artisan") {
          return normalizedRole === "artisan" && userMatchesSelectedCategory(recipient, requestedTrades);
        }

        if (normalizedTargetRole === "promoteur") {
          return normalizedRole === "promoteur" && userMatchesSelectedCategory(recipient, requestedTrades);
        }

        return userMatchesSelectedCategory(recipient, requestedTrades);
      });

      if (filteredRecipients.length > 0) {
        await prisma.projectRecipient.createMany({
          data: filteredRecipients.map((recipient) => ({
            projectId: project.id,
            professionalId: recipient.id,
            trade: recipient.trade || recipient.role || "professionnel",
            status: "INVITE",
            message: `Demande de devis ${normalizedTargetRole === "all" ? "multi-profils" : normalizedTargetRole} (${requestedTrades.length > 0 ? requestedTrades.join(", ") : "tous"})`,
          })),
        });
      }
    } else if (!isBroadcast && artisanId) {
      const existingRecipient = await prisma.projectRecipient.findFirst({
        where: {
          projectId: project.id,
          professionalId: artisanId,
        },
      });

      if (!existingRecipient) {
        await prisma.projectRecipient.create({
          data: {
            projectId: project.id,
            professionalId: artisanId,
            trade: professionalTrade || "artisan",
            status: "INVITE",
            message: "Demande de devis créée par le client.",
          },
        });
      }
    }

    const publicUrl = normalizePublicProjectUrl(project.id, `${getPublicBaseUrl()}/projets/${project.id}`);

    return NextResponse.json({ success: true, projectId: project.id, publicUrl, pin });
  } catch (error) {
    console.error("Erreur création projet:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}