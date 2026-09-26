// Toujours la même origine que le site : en local le serveur Vite relaie /api vers
// l'API (:4000), en production la fonction Vercel `apps/web/api/proxy.js` fait de
// même. Appeler l'API sur un autre domaine rendrait le cookie de session « tiers »,
// bloqué par plusieurs navigateurs.
const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const UNREACHABLE = "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }

  const isJson = (res.headers.get("content-type") ?? "").includes("application/json");

  if (!res.ok) {
    let message = res.status >= 500 ? "Le serveur a rencontré un problème. Réessaie dans un instant." : `Erreur ${res.status}`;
    if (isJson) {
      try {
        const body = await res.json();
        message = body.error ?? message;
      } catch {
        // corps illisible : on garde le message par défaut
      }
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  // Une page HTML à la place du JSON signifie que /api n'atteint pas l'API
  // (réécriture ou proxy mal configuré) : on le dit plutôt que d'échouer au parsing.
  if (!isJson) throw new ApiError(res.status, UNREACHABLE);
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
