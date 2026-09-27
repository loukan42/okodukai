import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
  const allowPasswordAccount = process.argv[2] === "--allow-password-account";
  const configuredEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configuredEmail) throw new Error("Configuration incomplète : variable d'environnement manquante.");

  const user = await prisma.user.findFirst({ where: { email: { equals: configuredEmail, mode: "insensitive" } }, select: { id: true, googleSub: true } });
  if (!user) throw new Error("Compte cible introuvable.");
  if (!user.googleSub && !allowPasswordAccount) {
    throw new Error("Compte cible non conforme (option requise pour un compte sans fournisseur externe).");
  }

  // Un seul compte peut détenir ce droit après l'opération.
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { isPlatformAdmin: true }, data: { isPlatformAdmin: false } });
    await tx.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
  });
  console.log("Administration globale attribuée.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
