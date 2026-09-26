import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

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

const RHYTHMS: { value: Rhythm; label: string; help: string }[] = [
  { value: "RAPIDE", label: "Rapide", help: "4 relevés par jour (8 h, 12 h, 16 h, 20 h) : 1 an simulé par jour." },
  { value: "STANDARD", label: "Standard", help: "1 relevé par jour à 17 h : 1 an simulé tous les 2 jours." },
  { value: "LONG", label: "Long", help: "2 relevés par semaine (mercredi et samedi) : 1 an simulé par semaine." },
];

const UNITS = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** Réglages parent des placements ; les nouvelles parties utilisent des pièces du portefeuille. */
export function InvestSettingsEditor({ childId }: { childId: string }) {
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
      .catch(() => setStatus({ tone: "error", text: "Les réglages des placements n'ont pas pu être chargés." }));
  }, [childId]);

  if (!settings) return null;
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  async function save() {
    setStatus(null);
    try {
      const res = await api.put<{ settings: Settings }>(`/household/children/${childId}/invest-settings`, settings);
      setSaved(res.settings);
      setStatus({ tone: "ok", text: "Réglages enregistrés. Le rythme et la durée s'appliquent à la prochaine partie." });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 ? err.message : "Les réglages n'ont pas été enregistrés." });
    }
  }

  async function togglePause() {
    setStatus(null);
    try {
      const res = await api.post<{ paused: boolean }>(`/household/children/${childId}/invest-pause`, { paused: !paused });
      setPaused(res.paused);
      setStatus({ tone: "ok", text: res.paused ? "Observatoire en pause : les relevés s'arrêtent jusqu'à la reprise." : "Observatoire repris. Les relevés prévus pendant la pause ne sont pas rattrapés." });
    } catch {
      setStatus({ tone: "error", text: "Le réglage n'a pas été enregistré. Réessayez." });
    }
  }

  const name = `invest-${childId}`;
  return (
    <fieldset className="vault-rule">
      <legend>Placements</legend>
      <p className="money-hint">
        Votre enfant transfère des pièces gagnées vers un placement. Leur valeur peut monter ou baisser. À la fin de la partie, sa valeur finale revient sur son compte.
        {run && ` Partie en cours : ${UNITS.format(run.value)} ${run.fundedAmount === null ? "unités école" : "pièces placées"}, année ${Math.floor(Math.max(0, run.clock.revealedSteps - 1) / 12) + 1} sur ${run.horizonMonths / 12}.`}
      </p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
        Activer les placements
      </label>
      <div className="vault-rule-options" role="radiogroup" aria-label="Rythme des relevés">
        {RHYTHMS.map((r) => (
          <label key={r.value} className={`vault-rule-option${settings.rhythm === r.value ? " vault-rule-option--on" : ""}`}>
            <input type="radio" name={`${name}-rhythm`} checked={settings.rhythm === r.value} onChange={() => setSettings({ ...settings, rhythm: r.value })} />
            <span>
              <strong>{r.label}</strong>
              <small>{r.help}</small>
            </span>
          </label>
        ))}
      </div>
      <p className="money-hint">Un relevé est un point d'étape : l'enfant y voit la valeur de son placement et ce qui a changé depuis le précédent. Le rythme choisi règle la fréquence de ces rendez-vous, pas la vitesse du marché réel.</p>
      <div className="segmented" role="radiogroup" aria-label="Durée d'une partie" style={{ maxWidth: 360 }}>
        {([60, 120] as const).map((m) => (
          <label key={m} className={`segmented-option${settings.horizonMonths === m ? " segmented-option--on" : ""}`}>
            <input type="radio" name={`${name}-horizon`} checked={settings.horizonMonths === m} onChange={() => setSettings({ ...settings, horizonMonths: m })} />
            Partie de {m / 12} ans
          </label>
        ))}
      </div>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.notifyStatement} onChange={(e) => setSettings({ ...settings, notifyStatement: e.target.checked })} />
        Prévenir votre enfant quand un relevé est prêt (message : « Ton relevé est prêt. », jamais de chiffre, jamais la nuit)
      </label>
      <p className="money-hint">Si vous activez cette option, l'enfant reçoit uniquement ce message lorsqu'un nouveau relevé est consultable. La notification ne dévoile aucun résultat et n'arrive pas la nuit.</p>
      <label className="vault-rule-toggle">
        <input type="checkbox" checked={settings.contributionsEnabled} onChange={(e) => setSettings({ ...settings, contributionsEnabled: e.target.checked })} />
        Autoriser les versements programmés (niveau Approfondi)
      </label>
      <p className="money-hint">Un versement programmé transfère automatiquement des pièces du solde disponible vers le placement à chaque mois simulé. L'enfant choisit le montant et sa répartition, dans la limite que vous fixez. Si son solde est insuffisant, le versement de ce mois est sauté.</p>
      {settings.contributionsEnabled && (
        <label className="vault-rule-toggle">
          Plafond des pièces placées, transfert initial compris :
          <input type="number" min={100} max={2000} step={50} value={settings.contributionCap} onChange={(e) => setSettings({ ...settings, contributionCap: Math.max(100, Math.min(2000, Number(e.target.value) || 100)) })} style={{ width: 90 }} /> pièces
        </label>
      )}
      <p className="money-hint">Les scénarios font découvrir les hausses et les baisses. Leur fréquence ne représente pas celle des marchés réels.</p>
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={!dirty}>
        Enregistrer les réglages
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void togglePause()}>
        {paused ? "Reprendre l'observatoire" : "Mettre l'observatoire en pause"}
      </button>
    </fieldset>
  );
}
