import { LAST_HOUSEHOLD_KEY } from "../../lib/AuthContext";

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
  return known
    ? { primary: { to: "/profils", label: "Choisir mon profil" }, secondary: { to: "/connexion", label: "Espace parent" }, nav: { to: "/profils", label: "Mon profil" } }
    : { primary: { to: "/inscription", label: "Créer notre famille" }, secondary: { to: "/connexion", label: "Connexion" }, nav: { to: "/inscription", label: "Commencer" } };
}
