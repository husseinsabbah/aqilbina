import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const agents = [
    { name: "Agent Artisan", type: "artisan", specialty: "général", priceMonthly: 29, priceYearly: 290, isActive: true },
    { name: "Agent Vendeur Matériel", type: "vendeur", specialty: "matériel", priceMonthly: 49, priceYearly: 490, isActive: true },
    { name: "Agent Vendeur Quincaillerie", type: "vendeur", specialty: "quincaillerie", priceMonthly: 49, priceYearly: 490, isActive: true },
    { name: "Agent Pro", type: "societe", specialty: "illimité", priceMonthly: 79, priceYearly: 790, isActive: true },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: `seed-${agent.name}` },
      update: agent,
      create: { id: `seed-${agent.name}`, ...agent },
    });
  }
  console.log("✅ Agents créés avec succès");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());