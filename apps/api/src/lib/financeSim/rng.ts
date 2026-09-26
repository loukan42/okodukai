/**
 * Générateur pseudo-aléatoire seedé du simulateur financier.
 *
 * Choix d'implémentation (voir docs/FINANCIAL_SIMULATION_ENGINE.md §Reproductibilité) :
 * - hachage de la seed texte par cyrb128, puis générateur sfc32 (32 bits, opérations entières
 *   uniquement) ;
 * - loi normale approchée par la somme de 12 uniformes moins 6 (Irwin-Hall) : n'utilise que des
 *   additions exactes, donc aucun appel à Math.log / Math.cos dont l'implémentation peut varier
 *   d'un moteur JavaScript à l'autre. Une même seed donne les mêmes nombres, bit pour bit,
 *   sur toute machine.
 */

export interface Rng {
  /** Uniforme dans [0, 1). */
  uniform(): number;
  /** Normale centrée réduite (Irwin-Hall d'ordre 12, bornée à ±6). */
  normal(): number;
  /** Réel uniforme dans [min, max). */
  between(min: number, max: number): number;
  /** Entier uniforme dans [min, max] (bornes incluses). */
  intBetween(min: number, max: number): number;
}

/** Hache une chaîne en 4 entiers non signés 32 bits (cyrb128). */
export function hashString(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Empreinte hexadécimale courte d'une chaîne (audit des paramètres). */
export function fingerprint(input: string): string {
  return hashString(input)
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("");
}

/** Crée un générateur déterministe à partir d'une seed texte. */
export function createRng(seed: string): Rng {
  let [a, b, c, d] = hashString(seed);

  function nextUint32(): number {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  }

  // Préchauffage recommandé pour sfc32 : décorrèle l'état initial de la seed.
  for (let i = 0; i < 15; i++) nextUint32();

  const uniform = () => nextUint32() / 4294967296;

  return {
    uniform,
    normal() {
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += uniform();
      return sum - 6;
    },
    between(min, max) {
      return min + (max - min) * uniform();
    },
    intBetween(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`intBetween: bornes invalides (${min}, ${max})`);
      }
      return min + Math.floor(uniform() * (max - min + 1));
    },
  };
}
