import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/**
 * Adresse du visiteur, seulement si le relais du site l'a signée avec PROXY_SECRET
 * (apps/web/api/proxy.js). Sans secret configuré, pas de limite par adresse : l'en-tête
 * `x-forwarded-for` reçu par l'API est celui du relais, pas du visiteur, et un en-tête non
 * signé pourrait être inventé par n'importe qui appelant l'API directement.
 */
export function signedClientIp(req: Request): string | null {
  const secret = process.env.PROXY_SECRET;
  if (!secret) return null;
  const ip = req.header("x-okodukai-client-ip");
  const sig = req.header("x-okodukai-client-ip-sig");
  if (!ip || !sig) return null;
  const expected = Buffer.from(createHmac("sha256", secret).update(ip).digest("hex"));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected) ? ip : null;
}
