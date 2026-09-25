import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "../lib/auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function attachSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const session = verifySession(token);
    if (session) req.session = session;
  }
  next();
}

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.kind !== "parent") {
    return res.status(401).json({ error: "Authentification parent requise" });
  }
  next();
}

export function requireParentAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.kind !== "parent" || req.session.role !== "PARENT_ADMIN") {
    return res.status(403).json({ error: "Réservé à l'administrateur du foyer" });
  }
  next();
}

export function requireChild(req: Request, res: Response, next: NextFunction) {
  if (!req.session || req.session.kind !== "child") {
    return res.status(401).json({ error: "Authentification enfant requise" });
  }
  next();
}

/** Parent OU enfant, tant qu'une session existe. */
export function requireAnySession(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  next();
}
