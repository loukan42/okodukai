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
interface UsersPage {
  page: number;
  pageSize: number;
  total: number;
  users: { email: string; createdAt: string }[];
}

const COPY = defineCopy({
  fr: {
    title: "Utilisation d’Okodukai",
    intro: "Vue d’ensemble de l’activité et gestion des comptes parents.",
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
    usersTitle: "Comptes parents",
    usersIntro: "Adresses utilisées pour la connexion et l’assistance aux comptes. Aucun profil enfant ni détail d’activité n’est affiché.",
    usersLoading: "Chargement des comptes…",
    usersError: "Impossible de charger les comptes. Réessayez.",
    usersEmpty: "Aucun compte parent enregistré.",
    usersEmail: "Adresse e-mail",
    usersRegistered: "Inscription",
    usersRange: (from: number, to: number, total: number) => `${from} à ${to} sur ${total}`,
    previous: "Précédent",
    next: "Suivant",
    privacy: "Les statistiques restent agrégées. Seule la liste des comptes affiche des adresses e-mail, pour l’administration.",
    note: "Une quête récurrente peut être validée plusieurs fois. « Quêtes réussies » compte chaque validation, même si la quête a été créée avant la période choisie.",
  },
  en: {
    title: "Okodukai usage",
    intro: "Activity overview and parent account management.",
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
    usersTitle: "Parent accounts",
    usersIntro: "Addresses used for sign-in and account support. Child profiles and individual activity are not shown.",
    usersLoading: "Loading accounts…",
    usersError: "We couldn't load the accounts. Try again.",
    usersEmpty: "No parent accounts yet.",
    usersEmail: "Email address",
    usersRegistered: "Joined",
    usersRange: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
    previous: "Previous",
    next: "Next",
    privacy: "Statistics remain aggregated. Only the account list shows email addresses, for administration.",
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
  const [usersPage, setUsersPage] = useState(1);
  const [users, setUsers] = useState<UsersPage | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(false);
  const [usersReload, setUsersReload] = useState(0);

  useEffect(() => {
    let live = true;
    api.get<Analytics>(`/admin/analytics?days=${days}`)
      .then((result) => { if (live) { setStats(result); setError(false); } })
      .catch(() => { if (live) { setStats(null); setError(true); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days, reload]);

  useEffect(() => {
    let live = true;
    api.get<UsersPage>(`/admin/users?page=${usersPage}`)
      .then((result) => { if (live) { setUsers(result); setUsersError(false); } })
      .catch(() => { if (live) { setUsers(null); setUsersError(true); } })
      .finally(() => { if (live) setUsersLoading(false); });
    return () => { live = false; };
  }, [usersPage, usersReload]);

  const number = numberFormatter();
  const date = dateFormatter({ dateStyle: "medium", timeStyle: "short" });
  const signupDate = dateFormatter({ dateStyle: "medium" });
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
    <section className="admin-users" aria-labelledby="admin-users-heading">
      <h2 id="admin-users-heading">{t.usersTitle}</h2>
      <p>{t.usersIntro}</p>
      <div aria-live="polite" className="admin-status">
        {usersLoading ? t.usersLoading : usersError ? <>{t.usersError} <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setUsersLoading(true); setUsersReload((n) => n + 1); }}>{t.retry}</button></> : users?.total === 0 ? t.usersEmpty : null}
      </div>
      {users && !usersLoading && users.users.length > 0 && <>
        <div className="admin-users-table-wrap">
          <table className="admin-users-table" aria-label={t.usersTitle}>
            <thead><tr><th scope="col">{t.usersEmail}</th><th scope="col">{t.usersRegistered}</th></tr></thead>
            <tbody>{users.users.map((user) => <tr key={`${user.email}-${user.createdAt}`}>
              <td>{user.email}</td><td>{signupDate.format(new Date(user.createdAt))}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="admin-users-pagination">
          <span aria-live="polite">{t.usersRange((users.page - 1) * users.pageSize + 1, Math.min(users.page * users.pageSize, users.total), users.total)}</span>
          <div>
            <button type="button" className="btn btn-ghost btn-sm" disabled={users.page <= 1} onClick={() => { setUsersLoading(true); setUsersPage((page) => page - 1); }}>{t.previous}</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={users.page * users.pageSize >= users.total} onClick={() => { setUsersLoading(true); setUsersPage((page) => page + 1); }}>{t.next}</button>
          </div>
        </div>
      </>}
    </section>
    <p className="admin-analytics-privacy">{t.privacy}</p>
  </main>;
}
