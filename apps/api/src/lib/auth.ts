import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export type SessionPayload =
  | { kind: "parent"; userId: string; householdId: string; role: "PARENT_ADMIN" | "PARENT" }
  | { kind: "child"; childId: string; householdId: string };

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "okodukai_session";

const isProduction = process.env.NODE_ENV === "production";

// En production, apps/web et apps/api sont deux domaines Vercel distincts : le cookie
// de session est donc cross-site et a besoin de SameSite=None (qui exige Secure).
// En local, les deux tournent sur localhost via le proxy Vite → Lax suffit et évite
// d'exiger HTTPS en dev.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
