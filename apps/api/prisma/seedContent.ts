import { PrismaClient } from "@prisma/client";
import { seedContent } from "../src/lib/contentSeed.js";

// Contenu de référence seulement (aucun foyer de démonstration) : sûr en production, rejouable.
const prisma = new PrismaClient();

seedContent(prisma)
  .then((universes) => console.log(`Contenu Okodukai à jour : ${universes.length} univers.`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
