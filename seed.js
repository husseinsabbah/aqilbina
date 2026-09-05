import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Connexion à la base...');
    
    // Supprimer tous les utilisateurs existants (pour repartir propre)
    await prisma.user.deleteMany();
    console.log('🧹 Anciens utilisateurs supprimés');

    // Générer un hash pour le mot de passe
    const hash = await bcrypt.hash('password123', 10);
    console.log('🔑 Hash généré :', hash);

    // Créer l'artisan
    await prisma.user.create({
      data: {
        email: 'artisan@test.com',
        name: 'Hassan Artisan',
        password: hash,
        role: 'user',
        trade: 'carreleur',
        companyName: 'Heuresier Alami',
      },
    });
    console.log('✅ Artisan créé');

    // Créer le vendeur
    await prisma.user.create({
      data: {
        email: 'vendeur@test.com',
        name: 'Maya Vendeur',
        password: hash,
        role: 'user',
        trade: 'vendeur',
        companyName: 'Matériaux du Sud',
      },
    });
    console.log('✅ Vendeur créé');

    console.log('✅ 2 utilisateurs créés avec le mot de passe : password123');
  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();