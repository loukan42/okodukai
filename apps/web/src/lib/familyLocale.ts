import { useCallback } from "react";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import type { Locale } from "../i18n";

/**
 * Enregistre la langue choisie par un parent connecté pour toute la famille (l'espace enfant la
 * suit). Sans session parent (landing, création du compte), le choix reste celui de l'appareil ;
 * le compte créé reprend la langue de l'écran de création.
 */
export function useFamilyLocaleSaver() {
  const { session, setSession } = useAuth();
  const save = useCallback(
    (locale: Locale) => {
      if (session?.kind !== "parent") return;
      setSession({ ...session, household: { ...session.household, locale } });
      void api.put("/household/locale", { locale }).catch(() => undefined);
    },
    [session, setSession]
  );
  return session?.kind === "parent" ? save : undefined;
}
