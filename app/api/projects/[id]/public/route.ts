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
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      budgetEstimate: project.budgetEstimate,
      clientName: project.clientName || 'Abdul',
      items: project.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPriceHtAtSale: item.unitPriceHtAtSale,
        product: item.product,
        service: item.service,
      })),
    });
  } catch (error) {
    console.error('GET /api/projects/[id]/public error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
