// Langue de l'interface (français ou anglais). Les textes vivent à côté des composants, dans des
// objets `defineCopy({ fr, en })` : TypeScript vérifie que la version anglaise a les mêmes clés
// et les mêmes paramètres que la version française. La langue choisie est aussi envoyée à l'API
// (en-tête X-Locale) pour les textes calculés par le serveur (encarts, questions, relevés, erreurs).
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "fr" | "en";
export const LOCALES: Locale[] = ["fr", "en"];

const STORAGE_KEY = "okodukai:locale";

const isLocale = (value: unknown): value is Locale => value === "fr" || value === "en";

/** `?lang=en` dans l'adresse, puis le choix mémorisé, puis la langue du navigateur (anglais hors français). */
function detectLocale(): Locale {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(fromUrl)) return fromUrl;
  } catch {
    // adresse illisible : on continue
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // stockage indisponible (navigation privée) : on continue
  }
  const languages = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of languages) {
    const code = (lang ?? "").toLowerCase();
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("en")) return "en";
  }
  return "en";
}

let current: Locale = detectLocale();

/** Langue courante, pour le code hors React (client API, formats). */
export function getLocale(): Locale {
  return current;
}

/** Code BCP 47 pour `Intl` et `toLocaleString`. */
export function intlLocale(locale: Locale = current): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}

export type Copy<T> = { fr: T; en: T };

/** Élargit les littéraux (`"pièce" | "pièces"` → `string`) pour que la version anglaise ait la même forme. */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? Widen<U>[]
          : T extends object
            ? { [K in keyof T]: Widen<T[K]> }
            : T;

/** Déclare les textes d'un écran : la version anglaise doit avoir exactement la forme de la française. */
export function defineCopy<T>(copy: { fr: T; en: NoInfer<Widen<T>> }): Copy<Widen<T>> {
  return copy as Copy<Widen<T>>;
}

/** Version courante d'un jeu de textes, hors React. */
export function pick<T>(copy: Copy<T>): T {
  return copy[current];
}

/**
 * Table partagée dont les valeurs suivent la langue courante, pour garder les appels existants
 * (`SUPPORTS[code].name`, `RISK_WORD[n]`). L'application est remontée à chaque changement de
 * langue (voir `LocaleBoundary`) : la lecture au rendu suffit.
 */
export function localized<T extends object>(copy: Copy<T>): T {
  const target = () => copy[current] as object;
  return new Proxy(copy.fr as T, {
    get: (_t, key) => Reflect.get(target(), key),
    has: (_t, key) => Reflect.has(target(), key),
    ownKeys: () => Reflect.ownKeys(target()),
    getOwnPropertyDescriptor: (_t, key) => Reflect.getOwnPropertyDescriptor(target(), key),
  });
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyToDocument(locale: Locale) {
  document.documentElement.lang = locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState<Locale>(current);

  useEffect(() => applyToDocument(locale), [locale]);

  const setLocale = useCallback((next: Locale) => {
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // stockage indisponible : le choix vaut pour cet onglet
    }
    setState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

/** Textes de l'écran dans la langue courante. */
export function useCopy<T>(copy: Copy<T>): T {
  return copy[useLocale().locale];
}

/**
 * Remonte l'application quand la langue change : les textes calculés par le serveur sont
 * rechargés dans la nouvelle langue, et le code hors React relit `getLocale()`.
 */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return <Fragment key={locale}>{children}</Fragment>;
}
