import { LAST_HOUSEHOLD_KEY } from "../../lib/AuthContext";
import { pick } from "../../i18n";
import { LANDING } from "./copy";

export interface Ctas {
  primary: { to: string; label: string };
  secondary: { to: string; label: string };
  nav: { to: string; label: string };
}

/** Sur un appareil déjà relié à une famille, on propose d'abord de choisir son profil. */
export function landingCtas(): Ctas {
  let known = false;
  try {
    known = Boolean(window.localStorage.getItem(LAST_HOUSEHOLD_KEY));
  } catch {
    known = false;
  }
  const t = pick(LANDING).ctas;
  return known
    ? { primary: { to: "/profils", label: t.known.primary }, secondary: { to: "/connexion", label: t.known.secondary }, nav: { to: "/profils", label: t.known.nav } }
    : { primary: { to: "/inscription", label: t.fresh.primary }, secondary: { to: "/connexion", label: t.fresh.secondary }, nav: { to: "/inscription", label: t.fresh.nav } };
}
