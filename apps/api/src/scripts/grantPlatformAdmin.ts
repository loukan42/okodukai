import "dotenv/config";
import { prisma } from "../lib/prisma.js";

class AdminSetupError extends Error {}

async function main() {
  const allowPasswordAccount = process.argv[2] === "--allow-password-account";
  const configuredEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) throw new AdminSetupError("Adresse du compte administrateur non configurée.");

  const user = await prisma.user.findFirst({ where: { email: { equals: configuredEmail, mode: "insensitive" } }, select: { id: true, googleSub: true } });
  if (!user) throw new AdminSetupError("Compte administrateur introuvable dans cette base.");
  if (!user.googleSub && !allowPasswordAccount) {
    throw new AdminSetupError("La propriété du compte administrateur doit être vérifiée avant l'attribution du droit.");
  }

  // Un seul compte peut détenir ce droit après l'opération.
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { isPlatformAdmin: true }, data: { isPlatformAdmin: false } });
    await tx.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
  });
  console.log("Administration globale attribuée.");
}

main().catch((error: unknown) => {
  console.error(error instanceof AdminSetupError ? error.message : "Attribution du droit administrateur impossible. Vérifiez la connexion à la base et réessayez.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect().catch(() => {
  console.error("Fermeture de la connexion à la base impossible.");
  process.exitCode = 1;
}));
