import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth';
import { prisma } from '@/lib/prisma';

// ============================================================
// FALLBACK LOCAL (RÈGLES MÉTIER)
// ============================================================
function getLocalAdvice(project: any, trade: string) {
  const advice = [];
  const items = project.items || [];

  if (items.length === 0) {
    advice.push({
      type: 'info',
      title: '📭 Projet vide',
      description: 'Votre projet ne contient encore aucun produit. Ajoutez des éléments pour obtenir des conseils.',
    });
    return { advice };
  }

  // Vérification des produits manquants (ex: carrelage sans colle)
  const hasTile = items.some((i: any) => i.product?.category?.toLowerCase().includes('carrelage'));
  const hasGlue = items.some((i: any) => i.product?.name?.toLowerCase().includes('colle') || i.product?.name?.toLowerCase().includes('mortier-colle'));
  if (hasTile && !hasGlue) {
    advice.push({
      type: 'warning',
      title: '🧱 Colle manquante',
      description: 'Vous avez ajouté du carrelage mais pas de colle. Prévoyez environ 5 kg de colle pour 10 m².',
      action: 'Ajouter de la colle',
    });
  }

  // Vérification des prestations de pose
  const hasProduct = items.some((i: any) => i.product);
  const hasInstall = items.some((i: any) => i.service?.name?.toLowerCase().includes('pose') || i.service?.name?.toLowerCase().includes('installation'));
  if (hasProduct && !hasInstall) {
    const tradesWithImplicitInstall = ['carreleur', 'plombier', 'electricien', 'menuisier', 'maçon', 'peintre', 'couvreur'];
    if (!tradesWithImplicitInstall.includes(trade)) {
      advice.push({
        type: 'suggestion',
        title: '🛠️ Pose non incluse',
        description: 'Vous avez ajouté des produits mais aucune prestation de pose. N\'oubliez pas d\'ajouter la main-d\'œuvre.',
        action: 'Ajouter une prestation de pose',
      });
    }
  }

  // Vérification du budget
  if (project.budgetEstimate) {
    const totalHT = items.reduce((sum: number, item: any) => {
      const price = item.unitPriceHtAtSale || 0;
      return sum + price * item.quantity;
    }, 0);
    if (totalHT > 0 && project.budgetEstimate < totalHT) {
      advice.push({
        type: 'warning',
        title: '⚠️ Budget sous-estimé',
        description: `Votre budget (${project.budgetEstimate} €) est inférieur au total HT actuel (${totalHT.toFixed(2)} €).`,
      });
    }
  }

  if (advice.length === 0) {
    advice.push({
      type: 'info',
      title: '✅ Projet équilibré',
      description: 'Votre projet semble complet. Continuez comme ça !',
    });
  }

  return { advice };
}

// ============================================================
// IA EXTERNE (Gemini / Claude) – Modulaire
// ============================================================
async function getExternalAdvice(project: any, trade: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const provider = process.env.IA_PROVIDER || 'gemini';

  if (!apiKey) {
    console.log('ℹ️ Aucune clé API configurée.');
    return null;
  }

  try {
    const prompt = `
Tu es un expert en construction et rénovation, spécialisé dans le métier de "${trade}".

**Projet :** ${project.name}
**Type :** ${project.type || 'Non spécifié'}
**Surface sol :** ${project.surface || 'Non spécifiée'} m²
**Surface murs :** ${project.wallSurface || 'Non spécifiée'} m²
**Budget estimé :** ${project.budgetEstimate || 'Non défini'} €
**Travaux sol :** ${project.floorWork || 'Non spécifié'}
**Travaux murs :** ${project.wallWork || 'Non spécifié'}
**Travaux plafond :** ${project.ceilingWork || 'Non spécifié'}

**Produits déjà ajoutés :**
${project.items?.filter((i: any) => i.product).map((i: any) => `- ${i.product.name} (x${i.quantity})`).join('\n') || 'Aucun'}

**Prestations déjà ajoutées :**
${project.items?.filter((i: any) => i.service).map((i: any) => `- ${i.service.name}`).join('\n') || 'Aucune'}

**Instructions :**
1. Détecte les produits manquants.
2. Vérifie les normes selon le métier.
3. Propose des alternatives moins chères si le budget est serré.
4. Détecte les incohérences (ex: produit sans prestation).
5. Donne des conseils sur la négociation avec les fournisseurs.

**Format de réponse (JSON) :**
{
  "advice": [
    {
      "type": "warning" | "info" | "suggestion" | "alternative",
      "title": "Titre court",
      "description": "Description détaillée",
      "action": "Action à réaliser"
    }
  ]
}
`;

    let response;
    if (provider === 'gemini') {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        }
      );
    } else if (provider === 'claude') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } else {
      throw new Error('Fournisseur IA non supporté');
    }

    if (!response.ok) {
      console.error('Erreur API externe:', await response.text());
      return null;
    }

    const data = await response.json();
    let text = '';
    if (provider === 'gemini') {
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'claude') {
      text = data.content?.[0]?.text || '';
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Erreur IA externe:', error);
    return null;
  }
}

// ============================================================
// ROUTE POST
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
        items: { include: { product: true, service: true } },
        user: true,
      },
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const trade = project.user?.trade || 'généraliste';

    // 1. Essayer l'IA externe
    let result = await getExternalAdvice(project, trade);

    // 2. Fallback local
    if (!result) {
      result = getLocalAdvice(project, trade);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur assistant:', error);
    return NextResponse.json(
      { advice: [{ type: 'info', title: 'Erreur', description: 'Impossible de générer des conseils.' }] },
      { status: 500 }
    );
  }
}