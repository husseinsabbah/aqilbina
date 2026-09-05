// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ------------------------------------------------------------------
  // 1. DÉFINITION DE TOUS LES AGENTS
  // ------------------------------------------------------------------
  const agents = [
    // ========== AGENTS SYSTÈMES IA (4) ==========
    {
      id: "seed-visionneur",
      name: "Visionneur IA",
      type: "ia",
      specialty: "vision",
      description: "Analyse les photos de chantier pour extraire les caractéristiques techniques (support, fissures, ensoleillement).",
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
    },
    {
      id: "seed-expert-3s",
      name: "Expert 3S IA",
      type: "ia",
      specialty: "expertise",
      description: "Applique la règle métier Support/Surface/Sollicitation pour recommander les produits et normes adaptés.",
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
    },
    {
      id: "seed-calculette",
      name: "Calculette IA",
      type: "ia",
      specialty: "calcul",
      description: "Calcule les quantités de matériaux, les chutes et le temps de pose estimé.",
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
    },
    {
      id: "seed-redacteur",
      name: "Rédacteur IA",
      type: "ia",
      specialty: "redaction",
      description: "Rédige le devis final en français avec des justifications techniques et sécuritaires.",
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
    },

    // ========== AGENTS ARTISAN (toutes spécialités) ==========
    {
      id: "seed-artisan-carreleur",
      name: "Artisan Carreleur",
      type: "artisan",
      specialty: "carreleur",
      description: "Spécialiste en pose de carrelage, faïence et revêtements de sol.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-plombier",
      name: "Artisan Plombier",
      type: "artisan",
      specialty: "plombier",
      description: "Spécialiste en plomberie, chauffage et sanitaires.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-electricien",
      name: "Artisan Électricien",
      type: "artisan",
      specialty: "electricien",
      description: "Spécialiste en électricité, domotique et éclairage.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-peintre",
      name: "Artisan Peintre",
      type: "artisan",
      specialty: "peintre",
      description: "Spécialiste en peinture intérieure, extérieure et décoration.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-menuisier",
      name: "Artisan Menuisier",
      type: "artisan",
      specialty: "menuisier",
      description: "Spécialiste en menuiserie, agencement et aménagement sur mesure.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-macon",
      name: "Artisan Maçon",
      type: "artisan",
      specialty: "maçon",
      description: "Spécialiste en maçonnerie, fondations et gros œuvre.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-couvreur",
      name: "Artisan Couvreur",
      type: "artisan",
      specialty: "couvreur",
      description: "Spécialiste en couverture, zinguerie et étanchéité.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-terrassier",
      name: "Artisan Terrassier",
      type: "artisan",
      specialty: "terrassier",
      description: "Spécialiste en terrassement, fondations et travaux de sol.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-renovateur",
      name: "Artisan Rénovateur",
      type: "artisan",
      specialty: "renovation",
      description: "Spécialiste en rénovation complète, ravalement et réhabilitation.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-platrier",
      name: "Artisan Plâtrier",
      type: "artisan",
      specialty: "platrier",
      description: "Spécialiste en plâtrerie, faux-plafonds et cloisons sèches.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-chauffagiste",
      name: "Artisan Chauffagiste",
      type: "artisan",
      specialty: "chauffagiste",
      description: "Spécialiste en chauffage, climatisation et énergies renouvelables.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-vitrier",
      name: "Artisan Vitrier",
      type: "artisan",
      specialty: "vitrier",
      description: "Spécialiste en vitrerie, miroiterie et pose de verre.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-serrurier",
      name: "Artisan Serrurier",
      type: "artisan",
      specialty: "serrurier",
      description: "Spécialiste en serrurerie, sécurité et fermetures.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-ferronnier",
      name: "Artisan Ferronnier",
      type: "artisan",
      specialty: "ferronnier",
      description: "Spécialiste en ferronnerie, métallerie et structures métalliques.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-etancheiste",
      name: "Artisan Étanchéiste",
      type: "artisan",
      specialty: "etancheite",
      description: "Spécialiste en étanchéité, imperméabilisation et toitures.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-forestier",
      name: "Artisan Forestier",
      type: "artisan",
      specialty: "forestier",
      description: "Spécialiste en travaux forestiers, abattage et débroussaillage.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },
    {
      id: "seed-artisan-generaliste",
      name: "Artisan Généraliste",
      type: "artisan",
      specialty: "generaliste",
      description: "Artisan polyvalent pour tous types de travaux.",
      priceMonthly: 29,
      priceYearly: 290,
      isActive: true,
    },

    // ========== AGENTS VENDEUR (toutes spécialités) ==========
    {
      id: "seed-vendeur-superviseur",
      name: "Superviseur Vendeur",
      type: "vendeur",
      specialty: "superviseur",
      description: "Agent de supervision qui coordonne plusieurs agents spécialisés et unifie le suivi commercial.",
      priceMonthly: 79,
      priceYearly: 790,
      isActive: true,
    },
    {
      id: "seed-vendeur-materiaux",
      name: "Vendeur Matériaux",
      type: "vendeur",
      specialty: "materiaux",
      description: "Spécialiste en matériaux de construction (ciment, briques, etc.).",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-sanitaire",
      name: "Vendeur Sanitaire",
      type: "vendeur",
      specialty: "sanitaire",
      description: "Spécialiste en équipements sanitaires (WC, baignoires, robinetterie).",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-quincaillerie",
      name: "Vendeur Quincaillerie",
      type: "vendeur",
      specialty: "quincaillerie",
      description: "Spécialiste en quincaillerie, visserie et fixation.",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-menuiserie",
      name: "Vendeur Menuiserie",
      type: "vendeur",
      specialty: "menuiserie",
      description: "Spécialiste en menuiserie (portes, fenêtres, parquets).",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-isolation",
      name: "Vendeur Isolation",
      type: "vendeur",
      specialty: "isolation",
      description: "Spécialiste en isolation (laine de verre, polystyrène, etc.).",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-outillage",
      name: "Vendeur Outillage",
      type: "vendeur",
      specialty: "outillage",
      description: "Spécialiste en outillage professionnel et matériel de chantier.",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
    {
      id: "seed-vendeur-decoration",
      name: "Vendeur Décoration",
      type: "vendeur",
      specialty: "decoration",
      description: "Spécialiste en décoration (papier peint, revêtements muraux).",
      priceMonthly: 49,
      priceYearly: 490,
      isActive: true,
    },
  ];

  // ------------------------------------------------------------------
  // 2. INSERTION / MISE À JOUR DES AGENTS
  // ------------------------------------------------------------------
  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: agent,
      create: agent,
    });
  }
  console.log(`✅ ${agents.length} agents créés/mis à jour.`);

  // ------------------------------------------------------------------
  // 3. CRÉATION DES UTILISATEURS DE TEST
  // ------------------------------------------------------------------
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    {
      email: "artisan@test.com",
      name: "Hassan Artisan",
      firstName: "Hassan",
      lastName: "Artisan",
      password: passwordHash,
      role: "artisan",
      trade: "carreleur",
      companyName: "Heuresier Alami",
      phone: "+33 6 12 34 56 78",
      city: "Paris",
      address: "12 rue des Artisans",
    },
    {
      email: "vendeur@test.com",
      name: "Maya Vendeur",
      firstName: "Maya",
      lastName: "Vendeur",
      password: passwordHash,
      role: "vendeur",
      trade: "materiaux",
      companyName: "Matériaux du Sud",
      phone: "+33 6 98 76 54 32",
      city: "Marseille",
      address: "15 avenue des Matériaux",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user,
    });
  }
  console.log(`✅ ${users.length} utilisateurs de test créés.`);

  // ------------------------------------------------------------------
  // 4. CRÉATION DES USERAGENT POUR LES COMPTES DE TEST
  //    (Permet d'avoir un agent actif dès le départ pour les tests)
  // ------------------------------------------------------------------
  const artisanUser = await prisma.user.findUnique({ where: { email: "artisan@test.com" } });
  const vendeurUser = await prisma.user.findUnique({ where: { email: "vendeur@test.com" } });

  // Trouver l'agent correspondant au métier de l'artisan (carreleur)
  const artisanAgent = await prisma.agent.findFirst({
    where: { specialty: "carreleur", type: "artisan" },
  });

  // Trouver l'agent correspondant au métier du vendeur (materiaux)
  const vendeurAgent = await prisma.agent.findFirst({
    where: { specialty: "materiaux", type: "vendeur" },
  });

  if (artisanUser && artisanAgent) {
    await prisma.userAgent.upsert({
      where: {
        userId_agentId_customName: {
          userId: artisanUser.id,
          agentId: artisanAgent.id,
          customName: `Agent ${artisanUser.trade}`,
        },
      },
      update: {
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 an
      },
      create: {
        userId: artisanUser.id,
        agentId: artisanAgent.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: false,
        customName: `Agent ${artisanUser.trade}`,
      },
    });
    console.log(`✅ UserAgent créé pour ${artisanUser.email} (${artisanUser.trade})`);
  } else {
    console.warn(`⚠️ Artisan ou agent "carreleur" non trouvé.`);
  }

  if (vendeurUser && vendeurAgent) {
    await prisma.userAgent.upsert({
      where: {
        userId_agentId_customName: {
          userId: vendeurUser.id,
          agentId: vendeurAgent.id,
          customName: `Agent ${vendeurUser.trade}`,
        },
      },
      update: {
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: vendeurUser.id,
        agentId: vendeurAgent.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: false,
        customName: `Agent ${vendeurUser.trade}`,
      },
    });
    console.log(`✅ UserAgent créé pour ${vendeurUser.email} (${vendeurUser.trade})`);
  } else {
    console.warn(`⚠️ Vendeur ou agent "materiaux" non trouvé.`);
  }

  console.log("✅ Seed terminé avec succès.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });