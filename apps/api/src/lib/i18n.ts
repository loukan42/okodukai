// Langue des textes écrits par le serveur (messages d'erreur, encarts, questions, relevés, contenus).
// Le site envoie `X-Locale` (fr | en) ; sinon on lit Accept-Language ; sinon français, la langue
// d'origine du produit. La langue suit la requête grâce à AsyncLocalStorage : les fonctions de
// contenu appellent `tr()` ou `locale()` sans qu'on ait à passer la langue partout.
import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import { translateError } from "./i18n/errors.js";

export type Locale = "fr" | "en";

const store = new AsyncLocalStorage<Locale>();

export function parseLocale(header: string | undefined | null): Locale | null {
  const value = (header ?? "").trim().toLowerCase();
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("en")) return "en";
  return null;
}

/** Langue d'Accept-Language : la première langue connue de la liste. */
function fromAcceptLanguage(header: string | undefined): Locale | null {
  for (const part of (header ?? "").split(",")) {
    const found = parseLocale(part.split(";")[0]);
    if (found) return found;
  }
  return null;
}

export function locale(): Locale {
  return store.getStore() ?? "fr";
}

/** Choisit le texte de la langue courante. */
export function tr(fr: string, en: string): string {
  return locale() === "en" ? en : fr;
}

/** Choisit la valeur de la langue courante dans un objet { fr, en }. */
export function pick<T>(values: { fr: T; en: T }): T {
  return values[locale()];
}

/** Exécute `fn` dans une langue donnée (tâches sans requête : notifications, cron). */
export function withLocale<T>(value: Locale, fn: () => T): T {
  return store.run(value, fn);
}

/**
 * Fixe la langue de la requête et traduit le champ `error` des réponses JSON : les messages
 * restent écrits en français dans les routes, leur version anglaise vit dans `i18n/errors.ts`.
 */
export function localeMiddleware(req: Request, res: Response, next: NextFunction) {
  const value = parseLocale(req.header("x-locale")) ?? fromAcceptLanguage(req.header("accept-language")) ?? "fr";
  res.setHeader("Content-Language", value);
  if (value === "en") {
    const json = res.json.bind(res);
    res.json = (body?: unknown) => {
      if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
        body = { ...(body as object), error: translateError((body as { error: string }).error) };
      }
      return json(body);
    };
  }
  store.run(value, () => next());
}
