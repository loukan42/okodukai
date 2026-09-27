/**
 * Courbe de niveaux — spec §31.
 * XP nécessaire pour passer du niveau n à n+1 : 100 + (n-1) * 25.
 * Formule volontairement isolée ici pour rester configurable.
 *
 * À quoi sert l'XP : elle mesure l'effort et l'apprentissage (quêtes validées, leçons, placements
 * compris), jamais l'argent. Chaque niveau gagné offre un booster de niveau, et certains niveaux
 * donnent un nouveau titre. L'XP ne se convertit jamais en pièces.
 */
export const MAX_LEVEL = 30;

export function xpToReachNextLevel(level: number): number {
  return 100 + (level - 1) * 25;
}

/** XP at the beginning of a level, used by the read-only development preview. */
export function xpAtStartOfLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current++) total += xpToReachNextLevel(current);
  return total;
}

/** Titres de la vallée, par niveau de départ. Les libellés sont côté site (fr/en), ici les codes. */
export const LEVEL_TITLES: { level: number; code: string }[] = [
  { level: 1, code: "novice" },
  { level: 3, code: "cartographe" },
  { level: 5, code: "stratege" },
  { level: 8, code: "astronome" },
  { level: 12, code: "architecte" },
  { level: 16, code: "sage" },
  { level: 20, code: "legende" },
];

export function titleForLevel(level: number): string {
  let code = LEVEL_TITLES[0].code;
  for (const t of LEVEL_TITLES) if (level >= t.level) code = t.code;
  return code;
}

/** Prochain titre à gagner, s'il y en a encore un. */
export function nextTitleAfter(level: number): { level: number; code: string } | null {
  return LEVEL_TITLES.find((t) => t.level > level) ?? null;
}

export function levelFromTotalXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  let remaining = totalXp;

  while (level < MAX_LEVEL) {
    const needed = xpToReachNextLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: level < MAX_LEVEL ? xpToReachNextLevel(level) : 0,
  };
}

/** Niveau enrichi pour l'enfant : titre actuel, prochain titre et récompense de chaque niveau. */
export function levelView(totalXp: number) {
  const base = levelFromTotalXp(totalXp);
  return {
    ...base,
    totalXp,
    maxLevel: MAX_LEVEL,
    title: titleForLevel(base.level),
    nextTitle: nextTitleAfter(base.level),
    /** Récompense du prochain niveau : toujours un booster de niveau. */
    nextReward: base.level < MAX_LEVEL ? { boosters: 1, title: LEVEL_TITLES.find((t) => t.level === base.level + 1)?.code ?? null } : null,
  };
}
