import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { householdRouter } from "./routes/household.js";
import { questsRouter } from "./routes/quests.js";
import { rewardsRouter } from "./routes/rewards.js";
import { savingsRouter } from "./routes/savings.js";
import { collectionRouter } from "./routes/collection.js";
import { learningRouter } from "./routes/learning.js";
import { simulationRouter } from "./routes/simulation.js";
import { badgesRouter } from "./routes/badges.js";
import { notificationsRouter } from "./routes/notifications.js";

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

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/household", householdRouter);
  app.use("/", questsRouter);
  app.use("/", rewardsRouter);
  app.use("/", savingsRouter);
  app.use("/", collectionRouter);
  app.use("/", learningRouter);
  app.use("/", simulationRouter);
  app.use("/", badgesRouter);
  app.use("/", notificationsRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erreur interne" });
  });

  return app;
}
