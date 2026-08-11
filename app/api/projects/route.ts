import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth';

const prisma = new PrismaClient();

// GET : récupérer tous les projets de l'utilisateur connecté
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : créer un nouveau projet (avec tous les nouveaux champs)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📦 Body reçu :', body);

    const {
      name,
      budgetEstimate,
      description,
      type,
      surface,
      length,
      width,
      height,
      floorWork,
      wallCount,
      ceilingWork,
      splashback,
      splashHeight,
      renovationType,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        budgetEstimate: budgetEstimate ? parseFloat(budgetEstimate) : null,
        description: description || null,
        type: type || null,
        surface: surface ? parseFloat(surface) : null,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        floorWork: floorWork || null,
        wallCount: wallCount ? parseInt(wallCount) : null,
        ceilingWork: ceilingWork || null,
        splashback: splashback ?? null, // booléen
        splashHeight: splashHeight ? parseFloat(splashHeight) : null,
        renovationType: renovationType || null,
        userId: session.user.id,
        status: 'BROUILLON',
      },
    });

    console.log('✅ Projet créé :', project.id);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur : ' + (error as Error).message },
      { status: 500 }
    );
  }
}