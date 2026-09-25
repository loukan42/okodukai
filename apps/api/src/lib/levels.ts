/**
 * Courbe de niveaux — spec §31.
 * XP nécessaire pour passer du niveau n à n+1 : 100 + (n-1) * 25.
 * Formule volontairement isolée ici pour rester configurable.
 */
export const MAX_LEVEL = 30;

export function xpToReachNextLevel(level: number): number {
  return 100 + (level - 1) * 25;
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
