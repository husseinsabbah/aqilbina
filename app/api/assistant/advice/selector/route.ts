import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth';

const prisma = new PrismaClient();

// ============================================================
// SUGGESTION DE PRODUITS EN FONCTION DU PROJET
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    // 1. Récupérer le projet
    const project: any = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    // 2. Récupérer le catalogue de l'utilisateur
    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
    });

    // 3. Initialiser les suggestions
    const suggestions: any[] = [];

    // 3.1 Pour le sol (si carrelage ou peinture)
    if (project.floorWork === 'carrelage' && project.surface) {
      const tileProducts = products.filter(p =>
        p.category?.toLowerCase().includes('carrelage') ||
        p.name?.toLowerCase().includes('carrelage')
      );
      if (tileProducts.length > 0) {
        suggestions.push({
          area: 'sol',
          label: 'Sol',
          surface: project.surface,
          unit: 'm²',
          recommendedProducts: tileProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.salePrice,
            stock: p.stock,
            imageUrl: p.imageUrl,
          })),
        });
      }
    }

    // 3.2 Pour les murs (si carrelage ou peinture)
    if (project.wallCount && project.wallCount > 0 && project.height && project.length && project.width) {
      // Calcul de la surface des murs à traiter
      const perimeter = 2 * (project.length + project.width);
      const wallSurface = perimeter * project.height * (project.wallCount / 4);
      if (project.ceilingWork === 'carrelage' || project.ceilingWork === 'peinture') {
        // On pourrait proposer de la faïence ou de la peinture murale
        const wallProducts = products.filter(p =>
          p.category?.toLowerCase().includes('faïence') ||
          p.category?.toLowerCase().includes('mural') ||
          p.name?.toLowerCase().includes('peinture murale')
        );
        if (wallProducts.length > 0) {
          suggestions.push({
            area: 'murs',
            label: `Murs (${project.wallCount} mur(s))`,
            surface: wallSurface,
            unit: 'm²',
            recommendedProducts: wallProducts.map(p => ({
              id: p.id,
              name: p.name,
              price: p.salePrice,
              stock: p.stock,
              imageUrl: p.imageUrl,
            })),
          });
        }
      }
    }

    // 3.3 Pour le plafond
    if (project.ceilingWork === 'peinture' && project.surface) {
      const paintProducts = products.filter(p =>
        p.category?.toLowerCase().includes('peinture') ||
        p.name?.toLowerCase().includes('peinture')
      );
      if (paintProducts.length > 0) {
        suggestions.push({
          area: 'plafond',
          label: 'Plafond',
          surface: project.surface,
          unit: 'm²',
          recommendedProducts: paintProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.salePrice,
            stock: p.stock,
            imageUrl: p.imageUrl,
          })),
        });
      }
    }

    // 3.4 Pour la crédence
    if (project.splashback && project.splashHeight && project.length && project.width) {
      const splashSurface = (project.length + project.width) * (project.splashHeight / 100);
      const splashProducts = products.filter(p =>
        p.category?.toLowerCase().includes('carrelage') ||
        p.name?.toLowerCase().includes('faïence')
      );
      if (splashProducts.length > 0) {
        suggestions.push({
          area: 'credence',
          label: 'Crédence',
          surface: splashSurface,
          unit: 'm²',
          recommendedProducts: splashProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.salePrice,
            stock: p.stock,
            imageUrl: p.imageUrl,
          })),
        });
      }
    }

    // 4. Si aucune suggestion, message
    if (suggestions.length === 0) {
      return NextResponse.json({
        message: 'Aucun produit suggéré. Vérifiez que votre catalogue contient des produits adaptés à ce projet.',
        suggestions: [],
      });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Selector error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}