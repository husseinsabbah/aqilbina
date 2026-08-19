import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const tutorial = await prisma.tutorial.findUnique({ where: { id } });

    if (!tutorial) {
      return NextResponse.json({ error: 'Tutoriel introuvable' }, { status: 404 });
    }

    return NextResponse.json(tutorial);
  } catch (error) {
    console.error('GET /api/admin/tutorials/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const current = await prisma.tutorial.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: 'Tutoriel introuvable' }, { status: 404 });
    }

    const updated = await prisma.tutorial.update({
      where: { id },
      data: {
        title: body.title?.trim() ?? current.title,
        type: body.type?.trim() ?? current.type,
        url: body.url === undefined ? current.url : (body.url?.trim() || null),
        content: body.content === undefined ? current.content : (body.content?.trim() || null),
        tags: body.tags === undefined ? current.tags : (body.tags?.trim() || null),
        keywords: body.keywords === undefined ? current.keywords : (body.keywords?.trim() || ''),
        trade: body.trade === undefined ? current.trade : (body.trade?.trim() || null),
        source: body.source === undefined ? current.source : (body.source?.trim() || null),
        description: body.description === undefined ? current.description : (body.description?.trim() || null),
        thumbnail: body.thumbnail === undefined ? current.thumbnail : (body.thumbnail?.trim() || null),
        projectType: body.projectType === undefined ? current.projectType : (body.projectType?.trim() || null),
        difficulty: body.difficulty === undefined ? current.difficulty : (body.difficulty?.trim() || null),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'TUTORIAL_UPDATED',
        details: `Tutoriel ${updated.title} mis à jour`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/admin/tutorials/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const { id } = await params;
    const tutorial = await prisma.tutorial.findUnique({ where: { id } });

    if (!tutorial) {
      return NextResponse.json({ error: 'Tutoriel introuvable' }, { status: 404 });
    }

    await prisma.tutorial.delete({ where: { id } });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.user.id,
        action: 'TUTORIAL_DELETED',
        details: `Tutoriel ${tutorial.title} supprimé`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/tutorials/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
