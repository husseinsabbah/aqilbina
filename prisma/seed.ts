import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const projectCategoryModel = (prisma as any).projectCategory ?? (prisma as any).projectCategories;
const projectTemplateModel = (prisma as any).projectTemplate ?? (prisma as any).projectTemplates;

if (!projectCategoryModel || !projectTemplateModel) {
  throw new Error('Les modèles Prisma ProjectCategory / ProjectTemplate n\'existent pas dans le client généré. Vérifiez le schéma Prisma et exécutez prisma generate.');
}

async function main() {
  console.log('🌱 Seeding des catégories et modèles...');

  // 1. Créer les catégories
  const categories = await prisma.$transaction([
    projectCategoryModel.upsert({ where: { name: 'carrelage' }, update: {}, create: { name: 'carrelage', label: 'Carrelage & Dalles', icon: '🧱' } }),
    projectCategoryModel.upsert({ where: { name: 'colle' }, update: {}, create: { name: 'colle', label: 'Colles & Mortiers', icon: '🪣' } }),
    projectCategoryModel.upsert({ where: { name: 'joint' }, update: {}, create: { name: 'joint', label: 'Joints & Mastics', icon: '🔧' } }),
    projectCategoryModel.upsert({ where: { name: 'plomberie' }, update: {}, create: { name: 'plomberie', label: 'Plomberie & Sanitaires', icon: '💧' } }),
    projectCategoryModel.upsert({ where: { name: 'electricite' }, update: {}, create: { name: 'electricite', label: 'Électricité & Domotique', icon: '⚡' } }),
    projectCategoryModel.upsert({ where: { name: 'menuiserie' }, update: {}, create: { name: 'menuiserie', label: 'Menuiserie & Agencement', icon: '🪚' } }),
    projectCategoryModel.upsert({ where: { name: 'preparation' }, update: {}, create: { name: 'preparation', label: 'Préparation & Gros œuvre', icon: '🏗️' } }),
  ]);

  console.log('✅ Catégories créées');

  // 2. Récupérer les IDs
  const catMap: Record<string, string> = {};
  for (const cat of categories) {
    catMap[cat.name] = cat.id;
  }

  // 3. Créer le template : Cuisine Standard
  await projectTemplateModel.create({
    data: {
      name: 'Cuisine Standard 12m²',
      trade: 'carreleur',
      type: 'cuisine',
      description: 'Modèle de base pour une cuisine de 12m² (carrelage au sol + faïence murale).',
      surfaceMin: 8,
      surfaceMax: 15,
      budgetMin: 1500,
      budgetMax: 3500,
      items: {
        create: [
          { categoryId: catMap['carrelage'], name: 'Carrelage sol 60x60', quantity: 13, unit: 'm²', estimatedPrice: 45, isRequired: true },
          { categoryId: catMap['carrelage'], name: 'Faïence murale 20x20', quantity: 15, unit: 'm²', estimatedPrice: 30, isRequired: true },
          { categoryId: catMap['colle'], name: 'Colle à carrelage (sol)', quantity: 25, unit: 'kg', estimatedPrice: 3.5, isRequired: true },
          { categoryId: catMap['colle'], name: 'Colle à faïence', quantity: 15, unit: 'kg', estimatedPrice: 4.5, isRequired: true },
          { categoryId: catMap['joint'], name: 'Joint de carrelage', quantity: 5, unit: 'kg', estimatedPrice: 5, isRequired: true },
          { categoryId: catMap['preparation'], name: 'Primaire d\'accrochage', quantity: 5, unit: 'L', estimatedPrice: 12, isRequired: false },
        ],
      },
    },
  });

  console.log('✅ Modèle "Cuisine Standard" créé');

  // 4. Créer le template : SdB Standard
  await projectTemplateModel.create({
    data: {
      name: 'Salle de bain Standard 5m²',
      trade: 'plombier',
      type: 'sdb',
      description: 'Modèle de base pour une salle de bain de 5m² (douche, carrelage, plomberie).',
      surfaceMin: 4,
      surfaceMax: 8,
      budgetMin: 2500,
      budgetMax: 6000,
      items: {
        create: [
          { categoryId: catMap['plomberie'], name: 'Douche à l\'italienne', quantity: 1, unit: 'unité', estimatedPrice: 350, isRequired: true },
          { categoryId: catMap['plomberie'], name: 'Robinetterie douche', quantity: 1, unit: 'unité', estimatedPrice: 120, isRequired: true },
          { categoryId: catMap['plomberie'], name: 'Évier / Lavabo', quantity: 1, unit: 'unité', estimatedPrice: 150, isRequired: true },
          { categoryId: catMap['plomberie'], name: 'Robinet lavabo', quantity: 1, unit: 'unité', estimatedPrice: 80, isRequired: true },
          { categoryId: catMap['carrelage'], name: 'Carrelage sol antidérapant 30x30', quantity: 6, unit: 'm²', estimatedPrice: 55, isRequired: true },
          { categoryId: catMap['carrelage'], name: 'Faïence murale 10x10', quantity: 20, unit: 'm²', estimatedPrice: 35, isRequired: true },
          { categoryId: catMap['colle'], name: 'Colle à carrelage (SdB)', quantity: 25, unit: 'kg', estimatedPrice: 4, isRequired: true },
          { categoryId: catMap['joint'], name: 'Joint hydrofuge', quantity: 4, unit: 'kg', estimatedPrice: 8, isRequired: true },
          { categoryId: catMap['preparation'], name: 'Film d\'étanchéité (douche)', quantity: 1, unit: 'unité', estimatedPrice: 60, isRequired: true },
        ],
      },
    },
  });

  console.log('✅ Modèle "Salle de bain Standard" créé');

  // 5. Créer le template : Terrasse
  await projectTemplateModel.create({
    data: {
      name: 'Terrasse Standard 20m²',
      trade: 'carreleur',
      type: 'terrasse',
      description: 'Modèle de base pour une terrasse extérieure de 20m².',
      surfaceMin: 15,
      surfaceMax: 30,
      budgetMin: 2000,
      budgetMax: 5000,
      items: {
        create: [
          { categoryId: catMap['carrelage'], name: 'Dalle extérieure 60x60', quantity: 22, unit: 'm²', estimatedPrice: 40, isRequired: true },
          { categoryId: catMap['colle'], name: 'Colle extérieure', quantity: 40, unit: 'kg', estimatedPrice: 4.5, isRequired: true },
          { categoryId: catMap['joint'], name: 'Joint extérieur', quantity: 8, unit: 'kg', estimatedPrice: 6, isRequired: true },
          { categoryId: catMap['preparation'], name: 'Primaire d\'accrochage extérieur', quantity: 5, unit: 'L', estimatedPrice: 15, isRequired: true },
        ],
      },
    },
  });

  console.log('✅ Modèle "Terrasse Standard" créé');

  console.log('🌱 Seed terminé avec succès !');
  console.log(`📊 ${categories.length} catégories, 3 modèles de projet créés.`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });