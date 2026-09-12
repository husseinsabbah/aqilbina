import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import OpenAI from 'openai';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveProfileDispatch } from '@/lib/ia-profile-router';

type AnalysisResponse = {
  summary: string;
  recommendedProducts: Array<{
    productId: string;
    name: string;
    brand: string | null;
    price: number;
    stock: number;
    quantity: number;
    justification: string;
  }>;
  recommendedTutorials: Array<{
    tutorialId: string;
    title: string;
    type: string;
    url: string;
    description: string;
  }>;
  questions: string[];
  nextAction: string;
  recommendedServices?: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    justification: string;
  }>;
};

const fallbackResponse: AnalysisResponse = {
  summary: 'Je n’ai pas pu analyser ce projet avec assez de précision. Pouvez-vous préciser votre besoin principal ?',
  recommendedProducts: [],
  recommendedTutorials: [],
  questions: [
    'Quel est le produit principal recherché ?',
    'Avez-vous une préférence de budget ou de finition ?',
  ],
  nextAction: 'Compléter les informations manquantes avant de recommander des produits.',
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt({
  project,
  products,
  services,
  tutorials,
  config,
  history,
  question,
  isSupervisor,
}: {
  project: {
    name: string;
    description?: string | null;
    type?: string | null;
    surface?: number | null;
    budgetEstimate?: number | null;
    metadata?: Record<string, unknown> | null;
  };
  products: Array<{
    id: string;
    name: string;
    description?: string | null;
    category: string;
    brand?: string | null;
    salePrice: number;
    stock: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    serviceCategory?: string | null;
    description?: string | null;
    unit: string;
    unitPrice: number;
    applicableProjectTypes?: string | null;
  }>;
  tutorials: Array<{
    id: string;
    title: string;
    type: string;
    url?: string | null;
    description?: string | null;
    keywords: string;
  }>;
  config: {
    role: string;
    tone: string;
    systemPrompt: string;
    rules: string;
  };
  history: Array<{ role: string; content: string }>;
  question?: string;
  isSupervisor?: boolean;
}) {
  const productText = products.length
    ? products.map((product) => (
        `- ${product.name} | catégorie: ${product.category} | marque: ${product.brand ?? 'N/A'} | prix: ${product.salePrice} € | stock: ${product.stock} | description: ${product.description ?? 'Aucune description'}`
      )).join('\n')
    : '- Aucun produit disponible dans le catalogue.';

  const serviceText = services.length
    ? services.map((service) => (
        `- ${service.name} | catégorie: ${service.serviceCategory ?? 'Prestation'} | unité: ${service.unit} | prix unitaire: ${service.unitPrice} € | types applicables: ${service.applicableProjectTypes ?? 'Non précisé'} | description: ${service.description ?? 'Aucune description'}`
      )).join('\n')
    : '- Aucune prestation active configurée pour cet artisan.';

  const tutorialText = tutorials.length
    ? tutorials.map((tutorial) => (
        `- ${tutorial.title} | type: ${tutorial.type} | url: ${tutorial.url ?? 'N/A'} | mots-clés: ${tutorial.keywords} | description: ${tutorial.description ?? ''}`
      )).join('\n')
    : '- Aucun tutoriel disponible pour ce projet.';

  const historyText = history.length
    ? history
        .map((message) => `${message.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${message.content}`)
        .join('\n')
    : '- Aucun historique.';

  const metadataText = project.metadata && typeof project.metadata === 'object'
    ? JSON.stringify(project.metadata, null, 2)
    : 'Aucune donnée métier supplémentaire.';

  return `
Tu es ${config.role}. Tu dois adopter un ton ${config.tone}. ${isSupervisor ? 'Tu agis en mode superviseur IA : tu coordonnes les recommandations, évites les doublons et tu produis un devis cohérent, unifié et prioritaire.' : 'Tu analyses le projet de manière ciblée pour un artisan.'}

Règles de fonctionnement :
${config.systemPrompt}

Règles métier :
${config.rules}

Tu dois respecter strictement ces contraintes :
- Tu ne proposes QUE des produits présents dans le catalogue fourni.
- Tu n’inventes JAMAIS un prix, un stock, un délai ou une information.
- Tu restes dans le contexte du projet et de la spécialité artisanale.
- Tu dois tenir compte des dimensions / surface / métrés du projet.
- Tu dois proposer des produits et quantités cohérents avec les prestations artisanales et les dimensions.
- Si une information manque, tu poses une question.
- Tu réponds uniquement en JSON valide.
- Tu dois renvoyer exactement ces clés : summary, recommendedProducts, recommendedTutorials, questions, nextAction.
- Le champ recommendedProducts doit inclure productId, name, brand, price, stock, quantity, justification.

Contexte du projet :
- nom: ${project.name}
- type: ${project.type ?? 'Non renseigné'}
- surface: ${project.surface ?? 'Non renseignée'}
- budget estimé: ${project.budgetEstimate ?? 'Non renseigné'} €
- description: ${project.description ?? 'Aucune description'}
- métadonnées: ${metadataText}
- question supplémentaire: ${question ?? 'Aucune'}

Prestations artisanales disponibles :
${serviceText}

Catalogue produit disponible :
${productText}

Tutoriels disponibles :
${tutorialText}

Historique récent :
${historyText}

Réponse attendue :
{
  "summary": "Résumé clair du besoin principal",
  "recommendedProducts": [
    {
      "productId": "id réel du produit",
      "name": "nom du produit",
      "brand": "marque ou null",
      "price": 0,
      "stock": 0,
      "quantity": 1,
      "justification": "explication courte"
    }
  ],
  "recommendedTutorials": [
    {
      "tutorialId": "id réel du tutoriel",
      "title": "titre du tutoriel",
      "type": "video|text|link",
      "url": "url",
      "description": "description courte"
    }
  ],
  "questions": ["question 1", "question 2"],
  "nextAction": "Action recommandée"
}
`.trim();
}

function normalizeResponse(raw: unknown): AnalysisResponse | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;

  const summary = typeof data.summary === 'string' ? data.summary : fallbackResponse.summary;

  const recommendedProducts = Array.isArray(data.recommendedProducts)
    ? data.recommendedProducts
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const p = item as Record<string, unknown>;
          const productId = typeof p.productId === 'string' ? p.productId : '';
          const name = typeof p.name === 'string' ? p.name : '';
          const brand = typeof p.brand === 'string' ? p.brand : null;
          const price = typeof p.price === 'number' ? p.price : Number(p.price ?? 0);
          const stock = typeof p.stock === 'number' ? p.stock : Number(p.stock ?? 0);
          const quantity = typeof p.quantity === 'number' ? p.quantity : Number(p.quantity ?? 1);
          const justification = typeof p.justification === 'string' ? p.justification : '';

          if (!productId || !name) return null;

          return {
            productId,
            name,
            brand,
            price: Number.isFinite(price) ? price : 0,
            stock: Number.isFinite(stock) ? stock : 0,
            quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
            justification,
          };
        })
        .filter(Boolean) as Array<{
          productId: string;
          name: string;
          brand: string | null;
          price: number;
          stock: number;
          quantity: number;
          justification: string;
        }>
    : [];

  const recommendedTutorials = Array.isArray(data.recommendedTutorials)
    ? data.recommendedTutorials
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const t = item as Record<string, unknown>;
          const tutorialId = typeof t.tutorialId === 'string' ? t.tutorialId : '';
          const title = typeof t.title === 'string' ? t.title : '';
          const type = typeof t.type === 'string' ? t.type : 'link';
          const url = typeof t.url === 'string' ? t.url : '';
          const description = typeof t.description === 'string' ? t.description : '';

          if (!tutorialId || !title) return null;

          return {
            tutorialId,
            title,
            type,
            url,
            description,
          };
        })
        .filter(Boolean) as Array<{
          tutorialId: string;
          title: string;
          type: string;
          url: string;
          description: string;
        }>
    : [];

  const questions = Array.isArray(data.questions)
    ? data.questions.filter((q): q is string => typeof q === 'string').slice(0, 5)
    : [];

  const nextAction = typeof data.nextAction === 'string' ? data.nextAction : fallbackResponse.nextAction;

  return {
    summary,
    recommendedProducts,
    recommendedTutorials,
    questions,
    nextAction,
  };
}

async function callAi(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    return JSON.stringify(fallbackResponse);
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Tu réponds uniquement en JSON valide et strictement conforme au schéma demandé.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return completion.choices[0]?.message?.content ?? JSON.stringify(fallbackResponse);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, question } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId requis' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        recipients: {
          where: { professionalId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const isOwner = project.userId === session.user.id;
    const isRecipient = project.recipients.length > 0;

    if (!isOwner && !isRecipient) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const metadata = project.metadata && typeof project.metadata === 'object' ? (project.metadata as Record<string, unknown>) : {};
    const projectProfileValue =
      typeof metadata.professionalRole === 'string'
        ? metadata.professionalRole
        : typeof metadata.targetRole === 'string'
          ? metadata.targetRole
          : 'artisan';

    const projectSelectedTrades = Array.isArray(metadata.selectedTrades)
      ? metadata.selectedTrades.filter((value): value is string => typeof value === 'string')
      : [];

    const dispatch = resolveProfileDispatch(
      {
        ...project,
        profile: projectProfileValue,
        selectedTrades: projectSelectedTrades,
      },
      'artisan'
    );

    const activeUserAgents = await prisma.userAgent.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['TRIAL', 'ACTIVE'] },
      },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });

    const selectedUserAgent = activeUserAgents[0] ?? null;

    if (!selectedUserAgent) {
      return NextResponse.json({ error: 'Aucun agent actif pour cet utilisateur' }, { status: 403 });
    }

    const vendorSpecializedAgents = activeUserAgents.filter(
      (userAgent) =>
        userAgent.agent.type === 'vendeur' &&
        !['superviseur', 'supervision', 'coordination', 'gestion'].includes(
          (userAgent.agent.specialty ?? '').toLowerCase().trim()
        )
    );

    const hasVendorSupervisor = activeUserAgents.some(
      (userAgent) =>
        userAgent.agent.type === 'vendeur' &&
        ['superviseur', 'supervision', 'coordination', 'gestion'].includes(
          (userAgent.agent.specialty ?? '').toLowerCase().trim()
        )
    );

    const isSupervisorMode = hasVendorSupervisor || vendorSpecializedAgents.length > 2;

    let config = await prisma.assistantConfig.findFirst({
      where: {
        userId: session.user.id,
        agentId: selectedUserAgent.agentId,
        isActive: true,
      },
    });

    const profileRoleLabel =
      dispatch.profile === 'vendeur'
        ? 'Assistant vendeur spécialisé'
        : dispatch.profile === 'promoteur'
          ? 'Assistant promoteur spécialisé'
          : 'Assistant artisan spécialisé';

    const effectiveConfig = {
      role: isSupervisorMode ? 'Superviseur IA de devis' : profileRoleLabel,
      tone: 'professionnel, utile, précis, orienté devis',
      systemPrompt: `${dispatch.systemPrompt} Tu dois travailler uniquement avec les métiers sélectionnés : ${dispatch.selectedTrades.length ? dispatch.selectedTrades.join(', ') : 'tous métiers'} . Tu n’inclus jamais des métiers hors sélection.`,
      rules: [
        ...dispatch.constraints,
        'Tu ne mélange jamais le métier sélectionné avec un autre métier.',
        'Tu restes strictement dans le périmètre des métiers sélectionnés et des données du projet.',
        'Tu rejettes les produits hors catalogue.',
        'Tu ne donnes pas des prix ou stocks inventés.',
        'Tu calcules les quantités à partir des dimensions et des prestations.',
        'Si une information manque, pose une question.',
        'Réponds uniquement en JSON.',
      ].join('\n'),
    };

    if (!config) {
      config = await prisma.assistantConfig.create({
        data: {
          userId: session.user.id,
          agentId: selectedUserAgent.agentId,
          name: `${selectedUserAgent.agent.name} Assistant`,
          role: effectiveConfig.role,
          tone: effectiveConfig.tone,
          systemPrompt: effectiveConfig.systemPrompt,
          rules: effectiveConfig.rules,
          isActive: true,
        },
      });
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const services = await prisma.service.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const tutorials = await prisma.tutorial.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const history = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const prompt = buildPrompt({
      project: {
        name: project.name,
        description: project.description,
        type: project.type,
        surface: project.surface,
        budgetEstimate: project.budgetEstimate,
        metadata: project.metadata as Record<string, unknown> | null,
      },
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        salePrice: product.salePrice,
        stock: product.stock,
      })),
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        serviceCategory: service.serviceCategory,
        description: service.description,
        unit: service.unit,
        unitPrice: service.unitPrice,
        applicableProjectTypes: service.applicableProjectTypes,
      })),
      tutorials: tutorials.map((tutorial) => ({
        id: tutorial.id,
        title: tutorial.title,
        type: tutorial.type,
        url: tutorial.url,
        description: tutorial.description,
        keywords: tutorial.keywords,
      })),
      config: {
        role: effectiveConfig.role,
        tone: effectiveConfig.tone,
        systemPrompt: effectiveConfig.systemPrompt,
        rules: effectiveConfig.rules,
      },
      history: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      question,
      isSupervisor: isSupervisorMode,
    });

    let responseText = '';
    let responseStatus = 'success';
    let responseError: string | null = null;

    try {
      responseText = await callAi(prompt);
    } catch (error) {
      responseStatus = 'error';
      responseError = error instanceof Error ? error.message : 'Erreur OpenAI';
      responseText = JSON.stringify(fallbackResponse);
    }

    let parsedResponse: AnalysisResponse = fallbackResponse;
    try {
      const parsedJson = JSON.parse(responseText);
      const normalized = normalizeResponse(parsedJson);
      if (normalized) {
        parsedResponse = normalized;
      }
    } catch (error) {
      console.error('Erreur parsing réponse IA:', error);
      parsedResponse = fallbackResponse;
    }

    if (question) {
      await prisma.chatMessage.create({
        data: {
          projectId,
          userId: session.user.id,
          agentId: selectedUserAgent.agentId,
          role: 'user',
          content: question,
          context: JSON.stringify({ projectName: project.name, projectType: project.type }),
        },
      });
    }

    await prisma.chatMessage.create({
      data: {
        projectId,
        userId: session.user.id,
        agentId: selectedUserAgent.agentId,
        role: 'assistant',
        content: JSON.stringify(parsedResponse),
        context: JSON.stringify({ projectName: project.name, projectType: project.type }),
      },
    });

    await prisma.assistantLog.create({
      data: {
        agentId: selectedUserAgent.agentId,
        projectId,
        userId: session.user.id,
        action: 'analyze',
        prompt,
        response: JSON.stringify(parsedResponse),
        durationMs: Date.now() - startedAt,
        status: responseStatus,
        error: responseError,
      },
    });

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('POST /api/agent/analyze error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l’analyse du projet' }, { status: 500 });
  }
}
