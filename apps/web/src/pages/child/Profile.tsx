import { useEffect, useState } from "react";
import { COSMETIC_FRAMES, type CosmeticFrameId } from "@okodukai/shared";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Avatar, AVAILABLE_AVATARS, AVATAR_LABELS, AVATAR_LABELS_EN } from "../../components/Avatar";
import { XpGuide } from "../../components/XpGuide";
import { levelTitle, type LevelView } from "../../lib/levels";
import { ChildCharacter, hasFullBodyCharacter } from "../../components/ChildCharacter";
import { defineCopy, useCopy, useLocale } from "../../i18n";

const copy = defineCopy({
  fr: { loadError: "Impossible de charger ton profil.", saveError: "Impossible de changer ton portrait.", frameSaveError: "Impossible de changer ton cadre. Réessaie.", kicker: "Mon personnage", intro: "Ce personnage te représente dans la Vallée d'Okodukai.", level: "Niveau", choose: "Choisis ton portrait", help: "Tu peux le changer quand tu veux. Le choix ne modifie ni tes pièces ni ton XP.", frameTitle: "Les cadres de ton portrait", frameIntro: "Tes niveaux ouvrent de nouveaux cadres. Choisis celui que tu préfères : ils sont décoratifs.", frameEquipped: "Cadre choisi", frameAvailable: "Disponible", frameLocked: (level: number) => `Se débloque au niveau ${level}`, frames: { none: "Sans cadre", camp: "Campement", grove: "Jardin de la vallée", observatory: "Observatoire" } },
  en: { loadError: "Could not load your profile.", saveError: "Could not change your portrait.", frameSaveError: "Could not change your frame. Try again.", kicker: "My character", intro: "This character represents you in Okodukai Valley.", level: "Level", choose: "Choose your portrait", help: "You can change it whenever you like. Your choice does not change your coins or XP.", frameTitle: "Portrait frames", frameIntro: "Your levels unlock new frames. Pick your favourite: they are decorative.", frameEquipped: "Chosen frame", frameAvailable: "Available", frameLocked: (level: number) => `Unlocks at level ${level}`, frames: { none: "No frame", camp: "Camp", grove: "Valley garden", observatory: "Observatory" } },
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
  const chosenFrame = session.child.frameId ?? "none";

  async function choose(avatarId: string) {
    setSaving(true); setError(null);
    try { await api.patch("/child/me/avatar", { avatarId }); await refresh(); }
    catch { setError(t.saveError); }
    finally { setSaving(false); }
  }

  async function chooseFrame(frameId: CosmeticFrameId) {
    setSaving(true); setError(null);
    try { await api.patch("/child/me/frame", { frameId }); await refresh(); }
    catch { setError(t.frameSaveError); }
    finally { setSaving(false); }
  }

  return <div className="child-profile-page">
    <header className="character-scene"><div className={hasFullBodyCharacter(session.child.avatarId) ? "character-portrait character-portrait--figure" : "character-portrait"}><ChildCharacter avatarId={session.child.avatarId} pose="proud" className="character-figure-art"/></div><div><p className="scene-kicker">{t.kicker}</p><h1>{session.child.displayName}</h1><p>{t.intro}</p>{level && <p className="character-level-line"><strong>{t.level} {level.level}</strong>{levelTitle(level) && <span> · {levelTitle(level)}</span>}</p>}<div className="character-frame-equipped"><Avatar avatarId={session.child.avatarId} frameId={chosenFrame} /><span>{t.frameEquipped} : {t.frames[chosenFrame as CosmeticFrameId] ?? t.frames.none}</span></div></div></header>
    {level && <div id="xp" className="character-xp"><XpGuide level={level} /></div>}
    <section className="character-wardrobe" aria-labelledby="wardrobe-title"><div className="section-heading"><h2 id="wardrobe-title">{t.choose}</h2></div><p>{t.help}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="character-roster">{AVAILABLE_AVATARS.map((avatarId, index) => <button className={session.child.avatarId === avatarId ? "character-choice character-choice--selected" : "character-choice"} type="button" key={avatarId} disabled={saving} onClick={() => void choose(avatarId)} aria-label={avatarLabels[index]} aria-pressed={session.child.avatarId === avatarId}><Avatar avatarId={avatarId} frameId={chosenFrame} /><span>{avatarLabels[index]}</span></button>)}</div></section>
    <section className="character-wardrobe character-frame-wardrobe" aria-labelledby="frames-title"><div className="section-heading"><h2 id="frames-title">{t.frameTitle}</h2></div><p>{t.frameIntro}</p><div className="character-frames">{COSMETIC_FRAMES.map((frame) => {
      const unlocked = level !== null && level.level >= frame.level;
      return <button className={`character-frame-choice${chosenFrame === frame.id ? " character-frame-choice--selected" : ""}${unlocked ? "" : " character-frame-choice--locked"}`} type="button" key={frame.id} disabled={saving || !unlocked} onClick={() => void chooseFrame(frame.id)} aria-pressed={chosenFrame === frame.id} aria-label={`${t.frames[frame.id]}. ${unlocked ? t.frameAvailable : t.frameLocked(frame.level)}`}><Avatar avatarId={session.child.avatarId} frameId={frame.id} size="lg" /><strong>{t.frames[frame.id]}</strong><span>{unlocked ? t.frameAvailable : t.frameLocked(frame.level)}</span></button>;
    })}</div></section>
  </div>;
}
