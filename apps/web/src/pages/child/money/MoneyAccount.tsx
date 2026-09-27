import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GameIcon } from "../../../components/GameIcon";
import { api } from "../../../lib/api";
import { chestStateFor, pieces, signed, type MoneyLine, type MoneyOverview } from "../../../lib/money";
import { CoinArt } from "../../../art/CoinArt";
import { ChestArt } from "../../../art/ChestArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { MoneyLineRow } from "../../../components/money/MoneyLineRow";
import { LineDetailSheet } from "../../../components/money/LineDetailSheet";
import { EmptyState } from "../../../components/EmptyState";
import { defineCopy, useCopy } from "../../../i18n";

const COPY = defineCopy({
  fr: {
    loadError: "Impossible d'afficher ton trésor pour l'instant.",
    notMoved: "Il n'a pas bougé.",
    retry: "Réessayer",
    loading: "Ton compte s'ouvre…",
    title: "Mon compte",
    have: "J'ai ",
    coinWord: (n: number) => (n === 1 || n === 0 ? "pièce" : "pièces"),
    weekYoung: ["Cette semaine : ", " gagnées, ", " dépensées"],
    weekOld: "Cette semaine : entrées",
    outs: "sorties",
    diff: "différence",
    saved: "mis de côté",
    vault: "Coffre magique",
    goalLine: (title: string, present: number, target: number) => `${title} : ${present} sur ${target}`,
    reached: " · Objectif atteint",
    missing: (coins: string) => ` · Il te manque ${coins}`,
    chooseGoal: "Choisis un objectif : ton coffre le remplira pièce après pièce.",
    mondayPrime: (coins: string) => `Lundi : +${coins} de prime`,
    everyMonday: "Chaque lundi, ton coffre te donne une prime.",
    totalStart: "Sur ton compte et dans ton coffre, tu as",
    totalEnd: (available: number, vault: number) => ` : ${available} disponibles et ${vault} de côté.`,
    everything: "Tout ce que je possède",
    recent: "Derniers mouvements",
    history: "Tout l'historique",
    nothing: "Rien pour l'instant",
    nothingHint: "Quand tu termineras une quête, les pièces arriveront ici.",
  },
  en: {
    loadError: "We can't show your treasure right now.",
    notMoved: "It hasn't moved.",
    retry: "Try again",
    loading: "Opening your account…",
    title: "My account",
    have: "I have ",
    coinWord: (n: number) => (n === 1 ? "coin" : "coins"),
    weekYoung: ["This week: ", " earned, ", " spent"],
    weekOld: "This week: money in",
    outs: "money out",
    diff: "difference",
    saved: "put aside",
    vault: "Magic Vault",
    goalLine: (title: string, present: number, target: number) => `${title}: ${present} of ${target}`,
    reached: " · Goal reached",
    missing: (coins: string) => ` · ${coins} to go`,
    chooseGoal: "Pick a goal: your vault will fill it one coin at a time.",
    mondayPrime: (coins: string) => `Monday: +${coins} bonus`,
    everyMonday: "Every Monday, your vault gives you a bonus.",
    totalStart: "In your account and your vault, you have",
    totalEnd: (available: number, vault: number) => `: ${available} available and ${vault} put aside.`,
    everything: "Everything I own",
    recent: "Latest movements",
    history: "Full history",
    nothing: "Nothing yet",
    nothingHint: "When you finish a quest, your coins will show up here.",
  },
});

export function useMoneyOverview() {
  const [data, setData] = useState<MoneyOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      setData(await api.get<MoneyOverview>("/child/money"));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, failed, reload: load };
}

export function MoneyLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useCopy(COPY);
  return (
    <div className="empty-state" role="alert">
      <strong>{t.loadError}</strong>
      <p>{t.notMoved}</p>
      <button className="btn btn-primary" onClick={onRetry}>
        {t.retry}
      </button>
    </div>
  );
}

/** Mon compte : le solde d'abord, la semaine, Mon coffre, les derniers mouvements. */
export function MoneyAccount() {
  const t = useCopy(COPY);
  const { data, failed, reload } = useMoneyOverview();
  const [open, setOpen] = useState<MoneyLine | null>(null);

  if (failed) return <MoneyLoadError onRetry={() => void reload()} />;
  if (!data) return <p className="loading-message" role="status">{t.loading}</p>;

  const young = data.ageBand === "AGE_8_9";
  const { available, vault } = data.balances;
  const goal = data.goals[0];
  const w = data.week;

  return (
    <div className="money-page">
      <section className="money-passbook" aria-labelledby="account-title">
        <div className="money-passbook-head">
          <h1 id="account-title">{t.title}</h1>
          <CoinArt size={64} className="money-passbook-coin" />
        </div>
        <p className="money-passbook-balance">
          {young && <span className="money-passbook-lead">{t.have}</span>}
          <strong>{available}</strong> <span>{t.coinWord(available)}</span>
        </p>
        <p className="money-passbook-week">
          {young ? (
            <>
              {t.weekYoung[0]}<b>{signed(w.entrees)}</b>{t.weekYoung[1]}<b>{signed(-w.sorties)}</b>{t.weekYoung[2]}
            </>
          ) : (
            <>
              {t.weekOld} <b>{signed(w.entrees)}</b> · {t.outs} <b>{signed(-w.sorties)}</b> · {t.diff} <b>{signed(w.difference)}</b>
              {w.misDeCote > 0 && (
                <>
                  {" "}
                  · {t.saved} <b>{w.misDeCote}</b>
                </>
              )}
            </>
          )}
        </p>
      </section>

      <Link to="/enfant/argent/coffre" className="money-vault-card">
        <ChestArt state={chestStateFor(vault, data.goals)} size={132} className="money-vault-card-chest" />
        <span className="money-vault-card-text">
          <span className="money-vault-card-title">{t.vault}</span>
          <strong>{pieces(vault)}</strong>
          {goal ? (
            <>
              <span>
                {t.goalLine(goal.title, goal.present, goal.targetCoins)}
                {goal.reached ? t.reached : t.missing(pieces(goal.missing))}
              </span>
              <ProgressBar value={goal.present} max={goal.targetCoins} />
            </>
          ) : (
            <span>{t.chooseGoal}</span>
          )}
          {data.vault.prime.active && (
            <span className="money-vault-card-prime">
              {data.vault.prime.next && data.vault.prime.next.amount > 0 ? t.mondayPrime(pieces(data.vault.prime.next.amount)) : t.everyMonday}
            </span>
          )}
        </span>
      </Link>

      {!young && (
        <p className="money-total">
          {t.totalStart} <strong>{pieces(available + vault)}</strong>{t.totalEnd(available, vault)}
          <Link to="/enfant/argent/tout" className="money-total-link">
            {t.everything} <GameIcon name="arrow" size={14} />
          </Link>
        </p>
      )}

      <section aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">{t.recent}</h2>
          <Link to="/enfant/argent/historique">{t.history}</Link>
        </div>
        {data.recent.length === 0 ? (
          <EmptyState art="coin-pouch" title={t.nothing} subtitle={t.nothingHint} />
        ) : (
          <div className="money-lines">
            {data.recent.map((line) => (
              <MoneyLineRow key={line.id} line={line} showBalance={!young} onOpen={setOpen} when="day" />
            ))}
          </div>
        )}
      </section>

      {open && <LineDetailSheet line={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
