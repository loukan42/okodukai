// Fonction Vercel du projet web : relaie /api/* vers le projet API, côté serveur.
// Le navigateur ne parle qu'au domaine du site : le cookie de session est donc
// « first-party ». Avec deux domaines *.vercel.app distincts (liste des suffixes
// publics), Safari, Firefox et Chrome en navigation restreinte bloquent ce cookie
// comme cookie tiers : le compte était créé mais la session ne tenait pas.
//
// Configuration : variable d'environnement API_ORIGIN (ou VITE_API_URL déjà
// posée) sur le projet web Vercel, par ex. https://okodukai-api.vercel.app

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
    if (value === undefined || DROP_REQUEST.has(key.toLowerCase())) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
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
