import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { units } from "../../../lib/invest";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { XpEarned } from "../../../components/invest/XpEarned";
import { GameIcon } from "../../../components/GameIcon";

interface Possessions {
  coins: { account: number; vault: number; investments: number | null; total: number };
  units: { investments: number | null; orchard: number | null; notYetPlaced: number | null; total: number };
  xpAwarded: number;
}

/**
 * Les pièces transférées vers un placement restent visibles dans le patrimoine familial.
 * Le verger fictif conserve ses unités école dans un groupe séparé.
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
        <h2 id="coins-title">Tes pièces</h2>
        <dl>
          <div><dt>Mon compte</dt><dd>{data.coins.account}</dd></div>
          <div><dt>Coffre magique</dt><dd>{data.coins.vault}</dd></div>
          {data.coins.investments !== null && <div><dt>Mes placements (valeur actuelle)</dt><dd>{units(data.coins.investments, false)}</dd></div>}
          <div className="possessions-total"><dt>Total en pièces, selon la valeur actuelle</dt><dd>{units(data.coins.total, false)}</dd></div>
        </dl>
      </section>

      <section className="possessions-group possessions-group--school" aria-labelledby="units-title">
        <h2 id="units-title">Tes unités école</h2>
        <dl>
          {data.units.investments !== null && <div><dt>Ancienne partie de placement</dt><dd>{units(data.units.investments, false)}</dd></div>}
          {data.units.orchard !== null && <div><dt>Le verger (assurance-vie)</dt><dd>{units(data.units.orchard, false)}</dd></div>}
          {data.units.notYetPlaced !== null && <div><dt>Capital école pas encore placé</dt><dd>{units(data.units.notYetPlaced, false)}</dd></div>}
          <div className="possessions-total"><dt>Total en unités école</dt><dd>{units(data.units.total, false)}</dd></div>
        </dl>
      </section>

      <p className="library-note" role="note">Les pièces de tes placements peuvent changer de valeur. Le verger utilise des unités école fictives, affichées à part.</p>
      <FinanceTip screen="patrimoine" />
    </div>
  );
}
