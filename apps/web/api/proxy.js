// Fonction Vercel du projet web : relaie /api/* vers le projet API, côté serveur.
// Le navigateur ne parle qu'au domaine du site : le cookie de session est donc
// « first-party ». Avec deux domaines *.vercel.app distincts (liste des suffixes
// publics), Safari, Firefox et Chrome en navigation restreinte bloquent ce cookie
// comme cookie tiers : le compte était créé mais la session ne tenait pas.
//
// Configuration : variable d'environnement API_ORIGIN (ou VITE_API_URL déjà
// posée) sur le projet web Vercel, par ex. https://okodukai-api.vercel.app

import { createHmac } from "node:crypto";

// Adresse du visiteur, transmise à l'API signée par un secret partagé (PROXY_SECRET, sur les deux
// projets) : l'API limite les essais de connexion par adresse sans croire un en-tête non signé.
const CLIENT_IP = "x-okodukai-client-ip";
const CLIENT_IP_SIG = "x-okodukai-client-ip-sig";

const DROP_REQUEST = new Set(["host", "connection", "keep-alive", "content-length", "transfer-encoding", "upgrade", "te", "trailer", "proxy-authorization", "proxy-authenticate"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive", "set-cookie"]);

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
    return JSON.stringify(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  const origin = (process.env.API_ORIGIN || process.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(origin)) {
    return json(res, 503, { error: "Le site n'est pas encore relié à l'API (variable API_ORIGIN manquante sur Vercel)." });
  }

  const url = new URL(req.url, "http://proxy.local");
  const raw = req.query?.__path ?? url.searchParams.get("__path") ?? "";
  const path = (Array.isArray(raw) ? raw.join("/") : String(raw)).replace(/^\/+/, "");
  url.searchParams.delete("__path");
  const qs = url.searchParams.toString();
  const target = `${origin}/${path}${qs ? `?${qs}` : ""}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    // Un visiteur ne peut pas fournir lui-même les en-têtes réservés au relais.
    if (value === undefined || DROP_REQUEST.has(key.toLowerCase()) || key.toLowerCase().startsWith("x-okodukai-")) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  const secret = process.env.PROXY_SECRET;
  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "";
  if (secret && ip) {
    headers[CLIENT_IP] = ip;
    headers[CLIENT_IP_SIG] = createHmac("sha256", secret).update(ip).digest("hex");
  }

  let upstream;
  try {
    upstream = await fetch(target, { method: req.method, headers, body: await readBody(req), redirect: "manual" });
  } catch {
    return json(res, 502, { error: "L'API ne répond pas pour le moment. Réessaie dans un instant." });
  }

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key.toLowerCase())) res.setHeader(key, value);
  });
  const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}
