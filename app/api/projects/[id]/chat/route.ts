import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
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
    console.error('GET /api/projects/[id]/chat error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const content = String(body.content || '').trim();
    const role = String(body.role || 'client').toLowerCase() === 'artisan' ? 'artisan' : 'client';

    if (!content) {
      return NextResponse.json({ error: 'Le message est vide.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: id,
        userId: project.userId,
        role,
        content,
        context: JSON.stringify({ source: role }),
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects/[id]/chat error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l’envoi du message.' }, { status: 500 });
  }
}
