import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { groupByDay, signed, type MoneyLine, type Place, type WeekSummary } from "../../../lib/money";
import { MoneyLineRow } from "../../../components/money/MoneyLineRow";
import { LineDetailSheet } from "../../../components/money/LineDetailSheet";
import { MoneyLoadError } from "./MoneyAccount";
import { FinanceTip } from "../../../components/finance/FinanceTip";

type Filter = "all" | "in" | "out" | "transfer";

interface HistoryPage {
  items: MoneyLine[];
  nextCursor: string | null;
  week: WeekSummary;
  balance: number;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "in", label: "Entrées" },
  { value: "out", label: "Sorties" },
  { value: "transfer", label: "Transferts" },
];

/** Historique : un relevé de compte, jour par jour, avec des signes toujours écrits. */
export function MoneyHistory() {
  const { session } = useAuth();
  const older = session?.kind === "child" && session.child.ageBand === "AGE_10_12";
  const [place, setPlace] = useState<Place>("account");
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<MoneyLine[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [balance, setBalance] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<MoneyLine | null>(null);

  const load = useCallback(
    async (after?: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ place, filter, limit: older ? "20" : "10", ...(after ? { cursor: after } : {}) });
        const page = await api.get<HistoryPage>(`/child/money/history?${qs}`);
        setItems((prev) => (after ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setWeek(page.week);
        setBalance(page.balance);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [place, filter, older]
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (failed && items.length === 0) return <MoneyLoadError onRetry={() => void load()} />;

  return (
    <div className="money-page">
      <header className="money-history-head">
        <div>
          <h1>Historique</h1>
          {older && <p>Ton relevé de compte</p>}
        </div>
        <p className="money-history-balance">
          {place === "account" ? "Mon compte" : "Mon coffre"} : <strong>{balance}</strong>
        </p>
      </header>

      <FinanceTip screen="history" />

      <div className="segmented" role="radiogroup" aria-label="Lieu">
        {(["account", "vault"] as const).map((p) => (
          <label key={p} className={`segmented-option${place === p ? " segmented-option--on" : ""}`}>
            <input type="radio" name="history-place" checked={place === p} onChange={() => setPlace(p)} />
            {p === "account" ? "Mon compte" : "Mon coffre"}
          </label>
        ))}
      </div>

      {older && (
        <div className="money-chips" role="group" aria-label="Filtrer">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={`money-chip${filter === f.value ? " money-chip--on" : ""}`} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {older && week && place === "account" && (
        <p className="money-week-summary">
          Cette semaine : entrées <b>{signed(week.entrees)}</b> · sorties <b>{signed(-week.sorties)}</b> · différence <b>{signed(week.difference)}</b> · mis de côté <b>{week.misDeCote}</b> · repris <b>{week.repris}</b>
        </p>
      )}

      {!loading && items.length === 0 ? (
        <div className="empty-state">
          <strong>Aucun mouvement ici</strong>
          <p>{filter === "all" ? "Les pièces qui entrent et qui sortent apparaîtront ici." : "Rien ne correspond à ce filtre pour l'instant."}</p>
        </div>
      ) : (
        groupByDay(items).map((group) => (
          <section key={group.day} className="money-day" aria-label={group.day}>
            <h2 className="money-day-title">{group.day}</h2>
            <div className="money-lines">
              {group.lines.map((line) => (
                <MoneyLineRow key={line.id} line={line} showBalance={older} onOpen={setOpen} />
              ))}
            </div>
          </section>
        ))
      )}

      {cursor && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void load(cursor)} disabled={loading}>
          {loading ? "Chargement…" : "Voir plus"}
        </button>
      )}

      {open && <LineDetailSheet line={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
