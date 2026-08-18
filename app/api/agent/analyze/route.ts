import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import OpenAI from 'openai';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AnalysisResponse = {
  summary: string;
  recommendedProducts: Array<{
    productId: string;
    name: string;
    brand: string | null;
    price: number;
    stock: number;
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
  tutorials,
  config,
  history,
  question,
}: {
  project: {
    name: string;
    description?: string | null;
    type?: string | null;
    surface?: number | null;
    budgetEstimate?: number | null;
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
}) {
  const productText = products.length
    ? products.map((product) => (
        `- ${product.name} | catégorie: ${product.category} | marque: ${product.brand ?? 'N/A'} | prix: ${product.salePrice} € | stock: ${product.stock} | description: ${product.description ?? 'Aucune description'}`
      )).join('\n')
    : '- Aucun produit disponible dans le catalogue.';

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

  return `
Tu es ${config.role}. Tu dois adopter un ton ${config.tone}.

Règles de fonctionnement :
${config.systemPrompt}

Règles métier :
${config.rules}

Tu dois respecter strictement ces contraintes :
- Tu ne proposes QUE des produits présents dans le catalogue fourni.
- Tu n’inventes JAMAIS un prix, un stock, un délai ou une information.
- Tu restes dans le contexte du projet.
- Si une information manque, tu poses une question.
- Tu réponds uniquement en JSON valide.
- Tu dois renvoyer exactement ces clés : summary, recommendedProducts, recommendedTutorials, questions, nextAction.

Contexte du projet :
- nom: ${project.name}
- type: ${project.type ?? 'Non renseigné'}
- surface: ${project.surface ?? 'Non renseignée'}
- budget estimé: ${project.budgetEstimate ?? 'Non renseigné'} €
- description: ${project.description ?? 'Aucune description'}
- question supplémentaire: ${question ?? 'Aucune'}

Catalogue du vendeur :
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
          const justification = typeof p.justification === 'string' ? p.justification : '';

          if (!productId || !name) return null;

          return {
            productId,
            name,
            brand,
            price: Number.isFinite(price) ? price : 0,
            stock: Number.isFinite(stock) ? stock : 0,
            justification,
          };
        })
        .filter(Boolean) as Array<{
          productId: string;
          name: string;
          brand: string | null;
          price: number;
          stock: number;
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
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const activeUserAgent = await prisma.userAgent.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['TRIAL', 'ACTIVE'] },
      },
      include: { agent: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeUserAgent) {
      return NextResponse.json({ error: 'Aucun agent actif pour ce vendeur' }, { status: 403 });
    }

    let config = await prisma.assistantConfig.findFirst({
      where: {
        userId: session.user.id,
        agentId: activeUserAgent.agentId,
        isActive: true,
      },
    });

    if (!config) {
      config = await prisma.assistantConfig.create({
        data: {
          userId: session.user.id,
          agentId: activeUserAgent.agentId,
          name: `${activeUserAgent.agent.name} Assistant`,
          role: 'Assistant vendeur expert',
          tone: 'professionnel, utile, précis',
          systemPrompt:
            'Tu es un assistant expert pour aider un vendeur à recommander des produits. Tu ne proposes que des produits du catalogue du vendeur et tu restes dans le contexte du projet.',
          rules:
            'Tu rejoutes les produits hors catalogue. Tu ne donnes pas des prix ou stocks inventés. Si une information manque, pose une question. Réponds uniquement en JSON.',
          isActive: true,
        },
      });
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
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
      tutorials: tutorials.map((tutorial) => ({
        id: tutorial.id,
        title: tutorial.title,
        type: tutorial.type,
        url: tutorial.url,
        description: tutorial.description,
        keywords: tutorial.keywords,
      })),
      config: {
        role: config.role,
        tone: config.tone,
        systemPrompt: config.systemPrompt,
        rules: config.rules,
      },
      history: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      question,
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
          agentId: activeUserAgent.agentId,
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
        agentId: activeUserAgent.agentId,
        role: 'assistant',
        content: JSON.stringify(parsedResponse),
        context: JSON.stringify({ projectName: project.name, projectType: project.type }),
      },
    });

    await prisma.assistantLog.create({
      data: {
        agentId: activeUserAgent.agentId,
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
