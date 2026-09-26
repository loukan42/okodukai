import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { GameIcon } from "../GameIcon";

type Screen = "home" | "history" | "vault" | "bilan" | "verger" | "support" | "patrimoine";
interface Tip {
  code: string;
  title: string | null;
  message: string;
}

/**
 * Feuillet de la bibliothèque (docs/FINANCIAL_EDUCATION.md §5.1) : au plus un par écran, choisi et
 * rempli par le serveur, jamais bloquant. « J'ai compris » ou « Plus tard » le range dans le carnet.
 * `refreshKey` : change quand les données de l'écran changent (nouveau transfert…).
 */
export function FinanceTip({ screen, mode, support, refreshKey }: { screen: Screen; mode?: "MIROIR" | "ASSURANCE_VIE"; support?: string; refreshKey?: unknown }) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ screen, ...(mode ? { mode } : {}), ...(support ? { support } : {}) });
    api
      .get<{ tip: Tip | null }>(`/child/finance/tip?${params}`)
      .then((res) => {
        if (!cancelled) setTip(res.tip);
      })
      .catch(() => {
        /* un feuillet manqué reviendra à la prochaine visite */
      });
    return () => {
      cancelled = true;
    };
  }, [screen, mode, support, refreshKey]);

  if (!tip) return null;

  function act(outcome: "compris" | "plus_tard") {
    const code = tip!.code;
    setTip(null);
    void api.post(`/child/finance/tips/${code}`, { outcome, screen, mode, support }).catch(() => undefined);
  }

  return (
    <aside className="finance-tip" aria-label="Feuillet de la bibliothèque">
      <span className="finance-tip-mark" aria-hidden="true">
        <GameIcon name="learn" size={20} />
      </span>
      <div className="finance-tip-body">
        {tip.title && <strong>{tip.title}</strong>}
        <p>{tip.message}</p>
        <div className="finance-tip-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => act("compris")}>
            J'ai compris
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => act("plus_tard")}>
            Plus tard
          </button>
        </div>
      </div>
    </aside>
  );
}
