// app/api/services/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        serviceCategory: body.serviceCategory ?? existing.serviceCategory,
        unit: body.unit ?? existing.unit,
        unitPrice: body.unitPrice !== undefined ? parseFloat(body.unitPrice) : existing.unitPrice,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}