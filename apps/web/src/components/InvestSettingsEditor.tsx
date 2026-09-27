import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { defineCopy, useCopy } from "../i18n";
import { numberFormatter } from "../i18n/format";

type Rhythm = "RAPIDE" | "STANDARD" | "LONG";

interface Settings {
  enabled: boolean;
  rhythm: Rhythm;
  horizonMonths: 60 | 120;
  contributionsEnabled: boolean;
  contributionCap: number;
  notifyStatement: boolean;
}

interface RunSummary {
  status: "EN_COURS" | "TERMINEE";
  value: number;
  fundedAmount: number | null;
  horizonMonths: number;
  clock: { revealedSteps: number };
}

const RHYTHMS: Rhythm[] = ["RAPIDE", "STANDARD", "LONG"];

const UNITS = numberFormatter({ maximumFractionDigits: 2, minimumFractionDigits: 2 });

const COPY = defineCopy({
  fr: {
    rhythms: {
      RAPIDE: ["Rapide", "4 relevés par jour (8 h, 12 h, 16 h, 20 h) : 1 an simulé par jour."],
      STANDARD: ["Standard", "1 relevé par jour à 17 h : 1 an simulé tous les 2 jours."],
      LONG: ["Long", "2 relevés par semaine (mercredi et samedi) : 1 an simulé par semaine."],
    } as Record<Rhythm, string[]>,
    loadError: "Les réglages des placements n'ont pas pu être chargés.",
    saved: "Réglages enregistrés. Le rythme et la durée s'appliquent à la prochaine partie.",
    notSaved: "Les réglages n'ont pas été enregistrés.",
    paused: "Observatoire en pause : les relevés s'arrêtent jusqu'à la reprise.",
    resumed: "Observatoire repris. Les relevés prévus pendant la pause ne sont pas rattrapés.",
    pauseError: "Le réglage n'a pas été enregistré. Réessayez.",
    legend: "Placements",
    intro: "Votre enfant transfère des pièces gagnées vers un placement. Leur valeur peut monter ou baisser. À la fin de la partie, sa valeur finale revient sur son compte.",
    running: (value: string, units: boolean, year: number, total: number) => ` Partie en cours : ${value} ${units ? "unités école" : "pièces placées"}, année ${year} sur ${total}.`,
    enable: "Activer les placements",
    rhythmLabel: "Rythme des relevés",
    statementHint: "Un relevé est un point d'étape : l'enfant y voit la valeur de son placement et ce qui a changé depuis le précédent. Le rythme choisi règle la fréquence de ces rendez-vous, pas la vitesse du marché réel.",
    horizonLabel: "Durée d'une partie",
    horizon: (years: number) => `Partie de ${years} ans`,
    notify: "Prévenir votre enfant quand un relevé est prêt (message : « Ton relevé est prêt. », jamais de chiffre, jamais la nuit)",
    notifyHint: "Si vous activez cette option, l'enfant reçoit uniquement ce message lorsqu'un nouveau relevé est consultable. La notification ne dévoile aucun résultat et n'arrive pas la nuit.",
    contributions: "Autoriser les versements programmés (niveau Approfondi)",
    contributionsHint: "Un versement programmé transfère automatiquement des pièces du solde disponible vers le placement à chaque mois simulé. L'enfant choisit le montant et sa répartition, dans la limite que vous fixez. Si son solde est insuffisant, le versement de ce mois est sauté.",
    cap: "Plafond des pièces placées, transfert initial compris :",
    coins: "pièces",
    scenarios: "Les scénarios font découvrir les hausses et les baisses. Leur fréquence ne représente pas celle des marchés réels.",
    save: "Enregistrer les réglages",
    resume: "Reprendre l'observatoire",
    pause: "Mettre l'observatoire en pause",
  },
  en: {
    rhythms: {
      RAPIDE: ["Fast", "4 statements a day (8 am, 12 pm, 4 pm, 8 pm): 1 simulated year per day."],
      STANDARD: ["Standard", "1 statement a day at 5 pm: 1 simulated year every 2 days."],
      LONG: ["Long", "2 statements a week (Wednesday and Saturday): 1 simulated year per week."],
    },
    loadError: "The investing settings couldn't be loaded.",
    saved: "Settings saved. The pace and length apply to the next game.",
    notSaved: "The settings weren't saved.",
    paused: "Observatory paused: statements stop until you resume.",
    resumed: "Observatory resumed. Statements due during the pause won't be caught up.",
    pauseError: "The setting wasn't saved. Please try again.",
    legend: "Investing",
    intro: "Your child moves earned coins into an investment. Its value can go up or down. When the game ends, the final value goes back into their account.",
    running: (value: string, units: boolean, year: number, total: number) => ` Game in progress: ${value} ${units ? "practice units" : "coins invested"}, year ${year} of ${total}.`,
    enable: "Turn on investing",
    rhythmLabel: "How often statements arrive",
    statementHint: "A statement is a checkpoint: your child sees the value of their investment and what changed since the last one. The pace you choose sets how often these come, not how fast a real market moves.",
    horizonLabel: "Length of a game",
    horizon: (years: number) => `${years}-year game`,
    notify: "Let your child know when a statement is ready (message: \"Your statement is ready.\", never a number, never at night)",
    notifyHint: "If you turn this on, your child only gets this message when a new statement can be read. The notification never shows a result and never arrives at night.",
    contributions: "Allow regular deposits (In depth level)",
    contributionsHint: "A regular deposit automatically moves coins from the available balance into the investment every simulated month. Your child chooses the amount and the split, within the limit you set. If their balance is too low, that month's deposit is skipped.",
    cap: "Cap on coins invested, including the first transfer:",
    coins: "coins",
    scenarios: "The scenarios show both rises and falls. How often they happen doesn't reflect real markets.",
    save: "Save settings",
    resume: "Resume the observatory",
    pause: "Pause the observatory",
  },
});

/** Réglages parent des placements ; les nouvelles parties utilisent des pièces du portefeuille. */
export function InvestSettingsEditor({ childId }: { childId: string }) {
  const t = useCopy(COPY);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [run, setRun] = useState<RunSummary | null>(null);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    api
      .get<{ settings: Settings; run: RunSummary | null; paused: boolean }>(`/household/children/${childId}/invest`)
      .then((res) => {
        setPaused(res.paused);
        setSettings(res.settings);
        setSaved(res.settings);
        setRun(res.run);
      })
      .catch(() => setStatus({ tone: "error", text: t.loadError }));
  }, [childId, t.loadError]);

  if (!settings) return status ? <p className="form-error" role="alert">{status.text}</p> : null;
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  async function save() {
    setStatus(null);
    try {
      const res = await api.put<{ settings: Settings }>(`/household/children/${childId}/invest-settings`, settings);
      setSaved(res.settings);
      setStatus({ tone: "ok", text: t.saved });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : t.notSaved });
    }
  }

  async function togglePause() {
    setStatus(null);
    try {
      const res = await api.post<{ paused: boolean }>(`/household/children/${childId}/invest-pause`, { paused: !paused });
      setPaused(res.paused);
      setStatus({ tone: "ok", text: res.paused ? t.paused : t.resumed });
    } catch {
      setStatus({ tone: "error", text: t.pauseError });
    }
  }

  const name = `invest-${childId}`;
  return (
    <fieldset className="vault-rule">
      <legend>{t.legend}</legend>
      <p className="money-hint">
        {t.intro}
        {run && t.running(UNITS.format(run.value), run.fundedAmount === null, Math.floor(Math.max(0, run.clock.revealedSteps - 1) / 12) + 1, run.horizonMonths / 12)}
      </p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
        {t.enable}
      </label>
      <div className="vault-rule-options" role="radiogroup" aria-label={t.rhythmLabel}>
        {RHYTHMS.map((value) => (
          <label key={value} className={`vault-rule-option${settings.rhythm === value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={`${name}-rhythm`} checked={settings.rhythm === value} onChange={() => setSettings({ ...settings, rhythm: value })} />
            <span>
              <strong>{t.rhythms[value][0]}</strong>
              <small>{t.rhythms[value][1]}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="money-hint">{t.statementHint}</p>
      <div className="segmented" role="radiogroup" aria-label={t.horizonLabel} style={{ maxWidth: 360 }}>
        {([60, 120] as const).map((m) => (
          <label key={m} className={`segmented-option${settings.horizonMonths === m ? " segmented-option--on" : ""}`}>
            <input type="radio" name={`${name}-horizon`} checked={settings.horizonMonths === m} onChange={() => setSettings({ ...settings, horizonMonths: m })} />
            {t.horizon(m / 12)}
          </label>
        ))}
      </div>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.notifyStatement} onChange={(e) => setSettings({ ...settings, notifyStatement: e.target.checked })} />
        {t.notify}
      </label>
      <p className="money-hint">{t.notifyHint}</p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.contributionsEnabled} onChange={(e) => setSettings({ ...settings, contributionsEnabled: e.target.checked })} />
        {t.contributions}
      </label>
      <p className="money-hint">{t.contributionsHint}</p>
      {settings.contributionsEnabled && (
        <label className="vault-rule-toggle">
          {t.cap}
          <input type="number" inputMode="numeric" min={100} max={2000} step={50} value={settings.contributionCap} onChange={(e) => setSettings({ ...settings, contributionCap: Math.max(100, Math.min(2000, Number(e.target.value) || 100)) })} style={{ width: 90 }} /> {t.coins}
        </label>
      )}
      <p className="money-hint">{t.scenarios}</p>
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!dirty}>
        {t.save}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void togglePause()}>
        {paused ? t.resume : t.pause}
      </button>
    </fieldset>
  );
}
