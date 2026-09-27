import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { units } from "../../../lib/invest";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { XpEarned } from "../../../components/invest/XpEarned";
import { GameIcon } from "../../../components/GameIcon";
import { defineCopy, useCopy } from "../../../i18n";

const COPY = defineCopy({
  fr: {
    error: "Cet écran s'ouvre en niveau Approfondi.",
    loading: "Ouverture…",
    back: "Mon compte",
    title: "Tout ce que je possède",
    tool: "Nouvel outil",
    coins: "Tes pièces",
    account: "Mon compte",
    vault: "Coffre magique",
    investments: "Mes placements (valeur actuelle)",
    totalCoins: "Total en pièces, selon la valeur actuelle",
    units: "Tes unités école",
    oldGame: "Ancienne partie de placement",
    orchard: "Le verger (assurance-vie)",
    notPlaced: "Capital école pas encore placé",
    totalUnits: "Total en unités école",
    note: "Les pièces de tes placements peuvent changer de valeur. Le verger utilise des unités école fictives, affichées à part.",
  },
  en: {
    error: "This screen opens at the In depth level.",
    loading: "Opening…",
    back: "My account",
    title: "Everything I own",
    tool: "New tool",
    coins: "Your coins",
    account: "My account",
    vault: "Magic Vault",
    investments: "My investments (current value)",
    totalCoins: "Total in coins, at current value",
    units: "Your practice units",
    oldGame: "Earlier investment game",
    orchard: "The orchard (life insurance)",
    notPlaced: "Practice units not invested yet",
    totalUnits: "Total in practice units",
    note: "The coins in your investments can change in value. The orchard uses pretend practice units, shown separately.",
  },
});

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
  const t = useCopy(COPY);
  const [data, setData] = useState<Possessions | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Possessions>("/child/invest/possessions")
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="form-error" role="alert">{t.error}</p>;
  if (!data) return <p className="loading-message" role="status">{t.loading}</p>;

  return (
    <div className="money-page">
      <Link to="/enfant/argent" className="support-sheet-back">
        <GameIcon name="arrow" size={16} /> {t.back}
      </Link>
      <h1>{t.title}</h1>
      <XpEarned amount={data.xpAwarded} reason={t.tool} />

      <section className="possessions-group" aria-labelledby="coins-title">
        <h2 id="coins-title">{t.coins}</h2>
        <dl>
          <div><dt>{t.account}</dt><dd>{data.coins.account}</dd></div>
          <div><dt>{t.vault}</dt><dd>{data.coins.vault}</dd></div>
          {data.coins.investments !== null && <div><dt>{t.investments}</dt><dd>{units(data.coins.investments, false)}</dd></div>}
          <div className="possessions-total"><dt>{t.totalCoins}</dt><dd>{units(data.coins.total, false)}</dd></div>
        </dl>
      </section>

      <section className="possessions-group possessions-group--school" aria-labelledby="units-title">
        <h2 id="units-title">{t.units}</h2>
        <dl>
          {data.units.investments !== null && <div><dt>{t.oldGame}</dt><dd>{units(data.units.investments, false)}</dd></div>}
          {data.units.orchard !== null && <div><dt>{t.orchard}</dt><dd>{units(data.units.orchard, false)}</dd></div>}
          {data.units.notYetPlaced !== null && <div><dt>{t.notPlaced}</dt><dd>{units(data.units.notYetPlaced, false)}</dd></div>}
          <div className="possessions-total"><dt>{t.totalUnits}</dt><dd>{units(data.units.total, false)}</dd></div>
        </dl>
      </section>

      <p className="library-note" role="note">{t.note}</p>
      <FinanceTip screen="patrimoine" />
    </div>
  );
}
