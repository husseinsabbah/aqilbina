import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const pin = String(body.pin || '').trim();

    if (!pin) {
      return NextResponse.json({ ok: false, error: 'Code PIN requis.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        projectAccessPinHash: true,
        projectAccessPinExpiresAt: true,
        projectAccessAttempts: true,
      },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    }

    if (!project.projectAccessPinHash) {
      return NextResponse.json({ ok: true, message: 'Aucun PIN requis pour ce projet.' });
    }

    const now = new Date();
    if (project.projectAccessPinExpiresAt && project.projectAccessPinExpiresAt < now) {
      return NextResponse.json({ ok: false, error: 'Le code PIN a expiré.' }, { status: 401 });
    }

    const matches = await bcrypt.compare(pin, project.projectAccessPinHash);

    if (!matches) {
      const nextAttempts = (project.projectAccessAttempts || 0) + 1;
      await prisma.project.update({
        where: { id },
        data: {
          projectAccessAttempts: nextAttempts,
          projectAccessLastUsedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: false, error: 'PIN incorrect.' }, { status: 401 });
    }

    await prisma.project.update({
      where: { id },
      data: {
        projectAccessAttempts: 0,
        projectAccessLastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: 'PIN validé.' });
  } catch (error) {
    console.error('POST /api/projects/[id]/access error:', error);
    return NextResponse.json({ ok: false, error: 'Erreur serveur.' }, { status: 500 });
  }
}
