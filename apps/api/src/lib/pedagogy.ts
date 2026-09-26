import type { AgeBand, PedagogyLevel } from "@prisma/client";

/**
 * Tranche pédagogique effective (docs/FINANCIAL_EDUCATION.md §4.1) : le réglage du parent
 * (« Découverte » ou « Approfondi ») est prioritaire sur l'âge ; « Automatique » suit l'âge.
 * Tout ce que l'enfant voit (mots, pourcentages, supports, verger) se décide sur cette tranche.
 */
export function pedagogyBand(child: { ageBand: AgeBand; pedagogyLevel?: PedagogyLevel | null }): AgeBand {
  if (child.pedagogyLevel === "DECOUVERTE") return "AGE_8_9";
  if (child.pedagogyLevel === "APPROFONDI") return "AGE_10_12";
  return child.ageBand;
}
