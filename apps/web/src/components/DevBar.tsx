import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { CardRarity } from "@okodukai/shared";
import { RARITY_LABELS } from "../lib/rarity";
import { useAuth, LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import { GameIcon } from "./GameIcon";
import { BoosterOpenOverlay, type RevealedCard } from "./booster/BoosterOpenOverlay";

const PREVIEW_RARITIES: CardRarity[] = ["COMMUNE", "RARE", "EPIQUE", "LEGENDAIRE"];

interface DevHousehold {
  id: string;
  name: string;
  parents: { userId: string; email: string; displayName: string; role: string }[];
  children: { childId: string; displayName: string; avatarId: string; ageBand: string }[];
}

/**
 * Barre d'outils développeur : connexion instantanée sur les comptes de démo,
 * sans mot de passe ni PIN. Ne s'affiche qu'en build de développement
 * (`import.meta.env.DEV`, toujours false en production) et si l'API expose
 * ses routes /dev/* (désactivées côté serveur quand NODE_ENV=production).
 */
export function DevBar() {
  const navigate = useNavigate();
  const { refresh, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [households, setHouseholds] = useState<DevHousehold[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  // Aperçu de l'ouverture avec de vraies cartes d'une rareté donnée : rien n'est crédité.
  const [preview, setPreview] = useState<CardRarity | null>(null);

  async function load() {
    try {
      const res = await api.get<{ households: DevHousehold[] }>("/dev/accounts");
      setHouseholds(res.households);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!available) return null;

  async function loginAsParent(userId: string, householdId: string) {
    setBusy(true);
    try {
      await api.post("/dev/login-as-parent", { userId });
      localStorage.setItem(LAST_HOUSEHOLD_KEY, householdId);
      await refresh();
      setOpen(false);
      navigate("/parent", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function loginAsChild(childId: string, householdId: string) {
    setBusy(true);
    try {
      await api.post("/dev/login-as-child", { childId });
      localStorage.setItem(LAST_HOUSEHOLD_KEY, householdId);
      await refresh();
      setOpen(false);
      navigate("/enfant", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function grantBoosters(childId: string) {
    setBusy(true);
    try {
      await api.post("/dev/grant-boosters", { childId, count: 3 });
      setOpen(false);
      if (window.location.pathname === "/enfant/collection") window.location.reload();
      else navigate("/enfant/collection");
    } finally {
      setBusy(false);
    }
  }

  async function reseed() {
    if (!window.confirm("Réinitialiser toutes les données avec le jeu de démo ? Cette action efface les données existantes.")) {
      return;
    }
    setBusy(true);
    try {
      await api.post("/dev/reseed");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev-bar" style={{ position: "fixed", bottom: 86, right: 12, zIndex: 200, fontFamily: "var(--font-interface)" }}>
      {open && (
        <div
          className="card"
          style={{
            width: 300,
            maxHeight: "70vh",
            overflowY: "auto",
            marginBottom: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontWeight: 800, margin: 0 }}>Outils de démo</p>
            <button className="btn btn-ghost btn-sm" onClick={reseed} disabled={busy}>
              Réinitialiser
            </button>
          </div>

          {session?.kind === "child" && (
            <div style={{ marginBottom: 14 }}>
              <p className="text-sm text-faint" style={{ fontWeight: 700, marginBottom: 6 }}>
                Boosters de {session.child.displayName}
              </p>
              <button className="btn btn-ghost btn-sm btn-block" disabled={busy} onClick={() => grantBoosters(session.child.id)}>
                <GameIcon name="gift" size={17} />Donner 3 boosters
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {PREVIEW_RARITIES.map((rarity) => (
                  <button key={rarity} className="btn btn-ghost btn-sm" onClick={() => { setPreview(rarity); setOpen(false); }}>
                    Aperçu {RARITY_LABELS[rarity].toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {households === null && <p className="text-sm text-faint">Chargement…</p>}
          {households?.length === 0 && (
            <p className="text-sm text-faint">Aucune donnée. Clique sur "Réinitialiser" pour créer le foyer de démo.</p>
          )}

          {households?.map((h) => (
            <div key={h.id} style={{ marginBottom: 14 }}>
              <p className="text-sm text-faint" style={{ fontWeight: 700, marginBottom: 6 }}>
                {h.name}
              </p>
              <div className="stack" style={{ gap: 6 }}>
                {h.parents.map((p) => (
                  <button
                    key={p.userId}
                    className="btn btn-ghost btn-sm btn-block"
                    disabled={busy}
                    onClick={() => loginAsParent(p.userId, h.id)}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <GameIcon name="user" size={17}/>{p.displayName} (parent)
                  </button>
                ))}
                {h.children.map((c) => (
                  <button
                    key={c.childId}
                    className="btn btn-ghost btn-sm btn-block"
                    disabled={busy}
                    onClick={() => loginAsChild(c.childId, h.id)}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <GameIcon name="user" size={17}/>{c.displayName} (enfant)
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        className="btn btn-primary btn-sm"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
        onClick={() => setOpen((o) => !o)}
      >
        Démo
      </button>
      <BoosterOpenOverlay
        key={preview ?? "sans-apercu"}
        open={preview !== null}
        universeTitle="Aperçu"
        onOpen={async () => (await api.get<{ cards: RevealedCard[] }>(`/dev/sample-cards?rarity=${preview}`)).cards}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
