import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { units } from "../../../lib/invest";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { XpEarned } from "../../../components/invest/XpEarned";
import { GameIcon } from "../../../components/GameIcon";

interface Possessions {
  coins: { account: number; vault: number; total: number };
  units: { investments: number | null; orchard: number | null; notYetPlaced: number | null; total: number };
  xpAwarded: number;
}

/**
 * Tout ce que je possède (docs/INVESTMENT_UX.md E2, Approfondi) : les pièces et les unités école dans
 * deux groupes, deux totaux qui ne s'additionnent jamais. Pas de total général, pas de camembert.
 */
export function PossessionsPage() {
  const [data, setData] = useState<Possessions | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Possessions>("/child/invest/possessions")
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="form-error" role="alert">Cet écran s'ouvre en niveau Approfondi.</p>;
  if (!data) return <p className="loading-message" role="status">Ouverture…</p>;

  return (
    <div className="money-page">
      <Link to="/enfant/argent" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> Mon compte
      </Link>
      <h1>Tout ce que je possède</h1>
      <XpEarned amount={data.xpAwarded} reason="Nouvel outil" />

      <section className="possessions-group" aria-labelledby="coins-title">
        <h2 id="coins-title">En pièces, pour utiliser en famille</h2>
        <dl>
          <div><dt>Mon compte</dt><dd>{data.coins.account}</dd></div>
          <div><dt>Mon coffre</dt><dd>{data.coins.vault}</dd></div>
          <div className="possessions-total"><dt>Total en pièces</dt><dd>{data.coins.total}</dd></div>
        </dl>
      </section>

      <section className="possessions-group possessions-group--school" aria-labelledby="units-title">
        <h2 id="units-title">En unités école, pour apprendre</h2>
        <dl>
          <div><dt>Mes placements</dt><dd>{data.units.investments === null ? "—" : units(data.units.investments, false)}</dd></div>
          {data.units.orchard !== null && <div><dt>Le verger (assurance-vie)</dt><dd>{units(data.units.orchard, false)}</dd></div>}
          {data.units.notYetPlaced !== null && <div><dt>Capital école pas encore placé</dt><dd>{units(data.units.notYetPlaced, false)}</dd></div>}
          <div className="possessions-total"><dt>Total en unités école</dt><dd>{units(data.units.total, false)}</dd></div>
        </dl>
      </section>

      <p className="library-note" role="note">
        Ces deux totaux ne s'additionnent pas : ce ne sont pas les mêmes unités. Les unités école ne deviennent jamais des pièces.
      </p>
      <FinanceTip screen="patrimoine" />
    </div>
  );
}
