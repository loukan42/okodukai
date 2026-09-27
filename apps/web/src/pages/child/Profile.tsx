import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Avatar, AVAILABLE_AVATARS, AVATAR_LABELS, AVATAR_LABELS_EN } from "../../components/Avatar";
import { XpGuide } from "../../components/XpGuide";
import { levelTitle, type LevelView } from "../../lib/levels";
import { ChildCharacter, hasFullBodyCharacter } from "../../components/ChildCharacter";
import { defineCopy, useCopy, useLocale } from "../../i18n";

const copy = defineCopy({
  fr: { loadError: "Impossible de charger ton profil.", saveError: "Impossible de changer ton portrait.", kicker: "Mon personnage", intro: "Ce personnage te représente dans la Vallée d'Okodukai.", level: "Niveau", choose: "Choisis ton portrait", help: "Tu peux le changer quand tu veux. Le choix ne modifie ni tes pièces ni ton XP." },
  en: { loadError: "Could not load your profile.", saveError: "Could not change your portrait.", kicker: "My character", intro: "This character represents you in Okodukai Valley.", level: "Level", choose: "Choose your portrait", help: "You can change it whenever you like. Your choice does not change your coins or XP." },
});


export function Profile() {
  const t = useCopy(copy);
  const { locale } = useLocale();
  const avatarLabels = locale === "fr" ? AVATAR_LABELS : AVATAR_LABELS_EN;
  const { session, refresh } = useAuth();
  const [level, setLevel] = useState<LevelView | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get<{ level: LevelView }>("/child/me").then((result) => setLevel(result.level)).catch(() => setError(t.loadError)); }, [t.loadError]);
  if (session?.kind !== "child") return null;

  async function choose(avatarId: string) {
    setSaving(true); setError(null);
    try { await api.patch("/child/me/avatar", { avatarId }); await refresh(); }
    catch (err) { setError(err instanceof ApiError ? err.message : t.saveError); }
    finally { setSaving(false); }
  }

  return <div className="child-profile-page">
    <header className="character-scene"><div className={hasFullBodyCharacter(session.child.avatarId) ? "character-portrait character-portrait--figure" : "character-portrait"}><ChildCharacter avatarId={session.child.avatarId} pose="proud" className="character-figure-art"/></div><div><p className="scene-kicker">{t.kicker}</p><h1>{session.child.displayName}</h1><p>{t.intro}</p>{level && <p className="character-level-line"><strong>{t.level} {level.level}</strong>{levelTitle(level) && <span> · {levelTitle(level)}</span>}</p>}</div></header>
    {level && <div id="xp" className="character-xp"><XpGuide level={level} /></div>}
    <section className="character-wardrobe" aria-labelledby="wardrobe-title"><div className="section-heading"><h2 id="wardrobe-title">{t.choose}</h2></div><p>{t.help}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="character-roster">{AVAILABLE_AVATARS.map((avatarId, index) => <button className={session.child.avatarId === avatarId ? "character-choice character-choice--selected" : "character-choice"} type="button" key={avatarId} disabled={saving} onClick={() => void choose(avatarId)} aria-label={avatarLabels[index]} aria-pressed={session.child.avatarId === avatarId}><Avatar avatarId={avatarId} /><span>{avatarLabels[index]}</span></button>)}</div></section>
  </div>;
}
