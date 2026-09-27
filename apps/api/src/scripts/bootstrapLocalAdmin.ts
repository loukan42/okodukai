import "dotenv/config";
import { randomBytes } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";

const PASSWORD_FILE = fileURLToPath(new URL("../../.env.local", import.meta.url));
class AdminSetupError extends Error {}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new AdminSetupError("Connexion à la base locale non configurée.");
  let host: string;
  try { host = new URL(databaseUrl).hostname.toLowerCase(); }
  catch { throw new AdminSetupError("Configuration de la base locale invalide."); }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new AdminSetupError("Initialisation refusée : la base configurée n'est pas locale.");
  }
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new AdminSetupError("Adresse du compte administrateur non configurée.");

  const existing = await prisma.user.findFirst({ where: { email: { equals: adminEmail, mode: "insensitive" } }, select: { id: true } });
  if (existing) throw new AdminSetupError("Ce compte existe déjà dans la base locale. Son mot de passe n'a pas été modifié.");

  const password = randomBytes(24).toString("base64url");
  const passwordHash = await argon2.hash(password);
  // Un fichier exclu par .gitignore, créé sans écraser un éventuel secret existant.
  const file = await open(PASSWORD_FILE, "wx", 0o600).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") throw new AdminSetupError("Un mot de passe local est déjà enregistré. Aucun compte n'a été créé.");
    throw error;
  });
  let saved = false;
  try {
    await file.writeFile(`OKODUKAI_LOCAL_ADMIN_PASSWORD=${password}\n`);
    saved = true;
  } finally {
    await file.close();
    if (!saved) await unlink(PASSWORD_FILE).catch(() => {});
  }

  try {
    await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name: "Administration", locale: "fr", onboardingCompletedAt: new Date() },
      });
      await tx.user.updateMany({ where: { isPlatformAdmin: true }, data: { isPlatformAdmin: false } });
      const user = await tx.user.create({
        data: { email: adminEmail, displayName: "Lou", passwordHash, isPlatformAdmin: true },
      });
      await tx.householdMembership.create({
        data: { householdId: household.id, userId: user.id, role: "PARENT_ADMIN" },
      });
      await tx.auditLog.create({
        data: { householdId: household.id, actorUserId: user.id, action: "household_created", targetType: "Household", targetId: household.id },
      });
    });
  } catch (error) {
    await unlink(PASSWORD_FILE).catch(() => {});
    throw error;
  }

  console.log("Compte créé dans la base locale avec accès admin. Mot de passe enregistré dans apps/api/.env.local (ignoré par Git).");
}

main().catch((error: unknown) => {
  console.error(error instanceof AdminSetupError ? error.message : "Initialisation du compte administrateur impossible. Vérifiez la base locale et réessayez.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect().catch(() => {
  console.error("Fermeture de la connexion à la base impossible.");
  process.exitCode = 1;
}));
