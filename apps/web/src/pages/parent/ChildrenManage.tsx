import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { queName } from "../../lib/french";
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
    <div className="stack parent-manage-page children-manage-page">
      <header className="parent-page-intro">
        <div className="parent-page-intro-icon"><GameIcon name="user" size={27}/></div>
        <div>
          <h1>Profils des enfants</h1>
          <p>Créez un profil, choisissez comment les pièces sont reçues et réglez les activités éducatives de chaque enfant.</p>
        </div>
      </header>
      <section className="card parent-form-panel" aria-labelledby="add-child-title">
        <h2 id="add-child-title" className="parent-form-title">Ajouter un enfant</h2>
        <p className="money-hint">Le prénom, l'âge et l'avatar sont visibles dans son espace. Le code à 4 chiffres lui permet de se connecter.</p>
        <ChildForm onSubmit={onSubmit} submitting={creating} />
      </section>

      <div className="stack children-profiles">
        {children.map((child) => (
          <section key={child.id} className="card child-profile-card" aria-labelledby={`profile-${child.id}`}>
            <div className="child-profile-head">
              <div className="child-profile-identity">
                <Avatar avatarId={child.avatarId} size="lg" />
                <div>
                  <h2 id={`profile-${child.id}`}>{child.displayName}</h2>
                  <p>Niveau {child.currentLevel} · {child.ageBand === "AGE_8_9" ? "Moins de 9 ans" : "9 ans ou plus"}</p>
                </div>
              </div>
              <div className="child-profile-balances">
                <div><span>À dépenser</span><CoinPill amount={child.balances.available}/></div>
                <div><span>Dans son coffre</span><span className="pill pill-forest"><GameIcon name="vault" size={16}/> {child.balances.vault}</span></div>
              </div>
            </div>
            <p className="child-profile-help">Les pièces disponibles servent dans la boutique ou aux placements. Le coffre garde les pièces mises de côté pour un projet.</p>
            <div className="child-profile-adjust">
              <span>Correction ponctuelle du solde, par exemple après une erreur :</span>
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
            <div className="child-profile-footer"><Link to={`/parent/enfants/${child.id}/placements`} className="btn btn-ghost btn-sm">
              Voir ce {queName(child.displayName)} comprend des placements
            </Link></div>
          </section>
        ))}
      </div>
    </div>
  );
}
