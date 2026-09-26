import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { ChildForm, type ChildFormValues } from "../../components/ChildForm";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon } from "../../components/GameIcon";
import { VaultRuleEditor } from "../../components/VaultRuleEditor";
import { InvestSettingsEditor } from "../../components/InvestSettingsEditor";
import { PedagogyEditor, type PedagogyLevel } from "../../components/PedagogyEditor";
import { AllowanceEditor } from "../../components/AllowanceEditor";

interface ChildRow {
  id: string;
  displayName: string;
  avatarId: string;
  ageBand: string;
  pedagogyLevel: PedagogyLevel;
  currentLevel: number;
  balances: { available: number; vault: number };
}

export function ChildrenManage() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ children: ChildRow[] }>("/household/children");
    setChildren(res.children);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(values: ChildFormValues) {
    setCreating(true);
    try {
      await api.post("/household/children", values);
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
    <div className="stack parent-manage-page">
      <div className="card parent-form-panel">
        <h1 className="parent-form-title"><GameIcon name="user" size={27}/> Ajouter un enfant</h1>
        <ChildForm onSubmit={onSubmit} submitting={creating} />
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
                  <span className="pill pill-forest"><GameIcon name="vault" size={16}/> {child.balances.vault}</span>
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
            <AllowanceEditor childId={child.id} childName={child.displayName} />
            <VaultRuleEditor childId={child.id} childName={child.displayName} />
            <PedagogyEditor childId={child.id} initial={child.pedagogyLevel ?? "AUTO"} ageBand={child.ageBand} />
            <InvestSettingsEditor childId={child.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
