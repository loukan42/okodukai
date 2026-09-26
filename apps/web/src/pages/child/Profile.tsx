import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Avatar, AVAILABLE_AVATARS, AVATAR_LABELS } from "../../components/Avatar";
import { ProgressBar } from "../../components/ProgressBar";
import { GameIcon } from "../../components/GameIcon";

interface Level { level: number; xpIntoLevel: number; xpForNextLevel: number }

export function Profile() {
  const { session, refresh } = useAuth();
  const [level, setLevel] = useState<Level | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get<{ level: Level }>("/child/me").then((result) => setLevel(result.level)).catch(() => setError("Impossible de charger ton profil.")); }, []);
  if (session?.kind !== "child") return null;

  async function choose(avatarId: string) {
    setSaving(true); setError(null);
    try { await api.patch("/child/me/avatar", { avatarId }); await refresh(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Impossible de changer ton portrait."); }
    finally { setSaving(false); }
  }

  return <div className="child-profile-page">
    <header className="character-scene"><div className="character-portrait"><Avatar avatarId={session.child.avatarId} size="lg"/></div><div><p className="scene-kicker">Mon personnage</p><h1>{session.child.displayName}</h1><p>Ce portrait te représente dans la Vallée d'Okodukai.</p>{level && <div className="character-level"><strong>Niveau {level.level}</strong><ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel}/><small>{level.xpIntoLevel} / {level.xpForNextLevel} XP</small></div>}</div></header>
    <section className="character-wardrobe" aria-labelledby="wardrobe-title"><div className="section-heading"><h2 id="wardrobe-title">Choisis ton portrait</h2><Link to="/enfant/collection">Voir mes cartes <GameIcon name="arrow" size={16}/></Link></div><p>Tu peux le changer quand tu veux. Le choix ne modifie ni tes pièces ni ton XP.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="character-roster">{AVAILABLE_AVATARS.map((avatarId, index) => <button className={session.child.avatarId === avatarId ? "character-choice character-choice--selected" : "character-choice"} type="button" key={avatarId} disabled={saving} onClick={() => void choose(avatarId)} aria-label={AVATAR_LABELS[index]} aria-pressed={session.child.avatarId === avatarId}><Avatar avatarId={avatarId} /><span>{AVATAR_LABELS[index]}</span></button>)}</div></section>
  </div>;
}
