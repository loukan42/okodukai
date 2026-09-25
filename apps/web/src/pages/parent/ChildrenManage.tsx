import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import { Avatar, AVAILABLE_AVATARS } from "../../components/Avatar";
import { CoinPill } from "../../components/CoinPill";

interface ChildRow {
  id: string;
  displayName: string;
  avatarId: string;
  ageBand: string;
  currentLevel: number;
  balances: { available: number; vault: number };
}

export function ChildrenManage() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState<"AGE_8_9" | "AGE_10_12">("AGE_8_9");
  const [avatarId, setAvatarId] = useState(AVAILABLE_AVATARS[0]);
  const [pin, setPin] = useState("");
  const [creating, setCreating] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ children: ChildRow[] }>("/household/children");
    setChildren(res.children);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName || pin.length !== 4) return;
    setCreating(true);
    try {
      await api.post("/household/children", { displayName, ageBand, avatarId, pin });
      setDisplayName("");
      setPin("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function adjust(childId: string, direction: "credit" | "debit") {
    const amountStr = window.prompt(direction === "credit" ? "Ajouter combien de pièces ?" : "Retirer combien de pièces ?");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const reason = window.prompt("Raison (bonus, cadeau, erreur…)") ?? "Correction";
    setAdjustingId(childId);
    try {
      await api.post(`/household/children/${childId}/wallet/adjust`, { amount, direction, reason });
      await load();
    } finally {
      setAdjustingId(null);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h1 className="font-display" style={{ fontSize: 22, marginBottom: 12 }}>
          Ajouter un enfant
        </h1>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Prénom</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Tranche d'âge</label>
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value as "AGE_8_9" | "AGE_10_12")}>
              <option value="AGE_8_9">8-9 ans</option>
              <option value="AGE_10_12">10-12 ans</option>
            </select>
          </div>
          <div className="field">
            <label>Avatar</label>
            <div className="row-wrap">
              {AVAILABLE_AVATARS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarId(id)}
                  style={{
                    border: id === avatarId ? "2px solid var(--gold)" : "2px solid transparent",
                    borderRadius: "50%",
                    padding: 2,
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <Avatar avatarId={id} />
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Code PIN (4 chiffres)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
            Créer le profil
          </button>
        </form>
      </div>

      <div className="stack">
        {children.map((child) => (
          <div key={child.id} className="card card-row">
            <div className="row">
              <Avatar avatarId={child.avatarId} />
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>{child.displayName}</p>
                <p className="text-sm text-faint" style={{ margin: 0 }}>
                  Niveau {child.currentLevel} · {child.ageBand === "AGE_8_9" ? "8-9 ans" : "10-12 ans"}
                </p>
                <div className="row" style={{ marginTop: 6 }}>
                  <CoinPill amount={child.balances.available} />
                  <span className="pill pill-forest">🏦 {child.balances.vault}</span>
                </div>
              </div>
            </div>
            <div className="row">
              <button className="btn btn-ghost btn-sm" disabled={adjustingId === child.id} onClick={() => adjust(child.id, "credit")}>
                + Pièces
              </button>
              <button className="btn btn-ghost btn-sm" disabled={adjustingId === child.id} onClick={() => adjust(child.id, "debit")}>
                − Pièces
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
