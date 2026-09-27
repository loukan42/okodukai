-- Langue de l'application pour toute la famille, choisie par le parent (fr, en).
ALTER TABLE "Household" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
