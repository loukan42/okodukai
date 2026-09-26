import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { GameIcon } from "../../components/GameIcon";

interface UniverseRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  enabled: boolean;
}

export function UniversesManage() {
  const [universes, setUniverses] = useState<UniverseRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ universes: UniverseRow[] }>("/household/universes");
    setUniverses(res.universes);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(universe: UniverseRow) {
    setError(null);
    try {
      await api.put(`/household/universes/${universe.id}`, { enabled: !universe.enabled });
      setUniverses((prev) => prev.map((u) => (u.id === universe.id ? { ...u, enabled: !u.enabled } : u)));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Impossible de modifier cet univers.");
    }
  }

  return (
    <div className="stack parent-manage-page">
      <h1 className="parent-form-title"><GameIcon name="collection" size={27}/> Univers de collection</h1>
      <p className="text-faint text-sm">
        Choisissez les univers que votre enfant peut collectionner. Il ne recevra des cartes que dans les
        univers activés. Chaque quête validée offre un booster d'un de ces univers.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="stack">
        {universes.map((u) => (
          <label key={u.id} className="card card-row universe-toggle" style={{ cursor: "pointer" }}>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>{u.title}</p>
              <p className="text-sm text-faint" style={{ margin: 0 }}>
                {u.description}
              </p>
            </div>
            <input type="checkbox" checked={u.enabled} onChange={() => void toggle(u)} style={{ width: 22, height: 22 }} />
          </label>
        ))}
      </div>
    </div>
  );
}
