import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const config = await prisma.assistantConfig.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration introuvable' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && config.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/admin/assistant-config/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.assistantConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Configuration introuvable' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, tone, systemPrompt, rules, isActive } = body;

    const updated = await prisma.assistantConfig.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(tone !== undefined ? { tone } : {}),
        ...(systemPrompt !== undefined ? { systemPrompt } : {}),
        ...(rules !== undefined ? { rules } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/admin/assistant-config/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
