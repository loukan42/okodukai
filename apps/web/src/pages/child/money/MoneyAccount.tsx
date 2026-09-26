import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { chestStateFor, pieces, signed, type MoneyLine, type MoneyOverview } from "../../../lib/money";
import { CoinArt } from "../../../art/CoinArt";
import { ChestArt } from "../../../art/ChestArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { MoneyLineRow } from "../../../components/money/MoneyLineRow";
import { LineDetailSheet } from "../../../components/money/LineDetailSheet";

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
  return (
    <div className="empty-state" role="alert">
      <strong>Impossible d'afficher ton argent pour l'instant.</strong>
      <p>Il n'a pas bougé.</p>
      <button className="btn btn-primary" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}

/** Mon compte : le solde d'abord, la semaine, Mon coffre, les derniers mouvements. */
export function MoneyAccount() {
  const { data, failed, reload } = useMoneyOverview();
  const [open, setOpen] = useState<MoneyLine | null>(null);

  if (failed) return <MoneyLoadError onRetry={() => void reload()} />;
  if (!data) return <p className="loading-message" role="status">Ton compte s'ouvre…</p>;

  const young = data.ageBand === "AGE_8_9";
  const { available, vault } = data.balances;
  const goal = data.goals[0];
  const w = data.week;

  return (
    <div className="money-page">
      <section className="money-passbook" aria-labelledby="account-title">
        <div className="money-passbook-head">
          <h1 id="account-title">Mon compte</h1>
          <CoinArt size={64} className="money-passbook-coin" />
        </div>
        <p className="money-passbook-balance">
          {young && <span className="money-passbook-lead">J'ai </span>}
          <strong>{available}</strong> <span>{available === 1 || available === 0 ? "pièce" : "pièces"}</span>
        </p>
        <p className="money-passbook-week">
          {young ? (
            <>
              Cette semaine : <b>{signed(w.entrees)}</b> gagnées, <b>{signed(-w.sorties)}</b> dépensées
            </>
          ) : (
            <>
              Cette semaine : entrées <b>{signed(w.entrees)}</b> · sorties <b>{signed(-w.sorties)}</b> · différence <b>{signed(w.difference)}</b>
              {w.misDeCote > 0 && (
                <>
                  {" "}
                  · mis de côté <b>{w.misDeCote}</b>
                </>
              )}
            </>
          )}
        </p>
      </section>

      <Link to="/enfant/argent/coffre" className="money-vault-card">
        <ChestArt state={chestStateFor(vault, data.goals)} size={132} className="money-vault-card-chest" />
        <span className="money-vault-card-text">
          <span className="money-vault-card-title">Mon coffre</span>
          <strong>{pieces(vault)}</strong>
          {goal ? (
            <>
              <span>
                {goal.title} : {goal.present} sur {goal.targetCoins}
                {goal.reached ? " · Objectif atteint" : ` · Il te manque ${pieces(goal.missing)}`}
              </span>
              <ProgressBar value={goal.present} max={goal.targetCoins} />
            </>
          ) : (
            <span>Choisis un objectif : ton coffre le remplira pièce après pièce.</span>
          )}
        </span>
      </Link>

      {!young && (
        <p className="money-total">
          Tout mon argent : <strong>{pieces(available + vault)}</strong> (Mon compte {available} + Mon coffre {vault})
        </p>
      )}

      <section aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">Derniers mouvements</h2>
          <Link to="/enfant/argent/historique">Tout l'historique</Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="empty-state">
            <strong>Rien pour l'instant</strong>
            <p>Quand tu termineras une quête, les pièces arriveront ici.</p>
          </div>
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
