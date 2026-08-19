import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth';
import { prisma } from '@/lib/prisma';

// ============================================================
// RÈGLES MÉTIER GÉNÉRALES PAR TYPE DE CHANTIER
// ============================================================
const normalizeText = (value: string | null | undefined) =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MATERIAL_RULES: Record<string, { required: string[]; optional?: string[] }> = {
  carrelage: {
    required: ['carrelage', 'colle a carrelage', 'joint de carrelage', 'croisillons'],
    optional: ['primaire d accrochage', 'mortier de chape', 'resine d etancheite', 'disque de coupe'],
  },
  peinture: {
    required: ['peinture', 'apprêt', 'primaire'],
    optional: ['enduit', 'ruban de masquage', 'papier abrasif'],
  },
  plomberie: {
    required: ['tuyaux', 'raccords', 'joints', 'colliers', 'siphon'],
    optional: ['robinetterie', 'chauffe eau', 'produit d etancheite'],
  },
  electricite: {
    required: ['cables', 'gaines', 'boites de derivation', 'prises', 'interrupteurs', 'disjoncteurs'],
    optional: ['supports', 'domotique', 'cache bornes'],
  },
  menuiserie: {
    required: ['menuiserie', 'vis', 'quincaillerie', 'colle', 'joint'],
    optional: ['vernis', 'traitement bois', 'lame de finition'],
  },
  maconnerie: {
    required: ['ciment', 'mortier', 'brique', 'parpaing', 'chape', 'enduit'],
    optional: ['treillis', 'sable', 'gravier'],
  },
  isolation: {
    required: ['isolant', 'membrane', 'bande adhesif', 'fixations'],
    optional: ['pare vapeur', 'joint de finition'],
  },
  toiture: {
    required: ['couverture', 'sous toiture', 'liteaux', 'fixations', 'etancheite'],
    optional: ['gouttieres', 'cheneaux', 'membrane d etancheite'],
  },
  chauffage: {
    required: ['tuyaux', 'isolant', 'vannes', 'thermostat', 'fluides'],
    optional: ['pompe', 'supports', 'mastic'],
  },
  dalle: {
    required: ['dalle', 'sable', 'gravier', 'sous couche', 'coulis'],
    optional: ['bordure', 'stabilisateur', 'produit de finition'],
  },
  general: {
    required: [],
    optional: [],
  },
};

const detectTrade = (project: any): string => {
  const text = [
    project?.type,
    project?.name,
    project?.description,
    project?.workType,
    project?.floorWork,
    project?.wallWork,
    project?.ceilingWork,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes('carrelage')) return 'carrelage';
  if (text.includes('peinture')) return 'peinture';
  if (text.includes('plomberie')) return 'plomberie';
  if (text.includes('electricite') || text.includes('electricité') || text.includes('electricite')) return 'electricite';
  if (text.includes('menuiserie')) return 'menuiserie';
  if (text.includes('maçonnerie') || text.includes('maconnerie')) return 'maconnerie';
  if (text.includes('isolation')) return 'isolation';
  if (text.includes('toiture')) return 'toiture';
  if (text.includes('chauffage') || text.includes('climatisation')) return 'chauffage';
  if (text.includes('dalle') || text.includes('terrasse')) return 'dalle';

  return 'general';
};

const findProductMatch = (catalog: any[], material: string) => {
  const target = normalizeText(material);

  return catalog.find((product) => {
    const name = normalizeText(product?.name ?? '');
    const category = normalizeText(product?.category ?? '');

    return (
      name.includes(target) ||
      category.includes(target) ||
      target.includes(name) ||
      target.includes(category)
    );
  });
};

export const analyzeProjectRequirements = (project: any, vendorProducts: any[] = []) => {
  const trade = detectTrade(project);
  const rules = MATERIAL_RULES[trade] ?? MATERIAL_RULES.general;

  const required = (rules.required || []).map((material) => {
    const match = findProductMatch(vendorProducts, material);
    return {
      material,
      required: true,
      available: !!match,
      match: match?.name ?? null,
      status: match ? 'available' : 'missing',
    };
  });

  const optional = (rules.optional || []).map((material) => {
    const match = findProductMatch(vendorProducts, material);
    return {
      material,
      required: false,
      available: !!match,
      match: match?.name ?? null,
      status: match ? 'available' : 'optional',
    };
  });

  const missing = required.filter((item) => item.status === 'missing');
  const summary =
    missing.length > 0
      ? `Ce chantier nécessite ${missing.map((item) => item.material).join(', ')}. Ces éléments ne sont pas tous présents dans le catalogue vendeur.`
      : 'Le catalogue couvre bien les éléments requis pour ce type de chantier.';

  return {
    trade,
    required,
    optional,
    summary,
  };
};

// ============================================================
// FALLBACK LOCAL (RÈGLES MÉTIER)
// ============================================================
function getLocalAdvice(project: any, trade: string) {
  const advice = [];
  const items = project.items || [];
  const vendorProducts = items.map((item: any) => item.product).filter(Boolean);
  const analysis = analyzeProjectRequirements(project, vendorProducts);

  if (items.length === 0) {
    advice.push({
      type: 'info',
      title: '📭 Projet vide',
      description: 'Votre projet ne contient encore aucun produit. Ajoutez des éléments pour obtenir des conseils.',
    });
    return { advice };
  }

  const missingRequired = analysis.required.filter((item) => item.status === 'missing');
  if (missingRequired.length > 0) {
    advice.push({
      type: 'warning',
      title: '📦 Matériaux requis manquants',
      description: `Pour un chantier ${analysis.trade}, ces éléments sont nécessaires et absents du catalogue vendeur : ${missingRequired.map((item) => item.material).join(', ')}.`,
      action: 'Ajouter les matériaux indispensables',
    });
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

  return { advice, analysis };
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