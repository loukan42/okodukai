import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const allowPasswordAccount = process.argv[3] === "--allow-password-account";
  if (email !== "loucore@gmail.com") {
    throw new Error("L'administration est réservée à loucore@gmail.com : npm run admin:grant --workspace apps/api -- loucore@gmail.com");
  }
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, googleSub: true } });
  if (!user) throw new Error("Compte inexistant. Connectez-vous d'abord avec ce compte avant de lui attribuer l'administration.");
  if (!user.googleSub && !allowPasswordAccount) {
    throw new Error("Compte sans Google associé. Si vous avez vérifié que ce compte appartient bien au propriétaire, relancez avec --allow-password-account.");
  }

  // Un seul compte peut détenir ce droit après l'opération.
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { isPlatformAdmin: true }, data: { isPlatformAdmin: false } });
    await tx.user.update({ where: { id: user.id }, data: { isPlatformAdmin: true } });
  });
  console.log("Administration globale attribuée au compte existant.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
