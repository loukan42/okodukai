import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { groupByDay, signed, type MoneyLine, type Place, type WeekSummary } from "../../../lib/money";
import { MoneyLineRow } from "../../../components/money/MoneyLineRow";
import { LineDetailSheet } from "../../../components/money/LineDetailSheet";
import { MoneyLoadError } from "./MoneyAccount";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { defineCopy, useCopy } from "../../../i18n";

type Filter = "all" | "in" | "out" | "transfer";

interface HistoryPage {
  items: MoneyLine[];
  nextCursor: string | null;
  week: WeekSummary;
  balance: number;
}

const FILTERS: Filter[] = ["all", "in", "out", "transfer"];

const COPY = defineCopy({
  fr: {
    filters: { all: "Tout", in: "Entrées", out: "Sorties", transfer: "Transferts" } as Record<Filter, string>,
    title: "Historique",
    statement: "Ton relevé de compte",
    account: "Ton compte",
    vault: "Coffre magique",
    colon: " : ",
    place: "Lieu",
    filter: "Filtrer",
    week: "Cette semaine : entrées",
    outs: "sorties",
    diff: "différence",
    saved: "mis de côté",
    back: "repris",
    empty: "Aucun mouvement ici",
    emptyAll: "Les pièces qui entrent et qui sortent apparaîtront ici.",
    emptyFilter: "Rien ne correspond à ce filtre pour l'instant.",
    loading: "Chargement…",
    more: "Voir plus",
  },
  en: {
    filters: { all: "All", in: "Money in", out: "Money out", transfer: "Transfers" },
    title: "History",
    statement: "Your account statement",
    account: "Your account",
    vault: "Magic Vault",
    colon: ": ",
    place: "Place",
    filter: "Filter",
    week: "This week: money in",
    outs: "money out",
    diff: "difference",
    saved: "put aside",
    back: "taken back",
    empty: "No movements here",
    emptyAll: "Coins that come in and go out will show up here.",
    emptyFilter: "Nothing matches this filter yet.",
    loading: "Loading…",
    more: "See more",
  },
});

/** Historique : un relevé de compte, jour par jour, avec des signes toujours écrits. */
export function MoneyHistory() {
  const t = useCopy(COPY);
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
          <h1>{t.title}</h1>
          {older && <p>{t.statement}</p>}
        </div>
        <p className="money-history-balance">
          {place === "account" ? t.account : t.vault}{t.colon}<strong>{balance}</strong>
        </p>
      </header>

      <FinanceTip screen="history" />

      <div className="segmented" role="radiogroup" aria-label={t.place}>
        {(["account", "vault"] as const).map((p) => (
          <label key={p} className={`segmented-option${place === p ? " segmented-option--on" : ""}`}>
            <input type="radio" name="history-place" checked={place === p} onChange={() => setPlace(p)} />
            {p === "account" ? t.account : t.vault}
          </label>
        ))}
      </div>

      {older && (
        <div className="money-chips" role="group" aria-label={t.filter}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`money-chip${filter === f ? " money-chip--on" : ""}`} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {t.filters[f]}
            </button>
          ))}
        </div>
      )}

      {older && week && place === "account" && (
        <p className="money-week-summary">
          {t.week} <b>{signed(week.entrees)}</b> · {t.outs} <b>{signed(-week.sorties)}</b> · {t.diff} <b>{signed(week.difference)}</b> · {t.saved} <b>{week.misDeCote}</b> · {t.back} <b>{week.repris}</b>
        </p>
      )}

      {!loading && items.length === 0 ? (
        <div className="empty-state">
          <strong>{t.empty}</strong>
          <p>{filter === "all" ? t.emptyAll : t.emptyFilter}</p>
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
          {loading ? t.loading : t.more}
        </button>
      )}

      {open && <LineDetailSheet line={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
