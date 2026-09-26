import type { MarketPath } from "./market.js";
import { SUPPORT_CODES, zeroBySupport, type Allocation, type SupportCode } from "./supports.js";

/**
 * Valorisation d'un portefeuille en « unités école ». Le portefeuille détient des PARTS de
 * chaque support (comme une unité de compte d'assurance-vie) : valeur = Σ parts × valeur de part.
 *
 * Ordre des événements à chaque étape t ≥ 1 (fin du mois t) :
 *   1. le marché bouge (les valeurs de part passent de t-1 à t) ;
 *   2. les frais de gestion du mois sont prélevés (en parts) ;
 *   3. le versement programmé du mois est investi, s'il y en a un ;
 *   → `valueAtReveal` : ce que l'enfant découvre au rendez-vous ;
 *   4. les décisions prises par l'enfant à cette étape (versement, arbitrage, retrait), dans
 *      l'ordre où elles ont été enregistrées → `value`.
 * À l'étape 0, seules les décisions s'appliquent (versement initial).
 */

export interface FeeSchedule {
  /** Frais sur versement, en fraction du montant versé (0.02 = 2 %). */
  entryRate: number;
  /** Frais de gestion annuels, prélevés chaque mois au 1/12e. Un nombre = même taux partout. */
  managementRateAnnual: number | Readonly<Record<SupportCode, number>>;
  /** Frais d'arbitrage, en fraction du montant déplacé. */
  arbitrageRate: number;
  /** Nombre d'arbitrages sans frais par année simulée (0 par défaut). */
  freeArbitragesPerYear?: number;
}

export const NO_FEES: FeeSchedule = { entryRate: 0, managementRateAnnual: 0, arbitrageRate: 0 };

/**
 * Exemple pédagogique d'un contrat « classique » (ordres de grandeur de marché, pas une moyenne
 * officielle) : 2 % sur versement, 0,8 %/an de gestion, 0,5 % par arbitrage.
 */
export const EXAMPLE_CONTRACT_FEES: FeeSchedule = {
  entryRate: 0.02,
  managementRateAnnual: 0.008,
  arbitrageRate: 0.005,
};

export type SimOperation =
  /** Versement ponctuel (le premier fixe la répartition cible s'il en porte une). */
  | { type: "VERSEMENT"; step: number; amount: number; allocation?: Allocation }
  /** Active / modifie / arrête (montant 0) les versements mensuels, à partir de l'étape suivante. */
  | { type: "VERSEMENTS_PROGRAMMES"; step: number; amountPerMonth: number; allocation?: Allocation }
  /** Réorganise tout le portefeuille selon une nouvelle répartition (devient la cible). */
  | { type: "ARBITRAGE"; step: number; allocation: Allocation }
  /** Retrait (rachat partiel) réparti au prorata de chaque support, plafonné à la valeur. */
  | { type: "RETRAIT"; step: number; amount: number };

export type FinanceSimErrorCode =
  | "ALLOCATION_INVALID"
  | "ALLOCATION_SUM"
  | "AMOUNT_INVALID"
  | "STEP_INVALID"
  | "NO_TARGET_ALLOCATION"
  | "FEES_INVALID";

export class FinanceSimError extends Error {
  constructor(
    public readonly code: FinanceSimErrorCode,
    message: string
  ) {
    super(message);
    this.name = "FinanceSimError";
  }
}

/** Renvoie un code d'erreur si la répartition est invalide (entiers 0-100, somme 100). */
export function checkAllocation(allocation: unknown): FinanceSimErrorCode | null {
  if (typeof allocation !== "object" || allocation === null) return "ALLOCATION_INVALID";
  const record = allocation as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((k) => !(SUPPORT_CODES as readonly string[]).includes(k))) return "ALLOCATION_INVALID";
  let sum = 0;
  for (const code of SUPPORT_CODES) {
    const v = record[code] ?? 0;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) return "ALLOCATION_INVALID";
    sum += v;
  }
  return sum === 100 ? null : "ALLOCATION_SUM";
}

function normalizeAllocation(allocation: Allocation): Record<SupportCode, number> {
  const error = checkAllocation(allocation);
  if (error) throw new FinanceSimError(error, "Répartition invalide : entiers de 0 à 100, total 100 %");
  const out = zeroBySupport();
  for (const code of SUPPORT_CODES) out[code] = allocation[code] ?? 0;
  return out;
}

function checkFees(fees: FeeSchedule): void {
  const rates = [
    fees.entryRate,
    fees.arbitrageRate,
    ...(typeof fees.managementRateAnnual === "number"
      ? [fees.managementRateAnnual]
      : SUPPORT_CODES.map((c) => (fees.managementRateAnnual as Record<SupportCode, number>)[c])),
  ];
  if (rates.some((r) => typeof r !== "number" || !Number.isFinite(r) || r < 0 || r >= 0.2)) {
    throw new FinanceSimError("FEES_INVALID", "Taux de frais invalide (attendu entre 0 et 20 %)");
  }
  const free = fees.freeArbitragesPerYear ?? 0;
  if (!Number.isInteger(free) || free < 0) {
    throw new FinanceSimError("FEES_INVALID", "Nombre d'arbitrages gratuits invalide");
  }
}

function managementRate(fees: FeeSchedule, code: SupportCode): number {
  return typeof fees.managementRateAnnual === "number" ? fees.managementRateAnnual : fees.managementRateAnnual[code];
}

export interface FeesBreakdown {
  entry: number;
  management: number;
  arbitrage: number;
  total: number;
}

export interface ValuationPoint {
  step: number;
  /** Valeur découverte au rendez-vous, avant les décisions prises à cette étape. */
  valueAtReveal: number;
  /** Valeur après les décisions de l'étape (valeur « actuelle »). */
  value: number;
  bySupport: Record<SupportCode, number>;
  /** Répartition réelle en % (dérive avec le marché ; non arrondie). */
  actualAllocation: Record<SupportCode, number>;
  /** Cumul des versements (bruts, avant frais sur versement). */
  contributed: number;
  /** Cumul des retraits. */
  withdrawn: number;
  /** Cumul des versements non effectués parce que le plafond parental était atteint. */
  refusedByCap: number;
  /** Cumul des frais payés, en unités école. */
  fees: FeesBreakdown;
  /** Gain ou perte cumulé(e) : valeur + retraits − versements (net de frais). */
  gain: number;
  /**
   * Indice de performance base 100 (méthode « valeur de part » / time-weighted) : mesure ce que
   * le placement a fait, SANS compter les versements ni les retraits. Net de frais.
   */
  performanceIndex: number;
  /** Indice des prix (base 100). */
  priceIndex: number;
  /** Valeur exprimée en pouvoir d'achat du départ : value × 100 / priceIndex. */
  realValue: number;
}

export interface PortfolioValuation {
  points: ValuationPoint[];
  /** Parts détenues à la dernière étape valorisée. */
  holdings: Record<SupportCode, number>;
  targetAllocation: Record<SupportCode, number> | null;
  monthlyPlan: { amountPerMonth: number; allocation: Record<SupportCode, number> | null } | null;
}

export interface ValuePortfolioInput {
  market: MarketPath;
  operations: readonly SimOperation[];
  fees: FeeSchedule;
  /** Dernière étape à valoriser (= étape révélée). Défaut : horizon complet. */
  untilStep?: number;
  /**
   * Plafond de capital école fixé par le parent : versements − retraits ne peuvent pas le
   * dépasser. Un versement (ponctuel ou programmé) est réduit à ce qui reste disponible ; la part
   * refusée est comptée dans `refusedByCap`. L'API doit de préférence refuser un versement
   * ponctuel au-delà du plafond AVANT de l'enregistrer.
   */
  contributionCap?: number;
}

/**
 * Rejoue les décisions sur la trajectoire de marché jusqu'à `untilStep`. Fonction pure :
 * aucune valeur n'est stockée, tout est recalculable depuis la trajectoire et les opérations.
 */
export function valuePortfolio(input: ValuePortfolioInput): PortfolioValuation {
  const { market, fees, contributionCap } = input;
  checkFees(fees);
  if (contributionCap !== undefined && (!Number.isFinite(contributionCap) || contributionCap < 0)) {
    throw new FinanceSimError("AMOUNT_INVALID", "Plafond de capital école invalide");
  }
  const untilStep = input.untilStep ?? market.horizonMonths;
  if (!Number.isInteger(untilStep) || untilStep < 0 || untilStep > market.horizonMonths) {
    throw new FinanceSimError("STEP_INVALID", `Étape de valorisation invalide : ${untilStep}`);
  }

  // Validation + tri stable par étape.
  const ops = input.operations.map((op, index) => ({ op, index }));
  for (const { op } of ops) {
    if (!Number.isInteger(op.step) || op.step < 0 || op.step > untilStep) {
      throw new FinanceSimError("STEP_INVALID", `Opération à une étape non révélée ou invalide : ${op.step}`);
    }
    if (op.type === "VERSEMENT" || op.type === "RETRAIT") {
      if (!Number.isFinite(op.amount) || op.amount <= 0) {
        throw new FinanceSimError("AMOUNT_INVALID", "Le montant doit être un nombre positif");
      }
    }
    if (op.type === "VERSEMENTS_PROGRAMMES" && (!Number.isFinite(op.amountPerMonth) || op.amountPerMonth < 0)) {
      throw new FinanceSimError("AMOUNT_INVALID", "Le montant mensuel doit être positif ou nul");
    }
    if ("allocation" in op && op.allocation !== undefined) normalizeAllocation(op.allocation);
  }
  ops.sort((a, b) => a.op.step - b.op.step || a.index - b.index);

  const parts = zeroBySupport();
  let target: Record<SupportCode, number> | null = null;
  let plan: PortfolioValuation["monthlyPlan"] = null;
  let contributed = 0;
  let withdrawn = 0;
  let refusedByCap = 0;
  const feeTotals = { entry: 0, management: 0, arbitrage: 0 };
  // Indice de performance : le portefeuille est découpé en « parts de portefeuille ».
  let perfUnits = 0;
  let perfNav = 100;
  const arbitragesByYear = new Map<number, number>();
  const points: ValuationPoint[] = [];
  let cursor = 0;

  const priceAt = (code: SupportCode, t: number) => market.prices[code][t];
  const valueAt = (t: number) => {
    let total = 0;
    for (const code of SUPPORT_CODES) total += parts[code] * priceAt(code, t);
    return total;
  };
  const refreshNav = (t: number) => {
    if (perfUnits > 0) perfNav = valueAt(t) / perfUnits;
  };
  const recordFlow = (t: number, grossFlow: number) => {
    // grossFlow > 0 : argent qui entre ; < 0 : argent qui sort.
    perfUnits = Math.max(0, perfUnits + grossFlow / perfNav);
    if (perfUnits === 0) return;
    refreshNav(t);
  };

  const invest = (t: number, requested: number, allocation: Record<SupportCode, number>) => {
    const room = contributionCap === undefined ? requested : Math.max(0, contributionCap - (contributed - withdrawn));
    const amount = Math.min(requested, room);
    refusedByCap += requested - amount;
    if (amount <= 0) return;
    refreshNav(t);
    const entryFee = amount * fees.entryRate;
    const net = amount - entryFee;
    for (const code of SUPPORT_CODES) {
      if (allocation[code] > 0) parts[code] += (net * allocation[code]) / 100 / priceAt(code, t);
    }
    contributed += amount;
    feeTotals.entry += entryFee;
    recordFlow(t, amount);
  };

  for (let t = 0; t <= untilStep; t++) {
    if (t > 0) {
      // 2. Frais de gestion du mois (prorata 1/12 du taux annuel), prélevés en parts.
      for (const code of SUPPORT_CODES) {
        const rate = managementRate(fees, code);
        if (rate > 0 && parts[code] > 0) {
          const feeParts = (parts[code] * rate) / 12;
          parts[code] -= feeParts;
          feeTotals.management += feeParts * priceAt(code, t);
        }
      }
      refreshNav(t);
      // 3. Versement programmé.
      if (plan && plan.amountPerMonth > 0) {
        const allocation = plan.allocation ?? target;
        if (allocation) invest(t, plan.amountPerMonth, allocation);
      }
    }
    refreshNav(t);
    const valueAtReveal = valueAt(t);

    // 4. Décisions de l'étape.
    while (cursor < ops.length && ops[cursor].op.step === t) {
      const op = ops[cursor].op;
      cursor++;
      switch (op.type) {
        case "VERSEMENT": {
          const allocation: Record<SupportCode, number> | null = op.allocation
            ? normalizeAllocation(op.allocation)
            : target;
          if (!allocation) {
            throw new FinanceSimError("NO_TARGET_ALLOCATION", "Le premier versement doit préciser une répartition");
          }
          if (!target) target = allocation;
          invest(t, op.amount, allocation);
          break;
        }
        case "VERSEMENTS_PROGRAMMES": {
          const allocation = op.allocation ? normalizeAllocation(op.allocation) : null;
          if (!allocation && !target && op.amountPerMonth > 0) {
            throw new FinanceSimError("NO_TARGET_ALLOCATION", "Aucune répartition pour les versements programmés");
          }
          plan = op.amountPerMonth > 0 ? { amountPerMonth: op.amountPerMonth, allocation } : null;
          break;
        }
        case "ARBITRAGE": {
          const allocation = normalizeAllocation(op.allocation);
          target = allocation;
          const total = valueAt(t);
          if (total <= 0) break;
          refreshNav(t);
          let moved = 0;
          for (const code of SUPPORT_CODES) {
            const current = parts[code] * priceAt(code, t);
            const wanted = (total * allocation[code]) / 100;
            if (current > wanted) moved += current - wanted;
          }
          const year = Math.floor(Math.max(0, t - 1) / 12);
          const used = arbitragesByYear.get(year) ?? 0;
          arbitragesByYear.set(year, used + 1);
          const free = used < (fees.freeArbitragesPerYear ?? 0);
          const fee = free ? 0 : moved * fees.arbitrageRate;
          const after = total - fee;
          for (const code of SUPPORT_CODES) parts[code] = (after * allocation[code]) / 100 / priceAt(code, t);
          feeTotals.arbitrage += fee;
          refreshNav(t);
          break;
        }
        case "RETRAIT": {
          const total = valueAt(t);
          if (total <= 0) break;
          refreshNav(t);
          const amount = Math.min(op.amount, total);
          const everything = amount >= total;
          const keep = everything ? 0 : 1 - amount / total;
          for (const code of SUPPORT_CODES) parts[code] *= keep;
          withdrawn += amount;
          // Retrait total : on remet le compteur de parts à zéro (évite un reliquat flottant).
          if (everything) perfUnits = 0;
          else recordFlow(t, -amount);
          break;
        }
      }
    }

    refreshNav(t);
    const bySupport = zeroBySupport();
    for (const code of SUPPORT_CODES) bySupport[code] = parts[code] * priceAt(code, t);
    const value = SUPPORT_CODES.reduce((sum, code) => sum + bySupport[code], 0);
    const actualAllocation = zeroBySupport();
    if (value > 0) for (const code of SUPPORT_CODES) actualAllocation[code] = (bySupport[code] / value) * 100;
    const priceIndex = market.priceIndex[t];
    const totalFees = feeTotals.entry + feeTotals.management + feeTotals.arbitrage;
    points.push({
      step: t,
      valueAtReveal,
      value,
      bySupport,
      actualAllocation,
      contributed,
      withdrawn,
      refusedByCap,
      fees: { ...feeTotals, total: totalFees },
      gain: value + withdrawn - contributed,
      performanceIndex: perfNav,
      priceIndex,
      realValue: (value * 100) / priceIndex,
    });
  }

  return { points, holdings: { ...parts }, targetAllocation: target, monthlyPlan: plan };
}

export interface PeriodSummary {
  fromStep: number;
  toStep: number;
  startValue: number;
  endValue: number;
  /** Versements − retraits pendant la période (fromStep exclu, toStep inclus). */
  netFlows: number;
  feesPaid: number;
  /** Ce qui vient du marché (et des frais), hors versements : fin − début − flux. */
  marketEffect: number;
  /** Performance du placement sur la période, hors versements (fraction). */
  performance: number;
  /** Variation du pouvoir d'achat de 100 unités sur la période (fraction, négative si les prix montent). */
  purchasingPowerChange: number;
}

/**
 * Bilan entre deux étapes (« au dernier bilan : 100 ; aujourd'hui : 96 »). La valeur de début est
 * la valeur après décisions de `fromStep`, la valeur de fin celle après décisions de `toStep`.
 */
export function summarizePeriod(points: readonly ValuationPoint[], fromStep: number, toStep: number): PeriodSummary {
  const from = points[fromStep];
  const to = points[toStep];
  if (!from || !to || toStep < fromStep) {
    throw new FinanceSimError("STEP_INVALID", `Période invalide : ${fromStep} → ${toStep}`);
  }
  const netFlows = to.contributed - from.contributed - (to.withdrawn - from.withdrawn);
  return {
    fromStep,
    toStep,
    startValue: from.value,
    endValue: to.value,
    netFlows,
    feesPaid: to.fees.total - from.fees.total,
    marketEffect: to.value - from.value - netFlows,
    performance: to.performanceIndex / from.performanceIndex - 1,
    purchasingPowerChange: from.priceIndex / to.priceIndex - 1,
  };
}

/**
 * « Et avec d'autres choix ? » : mêmes versements aux mêmes dates, mais 100 % sur un seul
 * support et sans arbitrage. À montrer seulement au bilan final, avec le message « personne ne
 * pouvait savoir à l'avance » — jamais pour culpabiliser.
 */
export function alternativeOutcomes(input: ValuePortfolioInput): Record<SupportCode, number> {
  const out = zeroBySupport();
  for (const code of SUPPORT_CODES) {
    const allocation = zeroBySupport();
    allocation[code] = 100;
    const operations: SimOperation[] = [];
    for (const op of input.operations) {
      if (op.type === "ARBITRAGE") continue;
      if (op.type === "VERSEMENT" || op.type === "VERSEMENTS_PROGRAMMES") operations.push({ ...op, allocation });
      else operations.push(op);
    }
    const valuation = valuePortfolio({ ...input, operations });
    out[code] = valuation.points[valuation.points.length - 1].value;
  }
  return out;
}

/** Même portefeuille valorisé avec et sans frais (leçon « comparer les frais »). */
export function compareWithAndWithoutFees(input: ValuePortfolioInput) {
  const withFees = valuePortfolio(input);
  const withoutFees = valuePortfolio({ ...input, fees: NO_FEES });
  const last = withFees.points.length - 1;
  return {
    withFees,
    withoutFees,
    /** Écart final en unités école (toujours ≥ 0). */
    gap: withoutFees.points[last].value - withFees.points[last].value,
  };
}
