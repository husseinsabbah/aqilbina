// lib/trade-rules.ts

type WorkTypeOption = {
  value: string;
  label: string;
};

type ProfessionalFamily =
  | "conception"
  | "technique"
  | "execution"
  | "commercial"
  | "finance"
  | "juridique"
  | "reglementation"
  | "pilotage"
  | "social"
  | "autre";

type TradeRules = {
  family: ProfessionalFamily;
  projectTypes: string[];
  workTypes: WorkTypeOption[];
  surfaces: string[];
  units: string[];
};

type TradeRulesInput = Omit<TradeRules, "family"> & {
  family?: ProfessionalFamily;
};

const professionalFamilyByRole: Record<string, ProfessionalFamily> = {
  artisan: "execution",
  vendeur: "commercial",
  vendeurproduit: "commercial",
  seller: "commercial",
  promoteur: "pilotage",
  architecte: "conception",
  urbaniste: "conception",
  paysagiste: "conception",
  bureau_detude: "technique",
  bureau_d_etude: "technique",
  bureauetude: "technique",
  cabinet: "technique",
  banque: "finance",
  organisme_de_pret: "finance",
  assurance: "finance",
  notaire: "juridique",
  juriste: "juridique",
  mairie: "reglementation",
  amenageur: "social",
  bailleur_social: "social",
  agence_immobiliere: "commercial",
  mandataire: "commercial",
  gestionnaire: "pilotage",
};

export const professionalFamilies: Array<{ value: ProfessionalFamily; label: string; description: string }> = [
  { value: "conception", label: "Conception", description: "Architecte, urbaniste, paysagiste, architecture intérieure" },
  { value: "technique", label: "Technique", description: "Bureau d’étude, ingénierie, calcul, structure" },
  { value: "execution", label: "Exécution / chantier", description: "Artisans, corps de métiers, entreprises de travaux" },
  { value: "commercial", label: "Commercial / vente", description: "Vendeurs, fournisseurs, distributeurs, agences" },
  { value: "finance", label: "Finance", description: "Banques, prêts, assurances, investisseurs" },
  { value: "juridique", label: "Juridique / administratif", description: "Notaire, juriste, dossiers légaux" },
  { value: "reglementation", label: "Réglementation", description: "Mairie, autorisations, conformité locale" },
  { value: "pilotage", label: "Pilotage / promotion", description: "Promoteur, gestion de projet, coordination" },
  { value: "social", label: "Social / aménagement", description: "Aménageurs, bailleurs, logement social" },
  { value: "autre", label: "Autre", description: "Autres profils non classés" },
];

export const projectActorRoles = ["all", "artisan", "vendeur", "promoteur"] as const;
export type ProjectActorRole = (typeof projectActorRoles)[number];

export function normalizeProjectActorRole(role?: string | null): ProjectActorRole {
  const normalized = (role || "").toLowerCase().trim();
  if (normalized === "all" || normalized === "tous" || normalized === "tout") return "all";
  if (normalized === "artisan" || normalized === "artisans") return "artisan";
  if (normalized === "vendeur" || normalized === "vendeurs" || normalized === "seller" || normalized === "fournisseur") return "vendeur";
  if (normalized === "promoteur" || normalized === "promoteurs" || normalized === "gestionnaire" || normalized === "pilotage") return "promoteur";
  return "artisan";
}

export function getBroadcastTargetRoles(role?: string | null): ProjectActorRole[] {
  const normalizedRole = normalizeProjectActorRole(role);
  if (normalizedRole === "all") return ["artisan", "vendeur", "promoteur"];
  return [normalizedRole];
}

export const projectActorCatalog = {
  all: {
    role: "all",
    family: "autre",
    familyLabel: "Tous profils",
    label: "Tous profils",
    decisionLevel: "client",
    description: "Le client reçoit l’offre de la meilleure combinaison d’acteurs selon le besoin.",
    delegate: "Client / décideur principal",
    recipientType: "multi",
  },
  artisan: {
    role: "artisan",
    family: "execution",
    familyLabel: "Exécution / chantier",
    label: "Artisan",
    decisionLevel: "terrain",
    description: "Le métier de terrain exécute les travaux et valide les contraintes techniques du chantier.",
    delegate: "Chef d’équipe / artisan responsable",
    recipientType: "artisan",
  },
  vendeur: {
    role: "vendeur",
    family: "commercial",
    familyLabel: "Commercial / vente",
    label: "Vendeur",
    decisionLevel: "approvisionnement",
    description: "Le vendeur apporte les matériaux, le stock, la logistique et la conformité commerciale.",
    delegate: "Commercial / gestionnaire de compte",
    recipientType: "vendeur",
  },
  promoteur: {
    role: "promoteur",
    family: "pilotage",
    familyLabel: "Pilotage / promotion",
    label: "Promoteur",
    decisionLevel: "pilotage",
    description: "Le promoteur coordonne les acteurs, fixe les priorités, pilote le programme et supervise la décision finale.",
    delegate: "Chef de projet / promoteur / directeur de programme",
    recipientType: "promoteur",
  },
} as const;

export function getActorTaxonomy(role?: string | null, trade?: string | null) {
  const normalizedRole = normalizeProjectActorRole(role);
  const family = getProfessionalFamilyByRole(normalizedRole, trade);
  const familyLabel = getProfessionalFamilyLabel(family);

  const catalogEntry =
    normalizedRole === "all"
      ? projectActorCatalog.all
      : normalizedRole === "artisan"
        ? projectActorCatalog.artisan
        : normalizedRole === "vendeur"
          ? projectActorCatalog.vendeur
          : projectActorCatalog.promoteur;

  return {
    role: normalizedRole,
    family,
    familyLabel,
    roleLabel: catalogEntry.label,
    decisionLevel: catalogEntry.decisionLevel,
    description: catalogEntry.description,
    delegate: catalogEntry.delegate,
    recipientType: catalogEntry.recipientType,
    label: catalogEntry.label,
  };
}

export function buildProjectActorNetwork(role?: string | null, trade?: string | null) {
  const actor = getActorTaxonomy(role, trade);
  const family = actor.family;

  return {
    actor,
    family,
    supportedBy:
      family === "execution"
        ? ["artisan", "bureau d’étude", "promoteur"]
        : family === "commercial"
          ? ["vendeur", "logistique", "commercial"]
          : family === "pilotage"
            ? ["promoteur", "chef de projet", "coordination chantier"]
            : ["conseil", "expert", "gestionnaire"],
    humanDelegate: actor.delegate,
    decisionOwner:
      actor.role === "promoteur" ? "promoteur / pilote du programme" : actor.role === "vendeur" ? "commercial responsable" : actor.role === "artisan" ? "artisan responsable" : "client",
  };
}

// --- DÉFINITION DES RÈGLES PAR MÉTIER (NORMALISÉES) ---
const tradeRulesMap: Record<string, TradeRulesInput> = {
  // ===================================================================
  // ARTISANS
  // ===================================================================

  carreleur: {
    family: "execution",
    projectTypes: ["Rénovation", "Rafraîchissement", "Construction neuve", "Aménagement"],
    workTypes: [
      // SCÉNARIO LOURD (Dépose + pose)
      { value: "renovation-complete-depose", label: "Rénovation complète (dépose + pose)" },
      { value: "pose-carrelage-neuf", label: "Pose de carrelage neuf (sur chape préparée)" },
      { value: "pose-faience", label: "Pose de faïence (cuisine / salle de bain)" },
      { value: "terrasse-exterieure", label: "Pose de terrasse extérieure (pente + gel)" },
      // SCÉNARIO LÉGER (Sans dépose / rafraîchissement)
      { value: "rejointoiement", label: "Rafraîchissement (rejointoiement des carreaux existants)" },
      { value: "lustrage-nettoyage", label: "Lustrage / nettoyage professionnel du carrelage" },
      { value: "pose-sans-depose", label: "Pose sur ancien carrelage (sans dépose)" },
      { value: "resecondage", label: "Réfection / reprise de surface (ponçage, ragréage fin)" },
    ],
    surfaces: ["Sol", "Mur", "Douche", "Terrasse", "Balcon", "Escalier"],
    units: ["m²", "ml", "u"],
  },

  plombier: {
    family: "execution",
    projectTypes: ["Gros œuvre", "Dépannage / Entretien", "Rénovation"],
    workTypes: [
      // LOURD
      { value: "remplacement-colonne", label: "Remplacement colonne d'eau / tuyauterie (tranchée)" },
      { value: "installation-chauffage", label: "Installation complète chauffage (radiateurs, chaudière)" },
      { value: "installation-sanitaire-neuf", label: "Installation sanitaire complète (SdB, cuisine)" },
      // LÉGER
      { value: "depannage-robinet", label: "Dépannage / remplacement robinet (simple)" },
      { value: "purge-chauffage", label: "Purge / entretien chauffage" },
      { value: "reparation-fuite", label: "Réparation fuite (sans démolition)" },
    ],
    surfaces: ["Salle de bain", "Cuisine", "Chauffage", "Extérieur", "Sous-sol"],
    units: ["u", "m", "ml"],
  },

  electricien: {
    family: "execution",
    projectTypes: ["Rénovation", "Construction neuve", "Mise aux normes", "Dépannage"],
    workTypes: [
      // LOURD
      { value: "reinstallation-complete", label: "Rénovation complète de l'installation électrique" },
      { value: "mise-aux-normes-lourde", label: "Mise aux normes (refonte tableau, câblage)" },
      { value: "domotique-complete", label: "Installation domotique intégrale" },
      // LÉGER
      { value: "depannage-electrique", label: "Dépannage / remplacement (prises, interrupteurs)" },
      { value: "ajout-points", label: "Ajout de points lumineux ou prises" },
      { value: "remplacement-tableau", label: "Remplacement de tableau électrique (simple)" },
    ],
    surfaces: ["Logement", "Bureau", "Commerce", "Extérieur", "Garage"],
    units: ["point", "m", "u"],
  },

  peintre: {
    family: "execution",
    projectTypes: ["Rénovation", "Rafraîchissement", "Construction neuve", "Ravalement"],
    workTypes: [
      // LOURD
      { value: "ravalement-complet", label: "Ravalement complet (décapage, ponçage, sous-couche)" },
      { value: "peinture-neuve", label: "Peinture neuve sur support brut (plusieurs couches)" },
      // LÉGER
      { value: "rafraichissement", label: "Rafraîchissement (simple couche de finition)" },
      { value: "pose-papier-peint", label: "Pose de papier peint (sans préparation lourde)" },
    ],
    surfaces: ["Mur", "Plafond", "Menuiserie", "Façade", "Salle de bain"],
    units: ["m²", "u"],
  },

  menuisier: {
    family: "execution",
    projectTypes: ["Sur-mesure", "Rénovation", "Construction neuve", "Agrandissement"],
    workTypes: [
      // LOURD
      { value: "agencement-complet", label: "Agencement sur mesure (cuisine, dressing, bibliothèque)" },
      { value: "pose-portes-fenetres", label: "Pose de portes / fenêtres (avec dépose ancien)" },
      // LÉGER
      { value: "reparation", label: "Réparation / réglage de menuiserie existante" },
      { value: "pose-parquet", label: "Pose de parquet / lambris (sans sous-couche)" },
    ],
    surfaces: ["Pièce", "Cuisine", "Chambre", "Salon", "Extérieur"],
    units: ["m²", "ml", "u"],
  },

  maçon: {
    family: "execution",
    projectTypes: ["Gros œuvre", "Rénovation", "Construction neuve", "Agrandissement"],
    workTypes: [
      // LOURD
      { value: "fondations", label: "Fondations / terrassement (gros œuvre)" },
      { value: "elevation-murs", label: "Élévation de murs (parpaings, briques)" },
      // LÉGER
      { value: "renovation-maconnerie", label: "Rénovation / reprise de maçonnerie" },
      { value: "petits-travaux", label: "Petits travaux (scellement, rebouchage)" },
    ],
    surfaces: ["Extérieur", "Sous-sol", "Étage", "Terrain"],
    units: ["m²", "m³", "m"],
  },

  couvreur: {
    family: "execution",
    projectTypes: ["Rénovation", "Construction neuve", "Réparation"],
    workTypes: [
      // LOURD
      { value: "toiture-neuve", label: "Pose de toiture neuve (charpente + couverture)" },
      { value: "retoiture", label: "Réfection complète de toiture (dépose + pose)" },
      // LÉGER
      { value: "reparation-toiture", label: "Réparation de toiture (tuiles, ardoises)" },
      { value: "nettoyage-toiture", label: "Nettoyage / démoussage de toiture" },
    ],
    surfaces: ["Toiture", "Terrasse", "Façade"],
    units: ["m²", "ml"],
  },

  terrassier: {
    family: "execution",
    projectTypes: ["Construction neuve", "Agrandissement", "Aménagement extérieur"],
    workTypes: [
      // LOURD
      { value: "terrassement-complet", label: "Terrassement / excavation (gros volumes)" },
      { value: "fondations-profondes", label: "Fondations profondes (pieux, semelles)" },
      // LÉGER
      { value: "nivellement", label: "Nivellement / préparation de terrain" },
      { value: "voirie", label: "Voirie / allées / parkings (petites surfaces)" },
    ],
    surfaces: ["Terrain", "Allée", "Jardin"],
    units: ["m²", "m³", "m"],
  },

  renovation: {
    family: "execution",
    projectTypes: ["Rénovation complète", "Ravalement", "Réhabilitation"],
    workTypes: [
      // LOURD
      { value: "renovation-complete", label: "Rénovation complète (clé en main)" },
      { value: "rehabilitation", label: "Réhabilitation de bâtiment (lourde)" },
      // LÉGER
      { value: "ravalement-facade", label: "Ravalement de façade (nettoyage, enduit)" },
      { value: "mise-aux-normes", label: "Mise aux normes (accessibilité, sécurité)" },
    ],
    surfaces: ["Logement", "Façade", "Bâtiment"],
    units: ["m²", "u"],
  },

  platrier: {
    family: "execution",
    projectTypes: ["Rénovation", "Construction neuve", "Aménagement"],
    workTypes: [
      // LOURD
      { value: "faux-plafond-complet", label: "Pose de faux-plafonds (structure + placo)" },
      { value: "cloison-complete", label: "Pose de cloisons sèches (montants + placo)" },
      // LÉGER
      { value: "reparation-platre", label: "Réparation de plâtre / enduit" },
      { value: "retouche", label: "Retouches / finitions (petites surfaces)" },
    ],
    surfaces: ["Pièce", "Mur", "Plafond"],
    units: ["m²", "ml"],
  },

  chauffagiste: {
    family: "execution",
    projectTypes: ["Construction neuve", "Rénovation", "Dépannage"],
    workTypes: [
      // LOURD
      { value: "installation-chaudiere", label: "Installation / remplacement chaudière (avec réseau)" },
      { value: "pompe-a-chaleur", label: "Pose pompe à chaleur (système complet)" },
      // LÉGER
      { value: "entretien-chauffage", label: "Entretien annuel / révision" },
      { value: "depannage-chaudiere", label: "Dépannage chaudière (simple)" },
    ],
    surfaces: ["Logement", "Bureau", "Commerce"],
    units: ["u", "m"],
  },

  vitrier: {
    family: "execution",
    projectTypes: ["Rénovation", "Construction neuve", "Dépannage"],
    workTypes: [
      // LOURD
      { value: "pose-vitrage-neuf", label: "Pose de vitrage / double vitrage (neuf)" },
      { value: "miroiterie", label: "Miroiterie (sur mesure)" },
      // LÉGER
      { value: "depannage-vitrier", label: "Dépannage / remplacement (urgence)" },
      { value: "reparation-vitrage", label: "Réparation de vitrage (sans dépose totale)" },
    ],
    surfaces: ["Fenêtre", "Porte", "Façade", "Intérieur"],
    units: ["u", "m²"],
  },

  serrurier: {
    family: "execution",
    projectTypes: ["Dépannage", "Rénovation", "Construction neuve"],
    workTypes: [
      // LOURD
      { value: "installation-securite", label: "Installation de sécurité (porte blindée, alarme)" },
      // LÉGER
      { value: "depannage-serrure", label: "Dépannage (porte bloquée, remplacement de cylindre)" },
      { value: "pose-serrure", label: "Pose / remplacement de serrure (simple)" },
    ],
    surfaces: ["Porte", "Intérieur", "Extérieur"],
    units: ["u", "m"],
  },

  ferronnier: {
    family: "execution",
    projectTypes: ["Construction neuve", "Rénovation", "Sur-mesure"],
    workTypes: [
      // LOURD
      { value: "portail-sur-mesure", label: "Fabrication / pose portail (sur mesure)" },
      { value: "structure-metal", label: "Structure métallique / charpente (lourde)" },
      // LÉGER
      { value: "rambarde", label: "Rambarde / garde-corps (pose simple)" },
      { value: "reparation-metal", label: "Réparation / soudure (petites interventions)" },
    ],
    surfaces: ["Extérieur", "Escalier", "Balcon"],
    units: ["ml", "u", "m²"],
  },

  etancheite: {
    family: "execution",
    projectTypes: ["Construction neuve", "Rénovation", "Réparation"],
    workTypes: [
      // LOURD
      { value: "toiture-terrasse", label: "Étanchéité toiture terrasse (système complet)" },
      { value: "sous-sol", label: "Étanchéité sous-sol / cave (lourde)" },
      // LÉGER
      { value: "reparation-membrane", label: "Réparation membrane d'étanchéité" },
      { value: "resecondage", label: "Rejointoiement / ressuage (petites surfaces)" },
    ],
    surfaces: ["Toit", "Terrasse", "Sous-sol", "Mur"],
    units: ["m²", "ml"],
  },

  forestier: {
    family: "execution",
    projectTypes: ["Entretien", "Débroussaillage", "Exploitation"],
    workTypes: [
      // LOURD
      { value: "abattage", label: "Abattage d'arbres (gros volumes)" },
      { value: "debroussaillage", label: "Débroussaillage / broyage (lourd)" },
      // LÉGER
      { value: "plantations", label: "Plantations / reboisement (petites surfaces)" },
      { value: "taille", label: "Taille / élagage (léger)" },
    ],
    surfaces: ["Terrain", "Parcelle", "Jardin"],
    units: ["ha", "m²", "u"],
  },

  generaliste: {
    family: "execution",
    projectTypes: ["Rénovation", "Construction neuve", "Aménagement", "Entretien"],
    workTypes: [
      // LOURD
      { value: "multi-travaux", label: "Travaux multiservices (lourds)" },
      // LÉGER
      { value: "petits-travaux", label: "Petits travaux / dépannage (léger)" },
      { value: "amenagement-general", label: "Aménagement général (simple)" },
    ],
    surfaces: ["Intérieur", "Extérieur", "Pièce", "Terrain"],
    units: ["m²", "u", "ml"],
  },

  // ===================================================================
  // VENDEURS
  // ===================================================================

  materiaux: {
    family: "commercial",
    projectTypes: ["Livraison", "Approvisionnement chantier", "Gros œuvre"],
    workTypes: [
      { value: "livraison-materiaux", label: "Livraison de matériaux (gros volumes)" },
      { value: "stockage", label: "Service de stockage" },
      { value: "conseil-technique", label: "Conseil technique (choix des matériaux)" },
    ],
    surfaces: ["Chantier", "Entrepôt"],
    units: ["t", "m³", "palette"],
  },

  sanitaire: {
    family: "commercial",
    projectTypes: ["Livraison", "Installation", "Remplacement"],
    workTypes: [
      { value: "livraison-sanitaire", label: "Livraison équipements sanitaires" },
      { value: "conseil-sanitaire", label: "Conseil technique en sanitaire" },
    ],
    surfaces: ["Salle de bain", "Cuisine"],
    units: ["u"],
  },

  quincaillerie: {
    family: "commercial",
    projectTypes: ["Approvisionnement", "Renfort", "Sécurisation"],
    workTypes: [
      { value: "fourniture-quincaillerie", label: "Fourniture quincaillerie" },
      { value: "conseil-fixation", label: "Conseil en fixation" },
    ],
    surfaces: ["Atelier", "Chantier"],
    units: ["u", "kg"],
  },

  menuiserie: {
    family: "commercial",
    projectTypes: ["Livraison", "Sur-mesure", "Agencement"],
    workTypes: [
      { value: "fourniture-bois", label: "Fourniture de bois et panneaux" },
      { value: "decoupe", label: "Découpe sur mesure" },
      { value: "conseil", label: "Conseil technique" },
    ],
    surfaces: ["Atelier", "Chantier"],
    units: ["m²", "m", "u"],
  },

  isolation: {
    family: "commercial",
    projectTypes: ["Rénovation", "Construction neuve", "Performance énergétique"],
    workTypes: [
      { value: "fourniture-isolation", label: "Fourniture matériaux d'isolation" },
      { value: "conseil-isolation", label: "Conseil technique en isolation" },
    ],
    surfaces: ["Mur", "Toit", "Plancher"],
    units: ["m²", "u"],
  },

  outillage: {
    family: "commercial",
    projectTypes: ["Location", "Vente", "Réparation"],
    workTypes: [
      { value: "vente-outillage", label: "Vente d'outillage" },
      { value: "location-outillage", label: "Location d'outillage" },
      { value: "entretien-outillage", label: "Entretien / réparation" },
    ],
    surfaces: ["Atelier", "Chantier"],
    units: ["u", "jour"],
  },

  decoration: {
    family: "commercial",
    projectTypes: ["Rénovation", "Aménagement", "Conseil"],
    workTypes: [
      { value: "fourniture-decoration", label: "Fourniture décoration (papier peint, sols)" },
      { value: "conseil-deco", label: "Conseil en décoration" },
    ],
    surfaces: ["Intérieur", "Mur", "Sol"],
    units: ["m²", "u"],
  },

  // ===================================================================
  // PROMOTEURS
  // ===================================================================

  "promotion-immobiliere": {
    family: "pilotage",
    projectTypes: ["Promotion immobilière", "Lancement de programme"],
    workTypes: [
      { value: "etude-marche", label: "Étude de marché et faisabilité" },
      { value: "montage-financier", label: "Montage financier et recherche de fonds" },
    ],
    surfaces: ["Projet", "Terrain"],
    units: ["u"],
  },

  "gestion-chantier": {
    family: "pilotage",
    projectTypes: ["Gestion de chantier", "Coordination"],
    workTypes: [
      { value: "planning", label: "Planification et ordonnancement" },
      { value: "suivi-chantier", label: "Suivi de chantier et reporting" },
    ],
    surfaces: ["Chantier"],
    units: ["mois"],
  },

  "maitrise-oeuvre": {
    family: "pilotage",
    projectTypes: ["Maîtrise d'œuvre", "Direction de projet"],
    workTypes: [
      { value: "conception", label: "Conception et plans" },
      { value: "suivi-execution", label: "Suivi d'exécution" },
    ],
    surfaces: ["Projet"],
    units: ["u"],
  },

  "coordination-travaux": {
    family: "pilotage",
    projectTypes: ["Coordination", "Sécurité chantier"],
    workTypes: [
      { value: "coordination-sps", label: "Coordination SPS" },
      { value: "planning-interface", label: "Planning d'interface entre corps de métier" },
    ],
    surfaces: ["Chantier"],
    units: ["u"],
  },

  amenagement: {
    family: "social",
    projectTypes: ["Aménagement urbain", "Lotissement"],
    workTypes: [
      { value: "voierie", label: "Voirie et réseaux divers" },
      { value: "espaces-verts", label: "Espaces verts et plantations" },
    ],
    surfaces: ["Terrain", "Parcelle"],
    units: ["m²", "ha"],
  },
};

// --- RÈGLES PAR DÉFAUT (fallback) ---
const defaultRules: TradeRules = {
  family: "autre",
  projectTypes: ["Rénovation", "Construction neuve", "Dépannage", "Aménagement"],
  workTypes: [
    { value: "prestation-standard", label: "Prestation standard" },
    { value: "travaux-generaux", label: "Travaux généraux" },
  ],
  surfaces: ["Intérieur", "Extérieur", "Pièce"],
  units: ["m²", "u", "ml"],
};

// --- FONCTIONS EXPORTÉES ---

export function getTradeRules(trade: string): TradeRules {
  if (!trade) return defaultRules;
  const normalizedTrade = trade.toLowerCase().trim();
  if (normalizedTrade === "autres" || normalizedTrade === "generaliste") {
    return defaultRules;
  }

  const rules = tradeRulesMap[normalizedTrade];
  if (!rules) return defaultRules;

  return {
    family: rules.family ?? professionalFamilyByRole[normalizedTrade] ?? "autre",
    projectTypes: rules.projectTypes,
    workTypes: rules.workTypes,
    surfaces: rules.surfaces,
    units: rules.units,
  };
}

export function getProfessionalFamilyByRole(role?: string | null, trade?: string | null): ProfessionalFamily {
  const normalizedRole = (role || trade || "").toLowerCase().trim();
  if (!normalizedRole) return "autre";

  const mapped = Object.entries(professionalFamilyByRole).find(([key]) => normalizedRole.includes(key) || key.includes(normalizedRole));
  if (mapped) return mapped[1];

  const tradeRules = getTradeRules(normalizedRole);
  return tradeRules.family || "autre";
}

export function getProfessionalFamilyLabel(value?: string | null): string {
  const family = (value || "autre") as ProfessionalFamily;
  const item = professionalFamilies.find((entry) => entry.value === family);
  return item?.label || "Autre";
}

export function getWorkTypeLabel(trade: string, workTypeValue: string): string {
  const rules = getTradeRules(trade);
  const found = rules.workTypes.find((wt) => wt.value === workTypeValue);
  return found?.label || workTypeValue;
}

export function buildAutoServiceCategory(
  projectType: string,
  workTypeLabel: string,
  surface: string
): string {
  const parts = [projectType, workTypeLabel, surface].filter(Boolean);
  return parts.join(" - ") || "Prestation personnalisée";
}