import "dotenv/config";
import { createApp } from "../src/app.js";

// Point d'entrée serverless Vercel : une instance Express exportée directement
// comme handler (req, res) => void, routée par vercel.json (voir sa config
// "rewrites") pour recevoir toutes les requêtes API, pas seulement /api/*.
export default createApp();
