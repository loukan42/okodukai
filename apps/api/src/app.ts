import express from "express";
// Express 4 ne transmet pas les rejets des handlers async au middleware d'erreur :
// sans ce correctif, une erreur de base de données faisait tomber tout le processus.
// Doit être importé avant la déclaration des routes.
import "express-async-errors";
import { Prisma } from "@prisma/client";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { householdRouter } from "./routes/household.js";
import { childRouter } from "./routes/child.js";
import { questsRouter } from "./routes/quests.js";
import { rewardsRouter } from "./routes/rewards.js";
import { savingsRouter } from "./routes/savings.js";
import { collectionRouter } from "./routes/collection.js";
import { learningRouter } from "./routes/learning.js";
import { investRouter } from "./routes/invest.js";
import { badgesRouter } from "./routes/badges.js";
import { notificationsRouter } from "./routes/notifications.js";
import { devRouter } from "./routes/dev.js";
import { jwtSecretMissing } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Diagnostic de déploiement : https://<site>/api/health dit si la base et le secret sont en place.
  app.get("/health", async (_req, res) => {
    let database = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "injoignable";
    }
    const ok = !jwtSecretMissing && database === "ok";
    res.status(ok ? 200 : 503).json({ ok, database, jwtSecret: jwtSecretMissing ? "manquant" : "ok" });
  });

  if (jwtSecretMissing) {
    app.use((_req, res) => res.status(503).json({ error: "Configuration du serveur incomplète (JWT_SECRET manquant)." }));
  }

  app.use("/auth", authRouter);
  app.use("/household", householdRouter);
  app.use("/", childRouter);
  app.use("/", questsRouter);
  app.use("/", rewardsRouter);
  app.use("/", savingsRouter);
  app.use("/", collectionRouter);
  app.use("/", learningRouter);
  app.use("/", investRouter);
  app.use("/", badgesRouter);
  app.use("/", notificationsRouter);

  if (process.env.NODE_ENV !== "production") {
    app.use("/", devRouter);
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Requête invalide" });
    }
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return res.status(503).json({ error: "La base de données ne répond pas. Réessaie dans un instant." });
    }
    res.status(500).json({ error: "Erreur interne" });
  });

  return app;
}
