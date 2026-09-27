import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { defineCopy, useCopy } from "../../i18n";
import { dateFormatter, numberFormatter } from "../../i18n/format";

type Days = 7 | 30 | 90;
interface Analytics {
  generatedAt: string;
  period: { days: Days; from: string; to: string };
  totals: { parents: number; children: number; households: number; quests: number; validated: number };
  activity: { newParents: number; newChildren: number; newHouseholds: number; questsCreated: number; questsSubmitted: number; questsValidated: number; rewardsRequested: number };
}

const COPY = defineCopy({
  fr: {
    title: "Utilisation d’Okodukai",
    intro: "Les comptes et les actions de toutes les familles, sans détail individuel.",
    period: "Période d’activité",
    days: (n: number) => `${n} derniers jours`,
    loading: "Chargement des statistiques…",
    error: "Impossible de charger les statistiques. Réessayez.",
    retry: "Réessayer",
    updated: (date: string) => `Calculé le ${date}`,
    totals: "Depuis le lancement",
    activity: "Pendant la période choisie",
    parents: "Parents inscrits",
    children: "Profils enfant",
    households: "Familles",
    quests: "Quêtes créées",
    validated: "Quêtes réussies",
    newParents: "Nouveaux parents",
    newChildren: "Nouveaux profils enfant",
    newHouseholds: "Nouvelles familles",
    questsCreated: "Quêtes créées",
    questsSubmitted: "Quêtes déclarées terminées",
    questsValidated: "Quêtes validées",
    rewardsRequested: "Récompenses demandées",
    privacy: "Les chiffres sont calculés à la demande. Cet écran n’affiche ni nom, ni e-mail, ni détail par famille.",
    note: "Une quête récurrente peut être validée plusieurs fois. « Quêtes réussies » compte chaque validation, même si la quête a été créée avant la période choisie.",
  },
  en: {
    title: "Okodukai usage",
    intro: "Accounts and activity across all families, without individual details.",
    period: "Activity period",
    days: (n: number) => `Last ${n} days`,
    loading: "Loading statistics…",
    error: "We couldn't load the statistics. Try again.",
    retry: "Try again",
    updated: (date: string) => `Calculated on ${date}`,
    totals: "Since launch",
    activity: "During the selected period",
    parents: "Registered parents",
    children: "Child profiles",
    households: "Families",
    quests: "Quests created",
    validated: "Quests completed",
    newParents: "New parents",
    newChildren: "New child profiles",
    newHouseholds: "New families",
    questsCreated: "Quests created",
    questsSubmitted: "Quests submitted",
    questsValidated: "Quests approved",
    rewardsRequested: "Rewards requested",
    privacy: "Figures are calculated on request. This screen shows no names, email addresses or family-level details.",
    note: "A recurring quest can be approved more than once. ‘Quests completed’ counts each approval, including quests created before the selected period.",
  },
});

export function AdminAnalytics() {
  const t = useCopy(COPY);
  const [days, setDays] = useState<Days>(30);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    api.get<Analytics>(`/admin/analytics?days=${days}`)
      .then((result) => { if (live) { setStats(result); setError(false); } })
      .catch(() => { if (live) { setStats(null); setError(true); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days, reload]);

  const number = numberFormatter();
  const date = dateFormatter({ dateStyle: "medium", timeStyle: "short" });
  const totals = stats?.totals;
  const activity = stats?.activity;
  const totalItems = totals && [
    [t.parents, totals.parents], [t.children, totals.children], [t.households, totals.households],
    [t.quests, totals.quests], [t.validated, totals.validated],
  ] as const;
  const activityItems = activity && [
    [t.newParents, activity.newParents], [t.newChildren, activity.newChildren], [t.newHouseholds, activity.newHouseholds],
    [t.questsCreated, activity.questsCreated], [t.questsSubmitted, activity.questsSubmitted],
    [t.questsValidated, activity.questsValidated], [t.rewardsRequested, activity.rewardsRequested],
  ] as const;

  return <main className="admin-analytics">
    <header className="admin-analytics-header">
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
    </header>
    <fieldset className="admin-period">
      <legend>{t.period}</legend>
      <div className="admin-period-options">
        {([7, 30, 90] as const).map((value) => <label key={value} className={days === value ? "selected" : ""}>
          <input type="radio" name="admin-period" value={value} checked={days === value} onChange={() => { setLoading(true); setDays(value); }} />
          {t.days(value)}
        </label>)}
      </div>
    </fieldset>
    <div aria-live="polite" className="admin-status">
      {loading ? t.loading : error ? <>{t.error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>{t.retry}</button></> : stats ? t.updated(date.format(new Date(stats.generatedAt))) : null}
    </div>
    {stats && !loading && <>
      <section aria-labelledby="admin-totals-heading">
        <h2 id="admin-totals-heading">{t.totals}</h2>
        <dl className="admin-metrics">{totalItems && totalItems.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number.format(value)}</dd></div>)}</dl>
      </section>
      <section aria-labelledby="admin-activity-heading">
        <h2 id="admin-activity-heading">{t.activity}</h2>
        <dl className="admin-metrics admin-metrics--activity">{activityItems && activityItems.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number.format(value)}</dd></div>)}</dl>
      </section>
      <p className="admin-analytics-note">{t.note}</p>
    </>}
    <p className="admin-analytics-privacy">{t.privacy}</p>
  </main>;
}
