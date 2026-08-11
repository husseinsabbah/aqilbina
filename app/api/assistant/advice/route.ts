import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// NORMALISER LE TYPE DE PROJET (correction des fautes de frappe)
// ============================================================
function normalizeProjectType(input: string): string {
  const corrections: Record<string, string> = {
    'cuicine': 'cuisine',
    'cuisene': 'cuisine',
    'cuizine': 'cuisine',
    'sdb': 'sdb',
    'sd b': 'sdb',
    'terrasse': 'terrasse',
    'terace': 'terrasse',
    'jardin': 'jardin',
    'jardain': 'jardin',
    'salon': 'salon',
    'chambre': 'chambre',
    'bureau': 'bureau',
  };
  const normalized = input.toLowerCase().trim();
  return corrections[normalized] || normalized;
}

// ============================================================
// FONCTION PRINCIPALE D'ANALYSE AVEC LES MODÈLES
// ============================================================
async function analyzeProjectWithTemplate(project: any, trade: string) {
  const advice: any[] = [];
  const items = project.items || [];

  // 1. Récupérer le modèle correspondant (type + trade)
  const template = await prisma.projectTemplate.findFirst({
    where: {
      type: project.type,
      trade: trade,
      isActive: true,
    },
    include: {
      items: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!template) {
    advice.push({
      type: 'info',
      title: '📋 Aucun modèle disponible',
      description: `Aucun modèle de projet trouvé pour "${project.type}" et le métier "${trade}". Vous pouvez créer un modèle personnalisé ou continuer manuellement.`,
    });
    return advice;
  }

  // 2. Vérification de la surface par rapport au modèle
  if (project.surface && template.surfaceMin && template.surfaceMax) {
    const surface = project.surface;
    if (surface < template.surfaceMin) {
      advice.push({
        type: 'warning',
        title: '📏 Surface inférieure aux recommandations',
        description: `La surface du projet (${surface} m²) est inférieure à la surface minimale recommandée pour ce type de projet (${template.surfaceMin} m²).`,
      });
    } else if (surface > template.surfaceMax) {
      advice.push({
        type: 'info',
        title: '📏 Surface supérieure aux recommandations',
        description: `La surface du projet (${surface} m²) est supérieure à la surface maximale recommandée pour ce type de projet (${template.surfaceMax} m²). Vous devrez peut-être adapter les quantités.`,
      });
    }
  }

  // 3. Comparer les produits du projet avec les items du modèle
  const productNames = items
    .filter((i: any) => i.product)
    .map((i: any) => i.product?.name?.toLowerCase() || '');

  // 3.1 Éléments manquants
  const missingItems = template.items.filter((templateItem: any) => {
    const isMatch = productNames.some((name: string) =>
      name.includes(templateItem.name.toLowerCase()) ||
      templateItem.name.toLowerCase().includes(name)
    );
    return !isMatch && templateItem.isRequired;
  });

  if (missingItems.length > 0) {
    const missingList = missingItems.map((item: any) =>
      `- ${item.name} (${item.quantity} ${item.unit})`
    ).join('\n');
    advice.push({
      type: 'warning',
      title: '🧩 Éléments essentiels manquants',
      description: `Il manque des éléments nécessaires pour ce projet :\n${missingList}`,
      action: 'Ajouter les éléments manquants',
      missingItems: missingItems,
    });
  }

  // 3.2 Vérification des quantités
  for (const item of items) {
    if (item.product) {
      const templateItem = template.items.find((t: any) =>
        item.product?.name?.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(item.product?.name?.toLowerCase())
      );

      if (templateItem && templateItem.quantity) {
        const currentQty = item.quantity || 0;
        const recommendedQty = templateItem.quantity;

        if (Math.abs(currentQty - recommendedQty) / recommendedQty > 0.2) {
          advice.push({
            type: currentQty < recommendedQty ? 'warning' : 'info',
            title: currentQty < recommendedQty ? '📉 Quantité insuffisante' : '📈 Quantité excessive',
            description: `Pour "${item.product.name}", vous avez ${currentQty} ${templateItem.unit || 'unités'}. La quantité recommandée est de ${recommendedQty} ${templateItem.unit || 'unités'}.`,
            action: currentQty < recommendedQty ? `Ajouter ${recommendedQty - currentQty} ${templateItem.unit || 'unités'}` : undefined,
          });
        }
      }
    }
  }

  // 4. Vérification du budget
  if (project.budgetEstimate) {
    const estimatedTotal = template.items.reduce((sum: number, item: any) =>
      sum + (item.estimatedPrice || 0) * item.quantity, 0
    );

    if (estimatedTotal > 0) {
      const ratio = project.budgetEstimate / estimatedTotal;
      if (ratio < 0.7) {
        advice.push({
          type: 'warning',
          title: '⚠️ Budget sous-estimé',
          description: `Votre budget de ${project.budgetEstimate} € est inférieur au coût estimé des matériaux (environ ${Math.round(estimatedTotal)} €). Vous pourriez avoir besoin d'ajuster votre budget ou choisir des alternatives moins chères.`,
        });
      } else if (ratio > 1.3) {
        advice.push({
          type: 'suggestion',
          title: '💰 Budget confortable',
          description: `Votre budget de ${project.budgetEstimate} € est supérieur à l'estimation des matériaux (environ ${Math.round(estimatedTotal)} €). Vous avez de la marge pour des finitions de qualité supérieure.`,
        });
      }
    }
  }

  // 5. Détection des incohérences (pose non incluse) - adapté au métier
  const hasProduct = items.some((i: any) => i.product);
  const hasInstall = items.some((i: any) => i.service?.name?.toLowerCase().includes('pose') || i.service?.name?.toLowerCase().includes('installation'));

  // Métiers où la pose est implicite
  const tradesWithImplicitInstall = ['carreleur', 'plombier', 'electricien', 'menuisier', 'maçon', 'peintre', 'couvreur'];

  if (hasProduct && !hasInstall && !tradesWithImplicitInstall.includes(trade)) {
    advice.push({
      type: 'info',
      title: '⚠️ Pose non incluse',
      description: 'Vous avez ajouté des produits mais aucune prestation de pose ou d\'installation. N\'oubliez pas d\'ajouter la main-d\'œuvre.',
      action: 'Ajouter une prestation de pose',
    });
  }

  // 6. Estimation main-d'œuvre pour les carreleurs
  if (trade === 'carreleur') {
    // Calculer la surface totale de carrelage (à partir des produits du projet)
    let totalSurface = 0;
    const tileItems = items.filter((i: any) =>
      i.product?.category?.toLowerCase().includes('carrelage') ||
      i.product?.name?.toLowerCase().includes('carrelage')
    );
    for (const item of tileItems) {
      totalSurface += item.quantity || 0;
    }
    // Si aucune surface trouvée, utiliser la surface du projet
    if (totalSurface === 0 && project.surface) {
      totalSurface = project.surface;
    }

    if (totalSurface > 0) {
      const speedPerHour = 5; // m²/h (par défaut)
      const hourlyRate = 20; // €/h (par défaut)
      const hours = totalSurface / speedPerHour;
      const laborCost = hours * hourlyRate;
      advice.push({
        type: 'suggestion',
        title: '⏱️ Estimation main-d\'œuvre',
        description: `Pour ${totalSurface.toFixed(1)} m² de carrelage, comptez environ ${hours.toFixed(1)} heures de travail (${speedPerHour} m²/h). Coût estimé de la main-d'œuvre : ${Math.round(laborCost)} € (${hourlyRate} €/h).`,
        action: 'Ajouter une prestation de pose',
      });
    }
  }

  // 7. Produits sans catégorie
  const uncategorized = items.filter((i: any) => i.product && !i.product.category);
  if (uncategorized.length > 0) {
    const names = uncategorized.map((i: any) => i.product.name).join(', ');
    advice.push({
      type: 'info',
      title: '🏷️ Produits sans catégorie',
      description: `Certains produits n'ont pas de catégorie définie : ${names}. Cela peut aider à mieux organiser votre devis.`,
      action: 'Définir une catégorie pour ces produits',
    });
  }

  // 8. Si aucun conseil n'a été ajouté, message positif
  if (advice.length === 0) {
    advice.push({
      type: 'info',
      title: '✅ Projet bien équilibré',
      description: `Votre projet "${project.name}" est bien structuré et respecte les standards pour une ${project.type}. Continuez comme ça !`,
    });
  }

  return advice;
}

// ============================================================
// FALLBACK LOCAL (RÈGLES MÉTIER SIMPLES)
// ============================================================
function generateLocalAdvice(trade: string, items: any[], projectName: string) {
  const advice = [];

  if (items.length === 0) {
    advice.push({
      type: 'info',
      title: '📭 Projet vide',
      description: 'Votre projet ne contient encore aucun produit ni prestation. Commencez par ajouter des éléments depuis l\'onglet "Devis".',
      action: 'Ajouter des produits ou prestations',
    });
    return advice;
  }

  const productCount = items.filter(i => i.product).length;
  const serviceCount = items.filter(i => i.service).length;

  if (productCount > 0 && serviceCount === 0) {
    advice.push({
      type: 'suggestion',
      title: '🛠️ Main-d\'œuvre manquante',
      description: 'Vous avez ajouté des produits mais aucune prestation de pose ou d\'installation. Pensez à ajouter la main-d\'œuvre pour que votre devis soit complet.',
      action: 'Ajouter une prestation (ex: pose, installation)',
    });
  }

  // Règles métier basiques
  const hasTile = items.some(i => i.product?.category?.toLowerCase().includes('carrelage'));
  if (hasTile) {
    const hasGlue = items.some(i => i.product?.name?.toLowerCase().includes('colle') || i.product?.name?.toLowerCase().includes('mortier-colle'));
    if (!hasGlue) {
      advice.push({
        type: 'warning',
        title: '🧱 Colle et joints manquants',
        description: 'Vous avez ajouté du carrelage mais pas de colle ni de joints. Prévoyez environ 5 kg de colle et 2 kg de joints pour 10 m².',
        action: 'Ajouter la colle et les joints',
      });
    }
  }

  if (trade === 'électricien') {
    const hasCables = items.some(i => i.product?.name?.toLowerCase().includes('câble') || i.product?.name?.toLowerCase().includes('filaire'));
    if (!hasCables && productCount > 0) {
      advice.push({
        type: 'info',
        title: '⚡ Câbles et gaines',
        description: 'Vérifiez que vous avez bien inclus les câbles, gaines et accessoires de fixation nécessaires à votre installation électrique.',
      });
    }
  }

  if (trade === 'plombier') {
    const hasPipe = items.some(i => i.product?.name?.toLowerCase().includes('tube') || i.product?.name?.toLowerCase().includes('tuyau'));
    if (!hasPipe && productCount > 0) {
      advice.push({
        type: 'info',
        title: '🔧 Tuyauterie',
        description: 'Vérifiez que vous avez bien prévu les tubes, raccords et accessoires de plomberie nécessaires.',
      });
    }
  }

  if (advice.length === 0) {
    advice.push({
      type: 'info',
      title: '✅ Projet bien équilibré',
      description: `Votre projet "${projectName}" semble complet. Continuez comme ça !`,
    });
  }

  return advice;
}

// ============================================================
// ROUTE POST PRINCIPALE
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: {
            product: true,
            service: true,
          },
        },
      },
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: project.userId },
    });
    const trade = user?.trade || 'généraliste';

    // Si le projet a un type, on essaie d'utiliser le modèle
    if (project.type) {
      const originalType = project.type;
      const normalizedType = normalizeProjectType(originalType);
      
      // Si le type a été corrigé, on met à jour le projet dans la base
      if (normalizedType !== originalType) {
        await prisma.project.update({
          where: { id: project.id },
          data: { type: normalizedType },
        });
        console.log(`🔧 Type corrigé : "${originalType}" → "${normalizedType}"`);
        project.type = normalizedType;
      }

      const modelAdvice = await analyzeProjectWithTemplate(project, trade);
      if (modelAdvice && modelAdvice.length > 0) {
        return NextResponse.json({ advice: modelAdvice });
      }
    }

    // Fallback : règles métier simples
    const fallbackAdvice = generateLocalAdvice(trade, project.items, project.name);
    return NextResponse.json({ advice: fallbackAdvice });
  } catch (error) {
    console.error('Assistant error:', error);
    return NextResponse.json(
      { advice: [{ type: 'info', title: 'Erreur', description: 'Impossible de générer des conseils pour le moment.' }] },
      { status: 500 }
    );
  }
}