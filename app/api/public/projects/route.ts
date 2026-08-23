import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const TRADE_KEYWORDS: Record<string, string[]> = {
  carreleur: ['carrelage', 'carreau', 'faience', 'faïence', 'joint', 'colle'],
  plombier: ['plomberie', 'sanitaire', 'douche', 'lavabo', 'chauffage', 'canalisation'],
  electricien: ['electricite', 'électricité', 'eclairage', 'éclairage', 'prise', 'tableau', 'domotique'],
  peintre: ['peinture', 'enduit', 'facade', 'façade', 'vernis'],
  menuisier: ['menuiserie', 'bois', 'fenetre', 'fenêtre', 'porte', 'placard'],
  macon: ['maconnerie', 'maçonnerie', 'parpaing', 'beton', 'béton', 'fondation'],
};

const detectTradeFromText = (value: string): string | null => {
  const normalized = value.toLowerCase();

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return trade;
    }
  }

  return null;
};

const computeSuggestedQuantity = (category: string, totalSurface: number | null) => {
  if (!totalSurface || totalSurface <= 0) return 1;

  if (/carreau|carrelage|faience|faïence/i.test(category)) {
    return Math.max(1, Math.ceil(totalSurface * 1.1));
  }

  if (/colle|joint|enduit|peinture/i.test(category)) {
    return Math.max(1, Math.ceil(totalSurface));
  }

  return Math.max(1, Math.ceil(totalSurface / 5));
};

type SecuredSelectedProduct = {
  productId: string;
  sellerId: string;
  trade: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
  unit: string;
  seller: string;
  salePrice: number;
  imageUrl: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const artisanId = String(body.artisanId || '').trim();
    const professionalRole = String(body.professionalRole || 'artisan').trim().toLowerCase();
    const professionalTrade = String(body.professionalTrade || '').trim().toLowerCase();
    const clientName = String(body.clientName || '').trim();
    const clientPhone = String(body.clientPhone || '').trim();
    const clientEmail = String(body.clientEmail || '').trim();
    const clientAddress = String(body.clientAddress || '').trim();
    const projectName = String(body.projectName || '').trim();
    const projectType = String(body.projectType || '').trim();
    const description = String(body.description || '').trim();
    const workType = body.workType ? String(body.workType).trim() : null;
    const surface = body.surface === null || body.surface === undefined || body.surface === '' ? null : Number(body.surface);
    const budgetEstimate = body.budgetEstimate === null || body.budgetEstimate === undefined || body.budgetEstimate === '' ? null : Number(body.budgetEstimate);
    const detailFields = body.details && typeof body.details === 'object' ? body.details : null;
    const requestedProducts = detailFields?.products && typeof detailFields.products === 'object' ? detailFields.products : null;

    if (!artisanId || !clientName || !clientPhone || !clientEmail || !clientAddress || !projectName) {
      return NextResponse.json({ error: 'Merci de remplir tous les champs obligatoires.' }, { status: 400 });
    }

    const artisan = await prisma.user.findUnique({
      where: { id: artisanId },
      select: {
        id: true,
        trade: true,
        role: true,
        companyName: true,
        name: true,
        services: { select: { serviceCategory: true } },
        products: { select: { category: true } },
      },
    });

    if (!artisan || (artisan.trade !== 'artisan' && artisan.role !== 'artisan')) {
      return NextResponse.json({ error: 'Artisan introuvable.' }, { status: 404 });
    }

    const availableTrades = Array.from(
      new Set(
        [
          artisan.trade || '',
          ...artisan.services.map((service) => service.serviceCategory || ''),
          ...artisan.products.map((product) => product.category || ''),
        ]
          .map((value) => detectTradeFromText(value) || value.toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const requestedActiveTrades = requestedProducts && Array.isArray(requestedProducts.activeTrades)
      ? requestedProducts.activeTrades
          .map((value: unknown) => String(value || '').toLowerCase().trim())
          .filter(Boolean)
      : [];

    const allowedActiveTrades = requestedActiveTrades.filter((tradeValue: string) => availableTrades.includes(tradeValue));

    const requestedSelected = requestedProducts && Array.isArray(requestedProducts.selected)
      ? requestedProducts.selected.filter((row: unknown) => row && typeof row === 'object')
      : [];

    const requestedProductIds = requestedSelected
      .map((row: Record<string, unknown>) => String(row.productId || '').trim())
      .filter(Boolean);

    const catalogProducts = requestedProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: requestedProductIds } },
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            salePrice: true,
            imageUrl: true,
            description: true,
            user: { select: { id: true, name: true, companyName: true } },
          },
        })
      : [];

    const catalogById = new Map(catalogProducts.map((product) => [product.id, product]));

    const securedSelectedProducts: SecuredSelectedProduct[] = requestedSelected.flatMap((row: Record<string, unknown>) => {
      const productId = String(row.productId || '').trim();
      const trade = String(row.trade || '').toLowerCase().trim();
      if (!productId || !trade || !allowedActiveTrades.includes(trade)) {
        return [];
      }

      const product = catalogById.get(productId);
      if (!product) {
        return [];
      }

      const detectedTrade = detectTradeFromText(
        [product.category, product.name, product.description || ''].join(' ')
      );

      if (detectedTrade && detectedTrade !== trade) {
        return [];
      }

      const normalizedSurface = Number.isFinite(surface) && surface && surface > 0 ? surface : null;
      const quantity = computeSuggestedQuantity(product.category, normalizedSurface);

      return [{
        productId: product.id,
        sellerId: product.user.id,
        trade,
        name: product.name,
        brand: product.brand,
        category: product.category,
        quantity,
        unit: 'unité',
        seller: product.user.companyName || product.user.name,
        salePrice: product.salePrice,
        imageUrl: product.imageUrl,
      }];
    });

    const securedProducts = {
      activeTrades: allowedActiveTrades,
      selected: securedSelectedProducts,
      manual: null,
      snapshotId: crypto.randomUUID(),
      securedAt: new Date().toISOString(),
      note: 'Prix et quantités recalculés côté serveur.',
    };

    const recipients = professionalTrade
      ? await prisma.user.findMany({
          where: {
            OR: [{ role: professionalRole }, { trade: professionalRole }],
            trade: professionalTrade,
          },
          select: { id: true, trade: true },
        })
      : [{ id: artisan.id, trade: artisan.trade }];

    const privateDetails = {
      description: description || null,
      projectType: projectType || null,
      workType,
      sol: detailFields?.sol && typeof detailFields.sol === 'object' ? detailFields.sol : null,
      mur: detailFields?.mur && typeof detailFields.mur === 'object' ? detailFields.mur : null,
      specialtyDetails: detailFields?.specialtyDetails || null,
      products: securedProducts,
    };

    const enrichedDescription = JSON.stringify(privateDetails);

    const pin = Array.from({ length: 6 }, () => String(Math.floor(Math.random() * 10))).join('');
    const hashedPin = await bcrypt.hash(pin, 10);

    const project = await prisma.project.create({
      data: {
        userId: artisan.id,
        name: projectName,
        description: enrichedDescription,
        type: projectType || 'Demande de devis',
        surface: Number.isFinite(surface) && surface > 0 ? surface : null,
        budgetEstimate: Number.isFinite(budgetEstimate) ? budgetEstimate : null,
        clientName,
        clientPhone,
        clientEmail,
        clientAddress,
        status: 'ACTIVE',
        sharePublicUrl: '',
        clientFeedbackStatus: 'PENDING',
        projectAccessPinHash: hashedPin,
        projectAccessPinSentAt: new Date(),
        projectAccessPinExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        projectAccessAttempts: 0,
      },
    });

    const sellerIds = Array.from(new Set(securedSelectedProducts.map((product) => String(product.sellerId || '')).filter(Boolean)));
    const recipientRows = [
      ...recipients.map((recipient) => ({
        projectId: project.id,
        professionalId: recipient.id,
        trade: recipient.trade || professionalTrade || 'artisan',
      })),
      ...sellerIds.map((sellerId) => ({
        projectId: project.id,
        professionalId: sellerId,
        trade: 'vendeur',
      })),
    ];

    await prisma.projectRecipient.createMany({
      data: recipientRows,
    });

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projets/${project.id}`;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        sharePublicUrl: publicUrl,
      },
    });

    return NextResponse.json({
      ok: true,
      projectId: project.id,
      publicUrl,
      pin,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/public/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la création du projet.' }, { status: 500 });
  }
}
