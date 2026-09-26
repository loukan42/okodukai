import { PrismaClient } from "@prisma/client";

/**
 * Derrière le pooler de Neon (PgBouncer, mode transaction), Prisma doit renoncer aux requêtes
 * préparées (`pgbouncer=true`) ; une connexion par instance serverless suffit.
 */
function datasourceUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes("-pooler.") || url.includes("pgbouncer=")) return undefined;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true&connection_limit=1`;
}

// En serverless (Vercel), le module peut être ré-évalué à chaque cold start ;
// mettre le client en cache sur globalThis évite d'ouvrir une nouvelle connexion
// Postgres à chaque invocation (pattern recommandé par Prisma).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = datasourceUrl();
export const prisma = globalForPrisma.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
