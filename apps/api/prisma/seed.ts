import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/devSeed.js";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(({ household }) => {
    console.log("Seed Okodukai — foyer de démonstration Martin");
    console.log("Seed terminé.");
    console.log("Connexion parent démo : sophie.martin@example.com / motdepasse123");
    console.log(`Foyer : ${household.id}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
