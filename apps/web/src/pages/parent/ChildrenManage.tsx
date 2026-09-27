import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { queName } from "../../lib/french";
import { api, ApiError } from "../../lib/api";
import { intentKey } from "../../lib/money";
import { Avatar } from "../../components/Avatar";
import { ChildForm, type ChildFormValues } from "../../components/ChildForm";
import { CoinPill } from "../../components/CoinPill";
import { GameIcon, type GameIconName } from "../../components/GameIcon";
import { VaultRuleEditor } from "../../components/VaultRuleEditor";
import { InvestSettingsEditor } from "../../components/InvestSettingsEditor";
import { PedagogyEditor, type PedagogyLevel } from "../../components/PedagogyEditor";
import { AllowanceEditor } from "../../components/AllowanceEditor";
import { defineCopy, useCopy } from "../../i18n";
import { LEVEL_TITLE, titleCodeForLevel } from "../../lib/levels";

interface ChildRow {
  id: string;
  displayName: string;
  avatarId: string;
  ageBand: string;
  pedagogyLevel: PedagogyLevel;
  currentLevel: number;
  balances: { available: number; vault: number };
}

const COPY = defineCopy({
  fr: {
    title: "Profils des enfants",
    intro: "Créez un profil, choisissez comment les pièces sont reçues et réglez les activités éducatives de chaque enfant.",
    add: "Ajouter un enfant",
    addHint: "Le prénom, l'âge et l'avatar sont visibles dans son espace. Le code à 4 chiffres lui permet de se connecter.",
    meta: (level: number, title: string, young: boolean) => `Niveau ${level} · ${title} · ${young ? "Moins de 9 ans" : "9 ans ou plus"}`,
    spend: "À dépenser",
    vault: "Dans son coffre",
    help: "Les pièces disponibles servent dans la boutique ou aux placements. Le coffre garde les pièces mises de côté pour un projet.",
    sections: {
      allowance: ["Argent de poche et cadeaux", "Versement chaque semaine, cadeau ponctuel"],
      vault: ["Règle du Coffre magique", "Quand les pièces peuvent en sortir"],
      invest: ["Placements", "Rythme des relevés, durée, versements"],
      pedagogy: ["Niveau pédagogique", "Découverte ou Approfondi"],
      adjust: ["Corriger le solde", "Après une erreur, par exemple"],
    } as Record<string, string[]>,
    understanding: (name: string) => `Voir ce ${queName(name)} comprend des placements`,
    adjustHint: "Une correction ajoute une ligne visible dans l'historique de l'enfant, avec votre raison. Rien n'est effacé.",
    amount: "Nombre de pièces",
    reason: "Raison",
    reasonPlaceholder: "Erreur de saisie, oubli…",
    credit: "Ajouter",
    debit: "Retirer",
    done: (sign: string, n: number) => `Correction enregistrée : ${sign}${n} pièces.`,
    failed: "La correction n'a pas été enregistrée. Réessayez.",
  },
  en: {
    title: "Children's profiles",
    intro: "Create a profile, choose how coins come in and set up the learning activities for each child.",
    add: "Add a child",
    addHint: "First name, age and avatar are shown in their space. The 4-digit code lets them log in.",
    meta: (level: number, title: string, young: boolean) => `Level ${level} · ${title} · ${young ? "Under 9" : "9 or over"}`,
    spend: "To spend",
    vault: "In their vault",
    help: "Available coins are for the shop or investing. The vault holds coins set aside for a goal.",
    sections: {
      allowance: ["Pocket money and gifts", "A weekly amount, a one-off gift"],
      vault: ["Magic Vault rule", "When coins can come out"],
      invest: ["Investing", "Statement pace, game length, deposits"],
      pedagogy: ["Learning level", "Discovery or In depth"],
      adjust: ["Correct the balance", "After a mistake, for example"],
    },
    understanding: (name: string) => `See what ${name} understands about investing`,
    adjustHint: "A correction adds a line to your child's history, with your reason. Nothing is erased.",
    amount: "Number of coins",
    reason: "Reason",
    reasonPlaceholder: "Typo, something forgotten…",
    credit: "Add",
    debit: "Take away",
    done: (sign: string, n: number) => `Correction saved: ${sign}${n} coins.`,
    failed: "The correction wasn't saved. Please try again.",
  },
});

type Copy = (typeof COPY)["fr"];

/** Une section de réglages repliable : le parent ouvre seulement ce qu'il veut changer. */
function SettingsSection({ id, icon, title, hint, children }: { id: string; icon: GameIconName; title: string; hint: string; children: ReactNode }) {
  return (
    <details className="child-settings-section" id={id}>
      <summary>
        <span className="child-settings-icon" aria-hidden="true">
          <GameIcon name={icon} size={18} />
        </span>
        <span className="child-settings-text">
          <strong>{title}</strong>
          <small>{hint}</small>
        </span>
        <span className="child-settings-chevron" aria-hidden="true" />
      </summary>
      <div className="child-settings-body">{children}</div>
    </details>
  );
}

/** Correction ponctuelle du solde : une ligne compensatoire dans le ledger, jamais une réécriture. */
function BalanceAdjust({ child, t, onDone }: { child: ChildRow; t: Copy; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [key, setKey] = useState(intentKey);

  async function submit(direction: "credit" | "debit", e?: FormEvent) {
    e?.preventDefault();
    if (!reason.trim() || amount < 1) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.post(`/household/children/${child.id}/wallet/adjust`, { amount, direction, reason: reason.trim(), idempotencyKey: key });
      setKey(intentKey());
      setStatus({ tone: "ok", text: t.done(direction === "credit" ? "+" : "−", amount) });
      setReason("");
      await onDone();
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="balance-adjust" onSubmit={(e) => void submit("credit", e)}>
      <p className="money-hint">{t.adjustHint}</p>
      <div className="grid-2">
        <div className="field">
          <label htmlFor={`adjust-amount-${child.id}`}>{t.amount}</label>
          <input id={`adjust-amount-${child.id}`} type="number" inputMode="numeric" min={1} max={10000} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div className="field">
          <label htmlFor={`adjust-reason-${child.id}`}>{t.reason}</label>
          <input id={`adjust-reason-${child.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t.reasonPlaceholder} required />
        </div>
      </div>
      <div className="row-wrap">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !reason.trim()} onClick={() => void submit("credit")}>
          + {t.credit}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !reason.trim()} onClick={() => void submit("debit")}>
          − {t.debit}
        </button>
      </div>
      {status && (
        <p className={`money-message money-message--${status.tone}`} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>
      )}
    </form>
  );
}

export function ChildrenManage() {
  const t = useCopy(COPY);
  const [children, setChildren] = useState<ChildRow[] | null>(null);
  const [creating, setCreating] = useState(false);

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

  const list = children ?? [];

  return (
    <div className="stack parent-manage-page children-manage-page">
      <header className="parent-page-intro">
        <div className="parent-page-intro-icon"><GameIcon name="user" size={27}/></div>
        <div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </header>

      <div className="stack children-profiles">
        {list.map((child) => (
          <section key={child.id} className="card child-profile-card" aria-labelledby={`profile-${child.id}`}>
            <div className="child-profile-head">
              <div className="child-profile-identity">
                <Avatar avatarId={child.avatarId} size="lg" />
                <div>
                  <h2 id={`profile-${child.id}`}>{child.displayName}</h2>
                  <p>{t.meta(child.currentLevel, LEVEL_TITLE[titleCodeForLevel(child.currentLevel)], child.ageBand === "AGE_8_9")}</p>
                </div>
              </div>
              <div className="child-profile-balances">
                <div><span>{t.spend}</span><CoinPill amount={child.balances.available}/></div>
                <div><span>{t.vault}</span><span className="pill pill-forest"><GameIcon name="vault" size={16}/> {child.balances.vault}</span></div>
              </div>
            </div>
            <p className="child-profile-help">{t.help}</p>
            <div className="child-settings">
              <SettingsSection id={`allowance-${child.id}`} icon="coin" title={t.sections.allowance[0]} hint={t.sections.allowance[1]}>
                <AllowanceEditor childId={child.id} childName={child.displayName} />
              </SettingsSection>
              <SettingsSection id={`vault-${child.id}`} icon="vault" title={t.sections.vault[0]} hint={t.sections.vault[1]}>
                <VaultRuleEditor childId={child.id} childName={child.displayName} />
              </SettingsSection>
              <SettingsSection id={`invest-${child.id}`} icon="learn" title={t.sections.invest[0]} hint={t.sections.invest[1]}>
                <InvestSettingsEditor childId={child.id} />
              </SettingsSection>
              <SettingsSection id={`pedagogy-${child.id}`} icon="flag" title={t.sections.pedagogy[0]} hint={t.sections.pedagogy[1]}>
                <PedagogyEditor childId={child.id} initial={child.pedagogyLevel ?? "AUTO"} ageBand={child.ageBand} />
              </SettingsSection>
              <SettingsSection id={`adjust-${child.id}`} icon="check" title={t.sections.adjust[0]} hint={t.sections.adjust[1]}>
                <BalanceAdjust child={child} t={t} onDone={load} />
              </SettingsSection>
            </div>
            <div className="child-profile-footer"><Link to={`/parent/enfants/${child.id}/placements`} className="btn btn-ghost btn-sm">
              {t.understanding(child.displayName)}
            </Link></div>
          </section>
        ))}
      </div>

      {children !== null && (
        <details className="card parent-form-panel child-add-panel" open={list.length === 0}>
          <summary>
            <h2 className="parent-form-title">{t.add}</h2>
          </summary>
          <p className="money-hint">{t.addHint}</p>
          <ChildForm onSubmit={onSubmit} submitting={creating} />
        </details>
      )}
    </div>
  );
}
