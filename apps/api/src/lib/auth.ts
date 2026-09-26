import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

/**
 * En production, un secret par défaut rendrait les sessions falsifiables (n'importe qui
 * pourrait signer une session parent pour n'importe quel foyer) : on refuse de servir
 * plutôt que de signer avec une valeur publique. Voir `jwtSecretMissing` dans app.ts.
 */
export const jwtSecretMissing = isProduction && !process.env.JWT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET ?? (isProduction ? "" : "dev-secret-change-me");

export type SessionPayload =
  | { kind: "parent"; userId: string; householdId: string; role: "PARENT_ADMIN" | "PARENT" }
  | { kind: "child"; childId: string; householdId: string };

export function signSession(payload: SessionPayload): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload | null {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "okodukai_session";

// En production le site relaie /api vers l'API (apps/web/api/proxy.js) : le cookie
// est first-party. SameSite=None + Secure reste compatible si l'API est appelée
// directement depuis un autre domaine. En local, Lax évite d'exiger HTTPS.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// -- Appareil familial ------------------------------------------------------------
// Le choix du profil enfant et la connexion par PIN ne s'ouvrent que sur un appareil où un parent
// s'est connecté : un cookie signé y retient le foyer. Connaître l'identifiant d'un foyer ne suffit
// plus pour lister ses enfants ou essayer des PIN.

export const DEVICE_COOKIE = "okodukai_device";
export const DEVICE_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: 365 * 24 * 60 * 60 * 1000 };

export function signDevice(householdId: string, parentUserId?: string): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");
  return jwt.sign({ kind: "device", householdId, parentUserId }, JWT_SECRET, { expiresIn: "365d" });
}

export function verifyDeviceDetails(token: string | undefined): { householdId: string; parentUserId?: string } | null {
  if (!token || !JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { kind?: string; householdId?: string; parentUserId?: string };
    return payload.kind === "device" && payload.householdId ? { householdId: payload.householdId, parentUserId: payload.parentUserId } : null;
  } catch {
    return null;
  }
}

export function verifyDevice(token: string | undefined): string | null {
  return verifyDeviceDetails(token)?.householdId ?? null;
}
