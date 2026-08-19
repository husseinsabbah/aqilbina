import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const tutorials = await prisma.tutorial.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tutorials);
  } catch (error) {
    console.error('GET /api/admin/tutorials error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { title, type, url, content, tags, keywords, trade, source, description, thumbnail, projectType, difficulty } = body ?? {};

    if (!title || !type) {
      return NextResponse.json({ error: 'Titre et type requis' }, { status: 400 });
    }

    const tutorial = await prisma.tutorial.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        url: url?.trim() || null,
        content: content?.trim() || null,
        tags: tags?.trim() || null,
        keywords: (keywords || '').trim() || '',
        trade: trade?.trim() || null,
        source: source?.trim() || null,
        description: description?.trim() || null,
        thumbnail: thumbnail?.trim() || null,
        projectType: projectType?.trim() || null,
        difficulty: difficulty?.trim() || null,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'TUTORIAL_CREATED',
        details: `Tutoriel ${tutorial.title} créé`,
      },
    });

    return NextResponse.json(tutorial, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/tutorials error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
