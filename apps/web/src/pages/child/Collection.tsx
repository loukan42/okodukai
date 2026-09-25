import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { ProgressBar } from "../../components/ProgressBar";

interface Universe {
  id: string;
  code: string;
  title: string;
  description: string | null;
}

export function Collection() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [completion, setCompletion] = useState<Record<string, { owned: number; total: number }>>({});

  useEffect(() => {
    api.get<{ universes: Universe[] }>("/child/universes").then(async (res) => {
      setUniverses(res.universes);
      const entries = await Promise.all(
        res.universes.map(async (u) => {
          const detail = await api.get<{ completion: { owned: number; total: number } }>(
            `/child/collection/${u.id}`
          );
          return [u.id, detail.completion] as const;
        })
      );
      setCompletion(Object.fromEntries(entries));
    });
  }, []);

  if (universes.length === 0) {
    return <EmptyState emoji="🃏" title="Aucun univers activé" subtitle="Demande à un parent d'activer un univers de collection." />;
  }

  return (
    <div className="stack">
      <h1 className="font-display" style={{ fontSize: 24 }}>
        Ma collection
      </h1>
      {universes.map((u) => {
        const c = completion[u.id];
        return (
          <Link key={u.id} to={`/enfant/collection/${u.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{u.title}</p>
            <p className="text-sm text-faint" style={{ marginTop: 4 }}>
              {u.description}
            </p>
            {c && (
              <div style={{ marginTop: 12 }}>
                <ProgressBar value={c.owned} max={c.total} />
                <p className="text-sm text-faint" style={{ marginTop: 6 }}>
                  {c.owned} / {c.total}
                </p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
