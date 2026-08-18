import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
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

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/agent/conversation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
