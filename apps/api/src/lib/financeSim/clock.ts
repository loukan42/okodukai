/**
 * Temps financier compressé : conversion temps réel ↔ temps simulé.
 *
 * Principe : la trajectoire est calculée mois par mois (1 étape = 1 mois simulé, rendements
 * mensuels réalistes). Le RYTHME ne change que la vitesse à laquelle ces mois sont RÉVÉLÉS, par
 * paquets, à des « rendez-vous » fixes dans le fuseau horaire du foyer. On compresse le temps,
 * jamais les rendements : un rendez-vous qui révèle 6 mois montre 6 rendements mensuels.
 *
 * Aucune dépendance : les fuseaux horaires passent par Intl (ICU inclus dans Node).
 */

export type RhythmCode = "RAPIDE" | "STANDARD" | "LONG";

export interface RhythmDefinition {
  code: RhythmCode;
  /** Jours de rendez-vous, calendrier local : 0 = dimanche … 6 = samedi. */
  daysOfWeek: readonly number[];
  /** Heures locales des rendez-vous, en minutes après minuit (triées). */
  minutesOfDay: readonly number[];
  /** Mois simulés révélés à chaque rendez-vous. */
  monthsPerRendezVous: number;
  /** Délai minimal entre le démarrage et le premier rendez-vous (évite un rendez-vous 2 min après). */
  minLeadMinutes: number;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

export const RHYTHMS: Readonly<Record<RhythmCode, RhythmDefinition>> = {
  // 4 rendez-vous par jour, 1 trimestre chacun : 1 an simulé par jour réel.
  RAPIDE: {
    code: "RAPIDE",
    daysOfWeek: EVERY_DAY,
    minutesOfDay: [8 * 60, 12 * 60, 16 * 60, 20 * 60],
    monthsPerRendezVous: 3,
    minLeadMinutes: 60,
  },
  // 1 rendez-vous par jour à 17 h, 1 semestre chacun : 1 an simulé tous les 2 jours.
  STANDARD: {
    code: "STANDARD",
    daysOfWeek: EVERY_DAY,
    minutesOfDay: [17 * 60],
    monthsPerRendezVous: 6,
    minLeadMinutes: 60,
  },
  // 2 rendez-vous par semaine (mercredi et samedi à 17 h), 1 semestre chacun : 1 an par semaine.
  LONG: {
    code: "LONG",
    daysOfWeek: [3, 6],
    minutesOfDay: [17 * 60],
    monthsPerRendezVous: 6,
    minLeadMinutes: 60,
  },
};

export interface Pause {
  from: Date;
  to: Date;
}

export class ClockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClockError";
  }
}

const MINUTE = 60_000;
/** Garde-fou d'itération : ~50 ans de calendrier. */
const MAX_DAYS_SCANNED = 18_300;

// ---------------------------------------------------------------------------
// Fuseaux horaires
// ---------------------------------------------------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    } catch {
      throw new ClockError(`Fuseau horaire inconnu : ${timeZone}`);
    }
    formatters.set(timeZone, f);
  }
  return f;
}

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function localParts(ms: number, timeZone: string): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Décalage (ms) entre l'heure locale et UTC à un instant donné. */
function offsetAt(ms: number, timeZone: string): number {
  const p = localParts(ms, timeZone);
  const wholeSeconds = ms - (((ms % 1000) + 1000) % 1000);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - wholeSeconds;
}

/** Instant UTC correspondant à une date/heure locale (gère les changements d'heure). */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  minutesOfDay: number,
  timeZone: string
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minutesOfDay);
  const firstOffset = offsetAt(naive, timeZone);
  let utc = naive - firstOffset;
  const secondOffset = offsetAt(utc, timeZone);
  if (secondOffset !== firstOffset) utc = naive - secondOffset;
  return new Date(utc);
}

// ---------------------------------------------------------------------------
// Calendrier des rendez-vous
// ---------------------------------------------------------------------------

export interface ScheduleOptions {
  /** Fuseau IANA du foyer, ex. "Europe/Paris". */
  timeZone: string;
  /** Périodes où l'horloge est suspendue par le parent (rendez-vous sautés, pas rattrapés). */
  pauses?: readonly Pause[];
}

function checkRhythm(rhythm: RhythmDefinition): void {
  const okDays = rhythm.daysOfWeek.length > 0 && rhythm.daysOfWeek.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const okMinutes =
    rhythm.minutesOfDay.length > 0 &&
    rhythm.minutesOfDay.every((m) => Number.isInteger(m) && m >= 0 && m < 24 * 60);
  if (!okDays || !okMinutes || !Number.isInteger(rhythm.monthsPerRendezVous) || rhythm.monthsPerRendezVous < 1) {
    throw new ClockError(`Rythme invalide : ${rhythm.code}`);
  }
}

/** Parcourt, dans l'ordre, les rendez-vous qui suivent le démarrage. */
function* rendezVousAfter(rhythm: RhythmDefinition, startAt: Date, options: ScheduleOptions): Generator<Date> {
  checkRhythm(rhythm);
  const earliest = startAt.getTime() + rhythm.minLeadMinutes * MINUTE;
  const pauses = (options.pauses ?? []).map((p) => [p.from.getTime(), p.to.getTime()] as const);
  const start = localParts(startAt.getTime(), options.timeZone);
  const minutes = [...rhythm.minutesOfDay].sort((a, b) => a - b);
  for (let i = 0; i < MAX_DAYS_SCANNED; i++) {
    const calendar = new Date(Date.UTC(start.year, start.month - 1, start.day + i));
    if (!rhythm.daysOfWeek.includes(calendar.getUTCDay())) continue;
    for (const m of minutes) {
      const slot = zonedTimeToUtc(
        calendar.getUTCFullYear(),
        calendar.getUTCMonth() + 1,
        calendar.getUTCDate(),
        m,
        options.timeZone
      );
      const ms = slot.getTime();
      if (ms < earliest) continue;
      if (pauses.some(([from, to]) => ms >= from && ms < to)) continue;
      yield slot;
    }
  }
}

/** Nombre de rendez-vous nécessaires pour révéler tout l'horizon. */
export function rendezVousNeeded(rhythm: RhythmDefinition, horizonMonths: number): number {
  return Math.ceil(horizonMonths / rhythm.monthsPerRendezVous);
}

/** Liste les `count` premiers rendez-vous (planning, notifications, affichage « prochains bilans »). */
export function listRendezVous(
  rhythm: RhythmDefinition,
  startAt: Date,
  count: number,
  options: ScheduleOptions
): Date[] {
  const out: Date[] = [];
  if (count <= 0) return out;
  for (const slot of rendezVousAfter(rhythm, startAt, options)) {
    out.push(slot);
    if (out.length >= count) break;
  }
  return out;
}

export interface ClockState {
  /** Rendez-vous déjà passés (plafonné au nombre nécessaire pour l'horizon). */
  rendezVousCount: number;
  /** Mois simulés révélés : l'étape jusqu'à laquelle on peut valoriser et afficher. */
  revealedSteps: number;
  finished: boolean;
  lastRendezVousAt: Date | null;
  nextRendezVousAt: Date | null;
}

export interface ClockStateInput extends ScheduleOptions {
  rhythm: RhythmDefinition;
  startAt: Date;
  now: Date;
  horizonMonths: number;
}

/**
 * État de l'horloge d'une simulation à l'instant `now`. C'est LA fonction que l'API appelle pour
 * savoir jusqu'où révéler la trajectoire : jamais le client.
 */
export function clockState(input: ClockStateInput): ClockState {
  const needed = rendezVousNeeded(input.rhythm, input.horizonMonths);
  const nowMs = input.now.getTime();
  let count = 0;
  let last: Date | null = null;
  let next: Date | null = null;
  for (const slot of rendezVousAfter(input.rhythm, input.startAt, input)) {
    if (count >= needed) break;
    if (slot.getTime() <= nowMs) {
      count++;
      last = slot;
    } else {
      next = slot;
      break;
    }
  }
  const finished = count >= needed;
  return {
    rendezVousCount: count,
    revealedSteps: Math.min(input.horizonMonths, count * input.rhythm.monthsPerRendezVous),
    finished,
    lastRendezVousAt: last,
    nextRendezVousAt: finished ? null : next,
  };
}

/** Date du dernier rendez-vous (fin de la simulation) si aucune pause n'est ajoutée. */
export function projectedEndDate(
  rhythm: RhythmDefinition,
  startAt: Date,
  horizonMonths: number,
  options: ScheduleOptions
): Date {
  const slots = listRendezVous(rhythm, startAt, rendezVousNeeded(rhythm, horizonMonths), options);
  return slots[slots.length - 1];
}

/** Étape révélée à un rendez-vous donné (1er rendez-vous → monthsPerRendezVous). */
export function stepAtRendezVous(rhythm: RhythmDefinition, rendezVousIndex: number, horizonMonths: number): number {
  return Math.min(horizonMonths, rendezVousIndex * rhythm.monthsPerRendezVous);
}

/**
 * Facteur de compression moyen : jours simulés par jour réel.
 * RAPIDE ≈ 365, STANDARD ≈ 183, LONG ≈ 52.
 */
export function compressionFactor(rhythm: RhythmDefinition): number {
  const perWeek = rhythm.daysOfWeek.length * rhythm.minutesOfDay.length;
  return (rhythm.monthsPerRendezVous * (365.25 / 12) * perWeek) / 7;
}

/** Durée réelle moyenne (jours) pour vivre `horizonMonths` mois simulés. */
export function realDaysForHorizon(rhythm: RhythmDefinition, horizonMonths: number): number {
  return (horizonMonths * (365.25 / 12)) / compressionFactor(rhythm);
}

/** Temps simulé écoulé à une étape : « 2 ans et 3 mois ». */
export function simulatedElapsed(step: number): { years: number; months: number } {
  return { years: Math.floor(step / 12), months: step % 12 };
}

