import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

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
        name: "Système Aqil Bina",
        role: "admin",
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
    } = body;

    if (!clientName || !clientEmail || !clientPhone || !projectName) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    const normalizedTargetRole = ["all", "artisan", "vendeur", "promoteur"].includes(professionalRole)
      ? professionalRole
      : "artisan";

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
        name: projectName,
        description: description || null,
        type: projectType || null,
        surface: totalSurface,
        budgetEstimate: budgetEstimate || null,
        status: "ACTIVE",
        clientName,
        clientPhone,
        clientEmail,
        clientAddress,
startDate: desiredStartDate ? new Date(desiredStartDate) : null,
endDate: desiredEndDate ? new Date(desiredEndDate) : null,        metadata: {
          selectedTrades: selectedTrades || [],
          workType: workType || null,
          professionalRole,
          professionalTrade,
          batiment,
          chantiers,
          pieces: pieces || [],
          files: fileUrls,
          details: {
            description: description || "",
          },
        },
      },
    });

    // Gestion des invitations
    if (isBroadcast && selectedTrades && selectedTrades.length > 0) {
      const roleFilter = normalizedTargetRole === "all"
        ? ["artisan", "vendeur", "promoteur"]
        : [normalizedTargetRole];

      const recipients = await prisma.user.findMany({
        where: {
          role: { in: roleFilter },
          trade: { in: selectedTrades },
        },
        select: { id: true, trade: true, role: true },
      });

      if (recipients.length > 0) {
        await prisma.projectRecipient.createMany({
          data: recipients.map((recipient) => ({
            projectId: project.id,
            professionalId: recipient.id,
            trade: recipient.trade || recipient.role || "professionnel",
            status: "INVITE",
            message: `Demande de devis ${normalizedTargetRole === "all" ? "multi-profils" : normalizedTargetRole} (${selectedTrades.join(", ")})`,
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