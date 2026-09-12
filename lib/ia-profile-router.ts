export type ProfileType = 'artisan' | 'vendeur' | 'promoteur';

export type ProfileDispatch = {
  profile: ProfileType;
  selectedTrades: string[];
  mode: 'catalogue' | 'metier' | 'pilotage';
  systemPrompt: string;
  constraints: string[];
};

export function normalizeProfileType(value?: string | null): ProfileType {
  const raw = String(value ?? '').toLowerCase().trim();

  if (raw.includes('vendeur') || raw.includes('seller') || raw.includes('fournisseur')) return 'vendeur';
  if (raw.includes('promoteur') || raw.includes('pilotage')) return 'promoteur';
  return 'artisan';
}

export function getSelectedTrades(project: any): string[] {
  const metadataTrades = Array.isArray(project?.metadata?.selectedTrades)
    ? project.metadata.selectedTrades
    : Array.isArray(project?.selectedTrades)
      ? project.selectedTrades
      : [];

  const directTrades = Array.isArray(project?.trade)
    ? project.trade
    : Array.isArray(project?.trades)
      ? project.trades
      : [];

  const allTrades = [...metadataTrades, ...directTrades]
    .map((trade) => String(trade).trim())
    .filter(Boolean)
    .filter((trade, index, arr) => arr.indexOf(trade) === index);

  return allTrades;
}

export function resolveProfileDispatch(project: any, fallbackProfile?: ProfileType): ProfileDispatch {
  const profile = normalizeProfileType(fallbackProfile ?? project?.profile ?? project?.role ?? project?.user?.role ?? project?.user?.trade ?? project?.targetRole);
  const selectedTrades = getSelectedTrades(project);

  const base = {
    artisan: {
      profile: 'artisan' as const,
      mode: 'metier' as const,
      systemPrompt: 'Tu es un assistant artisan spécialisé dans la préparation technique du chantier et la production d’un devis exploitable.',
      constraints: [
        'Ne propose que les éléments liés au métier sélectionné.',
        'Calcule les quantités à partir de la surface, des murs et des ouvertures disponibles.',
        'Exclue les produits non nécessaires au chantier réel.',
        'Reste lisible pour un artisan.',
      ],
    },
    vendeur: {
      profile: 'vendeur' as const,
      mode: 'catalogue' as const,
      systemPrompt: 'Tu es un assistant vendeur spécialisé dans l’alignement produit-catalogue et la recommandation de matériaux utiles au devis.',
      constraints: [
        'Ne recommandes que les produits présents dans le catalogue fourni.',
        'Ne mélange pas les métiers non sélectionnés.',
        'Calcule les quantités selon les surfaces et les pièces.',
        'Reste orienté vente, pricing et cohérence de catalogue.',
      ],
    },
    promoteur: {
      profile: 'promoteur' as const,
      mode: 'pilotage' as const,
      systemPrompt: 'Tu es un assistant promoteur spécialisé dans la coordination du projet, la logique de planning et la synthèse de décision.',
      constraints: [
        'Tu synthétises les éléments sans mélange de métiers.',
        'Tu gardes une logique de pilotage et de coordination.',
        'Tu privilégies la lisibilité et le bon sens décisionnel.',
      ],
    },
  }[profile];

  return {
    ...base,
    selectedTrades,
  };
}
