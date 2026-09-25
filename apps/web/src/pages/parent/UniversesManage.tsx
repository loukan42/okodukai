import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface UniverseRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  enabled: boolean;
}

export function UniversesManage() {
  const [universes, setUniverses] = useState<UniverseRow[]>([]);

  async function load() {
    const res = await api.get<{ universes: UniverseRow[] }>("/household/universes");
    setUniverses(res.universes);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(universe: UniverseRow) {
    setUniverses((prev) => prev.map((u) => (u.id === universe.id ? { ...u, enabled: !u.enabled } : u)));
    await api.put(`/household/universes/${universe.id}`, { enabled: !universe.enabled });
  }

  return (
    <div className="stack">
      <h1 className="font-display" style={{ fontSize: 22 }}>
        Univers de collection
      </h1>
      <p className="text-faint text-sm">
        Choisissez les univers que votre enfant peut collectionner. Il ne recevra des cartes que dans les
        univers activés.
      </p>
      <div className="stack">
        {universes.map((u) => (
          <label key={u.id} className="card card-row" style={{ cursor: "pointer" }}>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>{u.title}</p>
              <p className="text-sm text-faint" style={{ margin: 0 }}>
                {u.description}
              </p>
            </div>
            <input type="checkbox" checked={u.enabled} onChange={() => toggle(u)} style={{ width: 22, height: 22 }} />
          </label>
        ))}
      </div>
    </div>
  );
}
