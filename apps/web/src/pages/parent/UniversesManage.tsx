import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { GameIcon } from "../../components/GameIcon";
import { defineCopy, useCopy } from "../../i18n";

interface UniverseRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  enabled: boolean;
}

const COPY = defineCopy({
  fr: {
    title: "Univers de collection",
    intro:
      "Choisissez les univers que votre enfant peut collectionner. Il ne recevra des cartes que dans les univers activés. Toutes les trois quêtes validées, un booster d'un de ces univers est offert.",
    selectAll: "Tout sélectionner",
    count: (on: number, total: number) => `${on} sur ${total} activés`,
    keepOne: (title: string) => `Au moins un univers reste actif pour les boosters : « ${title} » est gardé. Cochez ceux que vous voulez, puis décochez-le.`,
    toggleError: "Impossible de modifier cet univers.",
    bulkError: "Impossible de modifier la sélection.",
    loading: "Chargement des univers…",
  },
  en: {
    title: "Card worlds",
    intro:
      "Choose the worlds your child can collect. Cards only come from the worlds you turn on. Every third approved quest gives a booster from one of them.",
    selectAll: "Select all",
    count: (on: number, total: number) => `${on} of ${total} on`,
    keepOne: (title: string) => `At least one world has to stay on for boosters, so "${title}" is kept. Tick the ones you want, then untick it.`,
    toggleError: "We couldn't change this world.",
    bulkError: "We couldn't change the selection.",
    loading: "Loading worlds…",
  },
});

export function UniversesManage() {
  const t = useCopy(COPY);
  const [universes, setUniverses] = useState<UniverseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const allRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await api.get<{ universes: UniverseRow[] }>("/household/universes");
    setUniverses(res.universes);
  }

  useEffect(() => {
    load();
  }, []);

  const list = universes ?? [];
  const enabledCount = list.filter((u) => u.enabled).length;
  const allOn = list.length > 0 && enabledCount === list.length;

  // Case « Tout sélectionner » à moitié cochée quand une partie seulement est activée.
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = enabledCount > 0 && !allOn;
  }, [enabledCount, allOn]);

  async function toggle(universe: UniverseRow) {
    setError(null);
    setNotice(null);
    try {
      await api.put(`/household/universes/${universe.id}`, { enabled: !universe.enabled });
      setUniverses((prev) => prev && prev.map((u) => (u.id === universe.id ? { ...u, enabled: !u.enabled } : u)));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t.toggleError);
    }
  }

  async function toggleAll() {
    if (!list.length || saving) return;
    setError(null);
    setNotice(null);
    // Tout décocher garderait zéro univers : on garde le premier et on le dit.
    const keep = allOn ? list[0] : null;
    const enabledIds = keep ? [keep.id] : list.map((u) => u.id);
    setSaving(true);
    try {
      await api.put("/household/universes", { enabledIds });
      setUniverses((prev) => prev && prev.map((u) => ({ ...u, enabled: enabledIds.includes(u.id) })));
      if (keep) setNotice(t.keepOne(keep.title));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t.bulkError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack parent-manage-page">
      <h1 className="parent-form-title"><GameIcon name="collection" size={27}/> {t.title}</h1>
      <p className="text-faint text-sm">{t.intro}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {universes === null ? (
        <p className="text-faint">{t.loading}</p>
      ) : (
        <>
          <label className="card card-row universe-toggle universe-toggle--all">
            <div>
              <p className="universe-toggle-title">{t.selectAll}</p>
              <p className="text-sm text-faint universe-toggle-text">{t.count(enabledCount, list.length)}</p>
            </div>
            <input ref={allRef} type="checkbox" checked={allOn} disabled={saving} onChange={() => void toggleAll()} />
          </label>
          {notice && <p className="text-sm universe-notice" role="status">{notice}</p>}
          <div className="stack">
            {list.map((u) => (
              <label key={u.id} className="card card-row universe-toggle">
                <div>
                  <p className="universe-toggle-title">{u.title}</p>
                  {u.description && <p className="text-sm text-faint universe-toggle-text">{u.description}</p>}
                </div>
                <input type="checkbox" checked={u.enabled} disabled={saving} onChange={() => void toggle(u)} />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
