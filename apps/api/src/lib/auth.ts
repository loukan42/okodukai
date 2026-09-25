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
