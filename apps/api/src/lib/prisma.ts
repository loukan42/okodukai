import { PrismaClient } from "@prisma/client";

// En serverless (Vercel), le module peut être ré-évalué à chaque cold start ;
// mettre le client en cache sur globalThis évite d'ouvrir une nouvelle connexion
// Postgres à chaque invocation (pattern recommandé par Prisma).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
