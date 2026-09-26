import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { CoinFlight, type Flight } from "../../../art/CoinFlight";
import { api, ApiError } from "../../../lib/api";
import { chestStateFor, intentKey, pieces, type MoneyOverview } from "../../../lib/money";
import { ChestArt } from "../../../art/ChestArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { MoneyLoadError, useMoneyOverview } from "./MoneyAccount";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { FinanceQuestion } from "../../../components/finance/FinanceQuestion";
import { VaultPrimeCard } from "../../../components/money/VaultPrimeCard";
import { VaultExplainer } from "../../../components/money/VaultExplainer";

type Mode = "lock" | "unlock";

const DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const EXPLAINED_KEY = "okodukai:coffre-explique";

/** L'explication s'ouvre d'elle-même à la première visite (confort local, sans enjeu si perdu). */
function explainedBefore() {
  try {
    return window.localStorage.getItem(EXPLAINED_KEY) === "1";
  } catch {
    return false;
  }
}

/** La règle, dite avant le dépôt : l'enfant dépose en connaissance de cause. */
function ruleSentence(vault: MoneyOverview["vault"]) {
  switch (vault.mode) {
    case "PARENT_APPROVAL":
      return "Pour reprendre des pièces du coffre, un parent devra valider.";
    case "MIN_DAYS":
      return `Les pièces que tu mets de côté restent dans ton coffre au moins ${vault.minDays} jours.`;
    case "GOAL_ONLY":
      return "Tu pourras reprendre ces pièces quand ton objectif sera atteint.";
    default:
      return "Tu peux reprendre tes pièces quand tu veux.";
  }
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="money-stepper">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Une pièce de moins">
        −
      </button>
      <output aria-live="polite">{pieces(value)}</output>
      <button type="button" onClick={() => onChange(Math.min(Math.max(1, max), value + 1))} disabled={value >= max} aria-label="Une pièce de plus">
        +
      </button>
    </div>
  );
}

/** Mon coffre : mettre de côté, reprendre, et les objectifs remplis l'un après l'autre. */
export function MoneyVault() {
  const { data, failed, reload } = useMoneyOverview();
  const [mode, setMode] = useState<Mode>("lock");
  const [amount, setAmount] = useState(10);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "info" | "error"; text: string } | null>(null);
  const key = useRef(intentKey());
  const reduce = useReducedMotion();
  const chestRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [bump, setBump] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(50);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<{ id: string; title: string; priceCoins: number }[]>([]);
  const [explained] = useState(explainedBefore);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXPLAINED_KEY, "1");
    } catch {
      /* navigation privée : l'explication restera ouverte */
    }
  }, []);

  useEffect(() => {
    api
      .get<{ rewards: { id: string; title: string; priceCoins: number }[] }>("/child/rewards")
      .then((r) => setRewards(r.rewards))
      .catch(() => setRewards([]));
  }, []);

  // Nouvelle intention dès que le montant ou le sens change.
  useEffect(() => {
    key.current = intentKey();
  }, [mode, amount]);

  const max = useMemo(() => (data ? (mode === "lock" ? data.balances.available : data.balances.vault) : 0), [data, mode]);

  useEffect(() => {
    if (data && max > 0 && amount > max) setAmount(max);
  }, [data, max, amount]);

  if (failed) return <MoneyLoadError onRetry={() => void reload()} />;
  if (!data) return <p className="loading-message" role="status">Ton coffre s'ouvre…</p>;

  const { available, vault } = data.balances;
  const needsApproval = mode === "unlock" && amount > data.vault.withdrawableNow && (data.vault.mode === "PARENT_APPROVAL" || (data.vault.mode === "GOAL_ONLY" && data.goals.length === 0));
  const after = mode === "lock" ? { account: available - amount, vault: vault + amount } : { account: available + amount, vault: vault - amount };
  const canMove = max > 0 && amount >= 1 && amount <= max;
  const action = mode === "lock" ? `Mettre ${pieces(amount)} dans le coffre` : needsApproval ? `Demander à reprendre ${pieces(amount)}` : `Reprendre ${pieces(amount)} du coffre`;

  async function move() {
    if (!canMove || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await api.post<{ outcome: "done" | "requested" }>(`/child/savings/${mode}`, { amount, idempotencyKey: key.current });
      if (res.outcome === "done" && !reduce) launchCoins(mode === "lock" ? "toChest" : "fromChest");
      if (res.outcome === "requested") setMessage({ tone: "info", text: "Demande envoyée. Un parent va la regarder." });
      else setMessage({ tone: "ok", text: mode === "lock" ? `C'est fait. ${pieces(amount)} ${amount > 1 ? "sont" : "est"} dans ton coffre. Ton total n'a pas changé.${data!.vault.prime.active ? ` ${amount > 1 ? "Elles compteront" : "Elle comptera"} pour ta prime à partir de lundi.` : ""}` : `C'est fait. ${pieces(amount)} ${amount > 1 ? "sont revenues" : "est revenue"} sur ton compte.` });
      key.current = intentKey();
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : "Ça n'a pas marché. Rien n'a changé : tes pièces sont au même endroit." });
    } finally {
      setSending(false);
    }
  }

  /** Les pièces volent du bouton vers le coffre (mise de côté) ou du coffre vers le bouton. */
  function launchCoins(direction: "toChest" | "fromChest") {
    const chest = chestRef.current?.getBoundingClientRect();
    const button = actionRef.current?.getBoundingClientRect();
    if (!chest || !button) return;
    const a = { x: button.left + button.width / 2, y: button.top + button.height / 2 };
    const b = { x: chest.left + chest.width / 2, y: chest.top + chest.height * 0.45 };
    setFlight({ id: Date.now(), from: direction === "toChest" ? a : b, to: direction === "toChest" ? b : a, count: Math.min(6, Math.max(3, Math.round(amount / 5))) });
  }

  async function createGoal(e: FormEvent) {
    e.preventDefault();
    setGoalError(null);
    try {
      await api.post("/child/savings/goals", { title: goalTitle.trim(), targetCoins: goalTarget });
      setGoalTitle("");
      await reload();
    } catch (err) {
      setGoalError(err instanceof ApiError && err.status !== 0 ? err.message : "L'objectif n'a pas pu être créé. Réessaie.");
    }
  }

  /** Objectif pris dans la boutique : le serveur reprend le titre et le prix de la récompense. */
  async function goalFromReward(rewardId: string) {
    setGoalError(null);
    try {
      await api.post("/child/savings/goals", { title: "récompense", targetCoins: 1, rewardId });
      await reload();
    } catch (err) {
      setGoalError(err instanceof ApiError && err.status !== 0 ? err.message : "L'objectif n'a pas pu être créé. Réessaie.");
    }
  }

  /** Monter ou descendre un objectif : Mon coffre les remplit dans ce nouvel ordre. */
  async function reorder(goalId: string, delta: -1 | 1) {
    const ids = data!.goals.map((g) => g.id);
    const i = ids.indexOf(goalId);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api.post("/child/savings/goals/order", { goalIds: ids }).catch(() => undefined);
    await reload();
  }

  async function archive(goalId: string) {
    await api.post(`/child/savings/goals/${goalId}/archive`);
    await reload();
  }

  const nextUnlock = data.vault.nextUnlockAt ? DATE.format(new Date(data.vault.nextUnlockAt)) : null;

  return (
    <div className="money-page">
      {flight && (
        <CoinFlight
          flight={flight}
          onDone={() => {
            setFlight(null);
            setBump(true);
            window.setTimeout(() => setBump(false), 420);
          }}
        />
      )}
      <section className="money-vault-hero" aria-labelledby="vault-title">
        <div ref={chestRef} className={`money-vault-hero-chest-wrap${bump ? " money-vault-hero-chest-wrap--bump" : ""}`}>
          <ChestArt state={chestStateFor(vault, data.goals)} size={300} className="money-vault-hero-chest" />
        </div>
        <div className="money-vault-hero-text">
          <h1 id="vault-title">Coffre magique</h1>
          <p className="money-vault-hero-balance">
            <strong>{vault}</strong> <span>{vault > 1 ? "pièces" : "pièce"}</span>
          </p>
          <p className="money-vault-purpose">
            {data.vault.prime.active ? "Ici, tes pièces sont mises de côté. Et chaque lundi, ton coffre t'en donne en plus." : "Ici, tes pièces sont mises de côté pour tes objectifs."}
          </p>
          <p className="money-rule">{ruleSentence(data.vault)}</p>
          {data.vault.mode === "MIN_DAYS" && nextUnlock && data.vault.locked > 0 && (
            <p className="money-rule">
              {pieces(data.vault.locked)} {data.vault.locked > 1 ? "restent" : "reste"} au coffre jusqu'au {nextUnlock} au moins.
            </p>
          )}
        </div>
      </section>

      {data.vault.pendingRequest && (
        <p className="money-banner" role="status">
          Ta demande pour reprendre {pieces(data.vault.pendingRequest.amount)} attend l'accord d'un parent.
        </p>
      )}

      <VaultPrimeCard prime={data.vault.prime} />
      <VaultExplainer prime={data.vault.prime} rule={ruleSentence(data.vault)} older={data.ageBand === "AGE_10_12"} startOpen={vault === 0 || !explained} />

      <section className="money-transfer" aria-labelledby="transfer-title">
        <h2 id="transfer-title" className="sr-only">
          Déplacer des pièces
        </h2>
        <div className="segmented" role="radiogroup" aria-label="Sens du transfert">
          {(["lock", "unlock"] as const).map((m) => (
            <label key={m} className={`segmented-option${mode === m ? " segmented-option--on" : ""}`}>
              <input type="radio" name="transfer-mode" checked={mode === m} onChange={() => { setMode(m); setMessage(null); }} />
              {m === "lock" ? "Mettre de côté" : "Reprendre"}
            </label>
          ))}
        </div>

        {max === 0 ? (
          <p className="money-hint">{mode === "lock" ? "Ton compte est vide pour l'instant : termine une quête pour gagner des pièces." : "Ton coffre est vide pour l'instant."}</p>
        ) : (
          <>
            <div className="money-chips" role="group" aria-label="Montant">
              {[5, 10, 20].filter((n) => n <= max).map((n) => (
                <button key={n} type="button" className={`money-chip${amount === n ? " money-chip--on" : ""}`} onClick={() => setAmount(n)} aria-pressed={amount === n}>
                  {n}
                </button>
              ))}
              <button type="button" className={`money-chip${amount === max ? " money-chip--on" : ""}`} onClick={() => setAmount(max)} aria-pressed={amount === max}>
                Tout ({max})
              </button>
            </div>
            <Stepper value={Math.min(amount, max)} max={max} onChange={setAmount} />

            <div className="money-preview" aria-live="polite">
              <div>
                <span>Mon compte</span>
                <strong>
                  {available} → {after.account}
                </strong>
              </div>
              <div>
                <span>Coffre magique</span>
                <strong>
                  {vault} → {after.vault}
                </strong>
              </div>
              {needsApproval && <p>Un parent devra valider avant que les pièces reviennent sur ton compte.</p>}
            </div>

            <button ref={actionRef} type="button" className="btn btn-quest btn-block" onClick={() => void move()} disabled={!canMove || sending}>
              {sending ? "Un instant…" : action}
            </button>
          </>
        )}
        {message && (
          <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        )}
      </section>

      <FinanceTip screen="vault" refreshKey={`${data.balances.vault}-${data.goals.length}`} />
      <FinanceQuestion key={data.balances.vault > 0 ? "coffre" : "vide"} context="vault" />

      <section aria-labelledby="goals-title">
        <div className="section-heading">
          <h2 id="goals-title">Mes objectifs</h2>
        </div>
        {data.goals.length > 1 && <p className="money-hint">Tes pièces vont d'abord vers le premier objectif, puis vers le suivant.</p>}
        <ol className="money-goals">
          {data.goals.map((goal, index) => (
            <li key={goal.id} className={`money-goal${goal.reached ? " money-goal--reached" : ""}`}>
              <div className="money-goal-head">
                <strong>
                  {goal.title}
                  {goal.rewardId && <span className="money-goal-tag">Boutique</span>}
                </strong>
                <span>
                  {goal.present} sur {goal.targetCoins}
                </span>
              </div>
              <ProgressBar value={goal.present} max={goal.targetCoins} />
              <p>
                {goal.reached
                  ? goal.rewardId
                    ? `Objectif atteint. Reprends ces pièces sur ton compte, puis demande « ${goal.title} » à la boutique.`
                    : "Objectif atteint. Pour utiliser ces pièces, reprends-les sur ton compte."
                  : `Il te manque ${pieces(goal.missing)}.`}
              </p>
              {data.goals.length > 1 && (
                <div className="money-goal-order">
                  <button type="button" onClick={() => void reorder(goal.id, -1)} disabled={index === 0} aria-label={`Monter « ${goal.title} »`}>
                    ↑ Avant
                  </button>
                  <button type="button" onClick={() => void reorder(goal.id, 1)} disabled={index === data.goals.length - 1} aria-label={`Descendre « ${goal.title} »`}>
                    ↓ Après
                  </button>
                </div>
              )}
              <button type="button" className="money-goal-archive" onClick={() => void archive(goal.id)}>
                {goal.reached ? "C'est fait, ranger cet objectif" : "Ranger cet objectif"}
              </button>
            </li>
          ))}
        </ol>

        {data.goals.length < 5 && (
          <form onSubmit={createGoal} className="money-goal-form">
            <h3>{data.goals.length === 0 ? "Choisis ton premier objectif" : "Ajouter un objectif"}</h3>
            {goalError && (
              <div className="form-error" role="alert">
                {goalError}
              </div>
            )}
            <div className="field">
              <label htmlFor="goal-title">Pour quoi mets-tu de côté ?</label>
              <input id="goal-title" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} maxLength={60} placeholder="Un livre, un vélo, une sortie…" required />
            </div>
            <div className="field">
              <span className="field-label" id="goal-target-label">
                Combien de pièces ?
              </span>
              <div aria-labelledby="goal-target-label">
                <Stepper value={goalTarget} max={100000} onChange={setGoalTarget} />
              </div>
              <div className="money-chips" role="group" aria-label="Montants rapides">
                {[20, 50, 100, 200].map((n) => (
                  <button key={n} type="button" className={`money-chip${goalTarget === n ? " money-chip--on" : ""}`} onClick={() => setGoalTarget(n)} aria-pressed={goalTarget === n}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={!goalTitle.trim()}>
              Enregistrer l'objectif
            </button>
            {rewards.some((r) => !data.goals.some((g) => g.rewardId === r.id)) && (
              <div className="money-goal-rewards">
                <span className="field-label">Ou vise une récompense de la boutique :</span>
                <div className="money-chips" role="group" aria-label="Récompenses de la boutique">
                  {rewards
                    .filter((r) => !data.goals.some((g) => g.rewardId === r.id))
                    .sort((a, b) => b.priceCoins - a.priceCoins)
                    .slice(0, 4)
                    .map((r) => (
                      <button key={r.id} type="button" className="money-chip" onClick={() => void goalFromReward(r.id)}>
                        {r.title} · {r.priceCoins}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
