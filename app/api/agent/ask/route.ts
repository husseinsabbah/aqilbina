import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import OpenAI from 'openai';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildQuestionPrompt({
  project,
  config,
  history,
  message,
}: {
  project: {
    name: string;
    description?: string | null;
    type?: string | null;
    surface?: number | null;
    budgetEstimate?: number | null;
  };
  config: {
    role: string;
    tone: string;
    systemPrompt: string;
    rules: string;
  };
  history: Array<{ role: string; content: string }>;
  message: string;
}) {
  const historyText = history.length
    ? history
        .map((entry) => `${entry.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${entry.content}`)
        .join('\n')
    : '- Aucun historique.';

  return `
Tu es ${config.role}. Tu dois adopter un ton ${config.tone}.

Règles de fonctionnement :
${config.systemPrompt}

Règles métier :
${config.rules}

Tu dois rester dans le contexte du projet et répondre à la question de l'utilisateur de manière utile, claire et précise.

Contexte du projet :
- nom: ${project.name}
- type: ${project.type ?? 'Non renseigné'}
- surface: ${project.surface ?? 'Non renseignée'}
- budget estimé: ${project.budgetEstimate ?? 'Non renseigné'} €
- description: ${project.description ?? 'Aucune description'}

Historique récent :
${historyText}

Question utilisateur :
${message}

Réponds en français, en quelques lignes, de manière claire et professionnelle. Si une information manque, demande une précision courte. Tu ne dois pas inventer un prix, un stock ou un produit qui n’existe pas.
`.trim();
}

async function callAi(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    return 'Je n’ai pas assez d’informations pour répondre avec précision. Pouvez-vous préciser votre besoin ?';
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: 'Tu réponds en français et tu restes dans le contexte du projet.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content ?? 'Je n’ai pas suffisamment d’informations pour répondre précisément.';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, message, agentId } = body;

    if (!projectId || !message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'projectId et message requis' }, { status: 400 });
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

    const activeUserAgent = agentId
      ? await prisma.userAgent.findFirst({
          where: {
            userId: session.user.id,
            agentId,
            status: { in: ['TRIAL', 'ACTIVE'] },
          },
          include: { agent: true },
        })
      : await prisma.userAgent.findFirst({
          where: {
            userId: session.user.id,
            status: { in: ['TRIAL', 'ACTIVE'] },
          },
          include: { agent: true },
          orderBy: { createdAt: 'desc' },
        });

    if (!activeUserAgent) {
      return NextResponse.json({ error: 'Aucun agent actif' }, { status: 403 });
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
            'Tu es un assistant expert pour aider un vendeur à recommander des produits. Tu restes dans le contexte du projet et tu refuses d’inventer des informations.',
          rules:
            'Tu ne proposes pas de produits hors catalogue. Tu n’inventes pas des prix ni des stocks. Si l’information manque, demande un détail court. Réponds clairement et de manière professionnelle.',
          isActive: true,
        },
      });
    }

    const history = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const prompt = buildQuestionPrompt({
      project: {
        name: project.name,
        description: project.description,
        type: project.type,
        surface: project.surface,
        budgetEstimate: project.budgetEstimate,
      },
      config: {
        role: config.role,
        tone: config.tone,
        systemPrompt: config.systemPrompt,
        rules: config.rules,
      },
      history: history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      message: message.trim(),
    });

    const answer = await callAi(prompt);

    await prisma.chatMessage.createMany({
      data: [
        {
          projectId,
          userId: session.user.id,
          agentId: activeUserAgent.agentId,
          role: 'user',
          content: message.trim(),
          context: JSON.stringify({ projectName: project.name, projectType: project.type }),
        },
        {
          projectId,
          userId: session.user.id,
          agentId: activeUserAgent.agentId,
          role: 'assistant',
          content: answer,
          context: JSON.stringify({ projectName: project.name, projectType: project.type }),
        },
      ],
    });

    await prisma.assistantLog.create({
      data: {
        agentId: activeUserAgent.agentId,
        projectId,
        userId: session.user.id,
        action: 'ask',
        prompt,
        response: answer,
        durationMs: 0,
        status: 'success',
      },
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('POST /api/agent/ask error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la question IA' }, { status: 500 });
  }
}
