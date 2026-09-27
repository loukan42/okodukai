-- Langue de l'appareil abonné : « Ton relevé est prêt. » / « Your statement is ready. »
ALTER TABLE "PushSubscription" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
