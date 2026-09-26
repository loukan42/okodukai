-- Accueil du parent : date à laquelle le foyer a terminé l'accueil (nom de famille, enfants).
-- Idempotent : sans effet si la colonne a déjà été ajoutée à la main.
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Les foyers existants ont été créés avec l'ancien formulaire complet : on les considère prêts.
UPDATE "Household" SET "onboardingCompletedAt" = "createdAt" WHERE "onboardingCompletedAt" IS NULL;
