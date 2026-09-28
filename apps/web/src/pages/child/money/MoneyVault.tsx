import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { CoinFlight, type Flight } from "../../../art/CoinFlight";
import { api, ApiError } from "../../../lib/api";
import { chestStateFor, intentKey, pieces, type MoneyOverview } from "../../../lib/money";
import { ChestArt } from "../../../art/ChestArt";
import { GoalJourney } from "../../../components/GoalJourney";
import { GOAL_ARTWORKS, type GoalArtworkKey } from "../../../lib/goalArtwork";
import { MoneyLoadError, useMoneyOverview } from "./MoneyAccount";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { FinanceQuestion } from "../../../components/finance/FinanceQuestion";
import { VaultPrimeCard } from "../../../components/money/VaultPrimeCard";
import { VaultExplainer } from "../../../components/money/VaultExplainer";
import { defineCopy, pick, useCopy } from "../../../i18n";
import { dateFormatter } from "../../../i18n/format";

type Mode = "lock" | "unlock";

const DATE = dateFormatter({ weekday: "long", day: "numeric", month: "long" });

const EXPLAINED_KEY = "okodukai:coffre-explique";

const COPY = defineCopy({
  fr: {
    rules: {
      PARENT_APPROVAL: "Pour reprendre des pièces du coffre, un parent devra valider.",
      MIN_DAYS: (days: number | null) => `Les pièces que tu mets de côté restent dans ton coffre au moins ${days} jours.`,
      GOAL_ONLY: "Tu pourras reprendre ces pièces quand ton objectif sera atteint.",
      FREE: "Tu peux reprendre tes pièces quand tu veux.",
    },
    oneLess: "Une pièce de moins",
    oneMore: "Une pièce de plus",
    loading: "Ton coffre s'ouvre…",
    put: (coins: string) => `Mettre ${coins} dans le coffre`,
    ask: (coins: string) => `Demander à reprendre ${coins}`,
    take: (coins: string) => `Reprendre ${coins} du coffre`,
    requested: "Demande envoyée. Un parent va la regarder.",
    locked: (coins: string, many: boolean, prime: boolean) =>
      `C'est fait. ${coins} ${many ? "sont" : "est"} dans ton coffre. Ton total n'a pas changé.${prime ? ` ${many ? "Elles compteront" : "Elle comptera"} pour ta prime à partir de lundi.` : ""}`,
    unlocked: (coins: string, many: boolean) => `C'est fait. ${coins} ${many ? "sont revenues" : "est revenue"} sur ton compte.`,
    failed: "Ça n'a pas marché. Rien n'a changé : tes pièces sont au même endroit.",
    goalFailed: "L'objectif n'a pas pu être créé. Réessaie.",
    title: "Coffre magique",
    coinWord: (n: number) => (n > 1 ? "pièces" : "pièce"),
    purposePrime: "Ici, tes pièces sont mises de côté. Et chaque lundi, ton coffre t'en donne en plus.",
    purpose: "Ici, tes pièces sont mises de côté pour tes objectifs.",
    lockedUntil: (coins: string, many: boolean, date: string) => `${coins} ${many ? "restent" : "reste"} au coffre jusqu'au ${date} au moins.`,
    pending: (coins: string) => `Ta demande pour reprendre ${coins} attend l'accord d'un parent.`,
    move: "Déplacer des pièces",
    direction: "Sens du transfert",
    lock: "Mettre de côté",
    unlock: "Reprendre",
    emptyAccount: "Ton compte est vide pour l'instant : termine une quête pour gagner des pièces.",
    emptyVault: "Ton coffre est vide pour l'instant.",
    amount: "Montant",
    all: (n: number) => `Tout (${n})`,
    account: "Mon compte",
    parentMust: "Un parent devra valider avant que les pièces reviennent sur ton compte.",
    wait: "Un instant…",
    goals: "Mes objectifs",
    order: "Tes pièces vont d'abord vers le premier objectif, puis vers le suivant.",
    shop: "Boutique",
    of: (a: number, b: number) => `${a} sur ${b}`,
    reachedShop: (title: string) => `Objectif atteint. Reprends ces pièces sur ton compte, puis demande « ${title} » à la boutique.`,
    reached: "Objectif atteint. Pour utiliser ces pièces, reprends-les sur ton compte.",
    missing: (coins: string) => `Il te manque ${coins}.`,
    up: (title: string) => `Monter « ${title} »`,
    down: (title: string) => `Descendre « ${title} »`,
    before: "↑ Avant",
    after: "↓ Après",
    doneArchive: "C'est fait, ranger cet objectif",
    archive: "Ranger cet objectif",
    firstGoal: "Choisis ton premier objectif",
    addGoal: "Ajouter un objectif",
    what: "Pour quoi mets-tu de côté ?",
    placeholder: "Un livre, un vélo, une sortie…",
    howMany: "Combien de pièces ?",
    quick: "Montants rapides",
    artLabel: "Choisis une image pour ton objectif",
    artHint: "Elle t'attendra au bout du chemin. Choisis celle qui ressemble le plus à ton idée.",
    artNames: { book: "Livre", bicycle: "Vélo", cinema: "Cinéma", icecream: "Glace", dessert: "Dessert", "family-game": "Jeu en famille", music: "Musique", friend: "Ami", figurine: "Figurine" },
    save: "Enregistrer l'objectif",
    orReward: "Ou vise une récompense de la boutique :",
    rewards: "Récompenses de la boutique",
  },
  en: {
    rules: {
      PARENT_APPROVAL: "To take coins out of the vault, a parent will need to approve.",
      MIN_DAYS: (days: number | null) => `Coins you put aside stay in your vault for at least ${days} days.`,
      GOAL_ONLY: "You can take these coins back once your goal is reached.",
      FREE: "You can take your coins back whenever you like.",
    },
    oneLess: "One coin less",
    oneMore: "One coin more",
    loading: "Opening your vault…",
    put: (coins: string) => `Put ${coins} in the vault`,
    ask: (coins: string) => `Ask to take back ${coins}`,
    take: (coins: string) => `Take ${coins} out of the vault`,
    requested: "Request sent. A parent will look at it.",
    locked: (coins: string, many: boolean, prime: boolean) =>
      `Done. ${coins} ${many ? "are" : "is"} in your vault. Your total hasn't changed.${prime ? ` ${many ? "They'll count" : "It'll count"} toward your bonus from Monday.` : ""}`,
    unlocked: (coins: string, many: boolean) => `Done. ${coins} ${many ? "are" : "is"} back in your account.`,
    failed: "That didn't work. Nothing changed: your coins are where they were.",
    goalFailed: "The goal couldn't be created. Try again.",
    title: "Magic Vault",
    coinWord: (n: number) => (n === 1 ? "coin" : "coins"),
    purposePrime: "Your coins are put aside here. And every Monday, your vault gives you a few extra.",
    purpose: "Your coins are put aside here for your goals.",
    lockedUntil: (coins: string, many: boolean, date: string) => `${coins} ${many ? "stay" : "stays"} in the vault until at least ${date}.`,
    pending: (coins: string) => `Your request to take back ${coins} is waiting for a parent.`,
    move: "Move coins",
    direction: "Which way",
    lock: "Put aside",
    unlock: "Take back",
    emptyAccount: "Your account is empty for now: finish a quest to earn coins.",
    emptyVault: "Your vault is empty for now.",
    amount: "Amount",
    all: (n: number) => `All (${n})`,
    account: "My account",
    parentMust: "A parent will need to approve before the coins go back to your account.",
    wait: "One moment…",
    goals: "My goals",
    order: "Your coins go to the first goal first, then to the next one.",
    shop: "Shop",
    of: (a: number, b: number) => `${a} of ${b}`,
    reachedShop: (title: string) => `Goal reached. Take these coins back to your account, then ask for "${title}" in the shop.`,
    reached: "Goal reached. To use these coins, take them back to your account.",
    missing: (coins: string) => `You need ${coins} more.`,
    up: (title: string) => `Move "${title}" up`,
    down: (title: string) => `Move "${title}" down`,
    before: "↑ Earlier",
    after: "↓ Later",
    doneArchive: "Done, put this goal away",
    archive: "Put this goal away",
    firstGoal: "Pick your first goal",
    addGoal: "Add a goal",
    what: "What are you saving for?",
    placeholder: "A book, a bike, a day out…",
    howMany: "How many coins?",
    quick: "Quick amounts",
    artLabel: "Choose a picture for your goal",
    artHint: "You'll see it at the end of the path. Pick the closest match to your idea.",
    artNames: { book: "Book", bicycle: "Bike", cinema: "Cinema", icecream: "Ice cream", dessert: "Dessert", "family-game": "Family game", music: "Music", friend: "Friend", figurine: "Figure" },
    save: "Save the goal",
    orReward: "Or aim for a reward from the shop:",
    rewards: "Shop rewards",
  },
});

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
  const rules = pick(COPY).rules;
  switch (vault.mode) {
    case "PARENT_APPROVAL":
      return rules.PARENT_APPROVAL;
    case "MIN_DAYS":
      return rules.MIN_DAYS(vault.minDays);
    case "GOAL_ONLY":
      return rules.GOAL_ONLY;
    default:
      return rules.FREE;
  }
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const t = useCopy(COPY);
  return (
    <div className="money-stepper">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={t.oneLess}>
        −
      </button>
      <output aria-live="polite">{pieces(value)}</output>
      <button type="button" onClick={() => onChange(Math.min(Math.max(1, max), value + 1))} disabled={value >= max} aria-label={t.oneMore}>
        +
      </button>
    </div>
  );
}

/**
 * Mon coffre : mettre de côté, reprendre, et les objectifs remplis l'un après l'autre. L'action vient
 * juste sous le coffre ; les explications suivent. Un seul encart pédagogique à la fois.
 */
export function MoneyVault() {
  const t = useCopy(COPY);
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
  const [goalArtwork, setGoalArtwork] = useState<GoalArtworkKey | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<{ id: string; title: string; priceCoins: number }[]>([]);
  const [explained] = useState(explainedBefore);
  const [tipShown, setTipShown] = useState(false);

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
  if (!data) return <p className="loading-message" role="status">{t.loading}</p>;

  const { available, vault } = data.balances;
  const needsApproval = mode === "unlock" && amount > data.vault.withdrawableNow && (data.vault.mode === "PARENT_APPROVAL" || (data.vault.mode === "GOAL_ONLY" && data.goals.length === 0));
  const after = mode === "lock" ? { account: available - amount, vault: vault + amount } : { account: available + amount, vault: vault - amount };
  const canMove = max > 0 && amount >= 1 && amount <= max;
  const action = mode === "lock" ? t.put(pieces(amount)) : needsApproval ? t.ask(pieces(amount)) : t.take(pieces(amount));

  async function move() {
    if (!canMove || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await api.post<{ outcome: "done" | "requested" }>(`/child/savings/${mode}`, { amount, idempotencyKey: key.current });
      if (res.outcome === "done" && !reduce) launchCoins(mode === "lock" ? "toChest" : "fromChest");
      if (res.outcome === "requested") setMessage({ tone: "info", text: t.requested });
      else setMessage({ tone: "ok", text: mode === "lock" ? t.locked(pieces(amount), amount > 1, data!.vault.prime.active) : t.unlocked(pieces(amount), amount > 1) });
      key.current = intentKey();
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.failed });
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
    if (!goalArtwork) return;
    setGoalError(null);
    try {
      await api.post("/child/savings/goals", { title: goalTitle.trim(), targetCoins: goalTarget, illustrationKey: goalArtwork });
      setGoalTitle("");
      setGoalArtwork(null);
      await reload();
    } catch (err) {
      setGoalError(err instanceof ApiError && err.status !== 0 ? err.message : t.goalFailed);
    }
  }

  /** Objectif pris dans la boutique : le serveur reprend le titre et le prix de la récompense. */
  async function goalFromReward(rewardId: string) {
    setGoalError(null);
    try {
      await api.post("/child/savings/goals", { title: "récompense", targetCoins: 1, rewardId });
      await reload();
    } catch (err) {
      setGoalError(err instanceof ApiError && err.status !== 0 ? err.message : t.goalFailed);
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
          <h1 id="vault-title">{t.title}</h1>
          <p className="money-vault-hero-balance">
            <strong>{vault}</strong> <span>{t.coinWord(vault)}</span>
          </p>
          <p className="money-vault-purpose">{data.vault.prime.active ? t.purposePrime : t.purpose}</p>
          <p className="money-rule">{ruleSentence(data.vault)}</p>
          {data.vault.mode === "MIN_DAYS" && nextUnlock && data.vault.locked > 0 && <p className="money-rule">{t.lockedUntil(pieces(data.vault.locked), data.vault.locked > 1, nextUnlock)}</p>}
        </div>
      </section>

      {data.vault.pendingRequest && (
        <p className="money-banner" role="status">
          {t.pending(pieces(data.vault.pendingRequest.amount))}
        </p>
      )}

      <section className="money-transfer" aria-labelledby="transfer-title">
        <h2 id="transfer-title" className="sr-only">
          {t.move}
        </h2>
        <div className="segmented" role="radiogroup" aria-label={t.direction}>
          {(["lock", "unlock"] as const).map((m) => (
            <label key={m} className={`segmented-option${mode === m ? " segmented-option--on" : ""}`}>
              <input type="radio" name="transfer-mode" checked={mode === m} onChange={() => { setMode(m); setMessage(null); }} />
              {m === "lock" ? t.lock : t.unlock}
            </label>
          ))}
        </div>

        {max === 0 ? (
          <p className="money-hint">{mode === "lock" ? t.emptyAccount : t.emptyVault}</p>
        ) : (
          <>
            <div className="money-chips" role="group" aria-label={t.amount}>
              {[5, 10, 20].filter((n) => n <= max).map((n) => (
                <button key={n} type="button" className={`money-chip${amount === n ? " money-chip--on" : ""}`} onClick={() => setAmount(n)} aria-pressed={amount === n}>
                  {n}
                </button>
              ))}
              <button type="button" className={`money-chip${amount === max ? " money-chip--on" : ""}`} onClick={() => setAmount(max)} aria-pressed={amount === max}>
                {t.all(max)}
              </button>
            </div>
            <Stepper value={Math.min(amount, max)} max={max} onChange={setAmount} />

            <div className="money-preview" aria-live="polite">
              <div>
                <span>{t.account}</span>
                <strong>
                  {available} → {after.account}
                </strong>
              </div>
              <div>
                <span>{t.title}</span>
                <strong>
                  {vault} → {after.vault}
                </strong>
              </div>
              {needsApproval && <p>{t.parentMust}</p>}
            </div>

            <button ref={actionRef} type="button" className="btn btn-quest btn-block" onClick={() => void move()} disabled={!canMove || sending}>
              {sending ? t.wait : action}
            </button>
          </>
        )}
        {message && (
          <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        )}
      </section>

      <VaultPrimeCard prime={data.vault.prime} />

      <section aria-labelledby="goals-title">
        <div className="section-heading">
          <h2 id="goals-title">{t.goals}</h2>
        </div>
        {data.goals.length > 1 && <p className="money-hint">{t.order}</p>}
        <ol className="money-goals">
          {data.goals.map((goal, index) => (
            <li key={goal.id} className={`money-goal${goal.reached ? " money-goal--reached" : ""}`}>
              <div className="money-goal-head">
                <strong>
                  {goal.title}
                  {goal.rewardId && <span className="money-goal-tag">{t.shop}</span>}
                </strong>
                <span>{t.of(goal.present, goal.targetCoins)}</span>
              </div>
              <GoalJourney title={goal.title} present={goal.present} target={goal.targetCoins} illustrationKey={goal.illustrationKey} />
              <p>{goal.reached ? (goal.rewardId ? t.reachedShop(goal.title) : t.reached) : t.missing(pieces(goal.missing))}</p>
              {data.goals.length > 1 && (
                <div className="money-goal-order">
                  <button type="button" onClick={() => void reorder(goal.id, -1)} disabled={index === 0} aria-label={t.up(goal.title)}>
                    {t.before}
                  </button>
                  <button type="button" onClick={() => void reorder(goal.id, 1)} disabled={index === data.goals.length - 1} aria-label={t.down(goal.title)}>
                    {t.after}
                  </button>
                </div>
              )}
              <button type="button" className="money-goal-archive" onClick={() => void archive(goal.id)}>
                {goal.reached ? t.doneArchive : t.archive}
              </button>
            </li>
          ))}
        </ol>

        {data.goals.length < 5 && (
          <form onSubmit={createGoal} className="money-goal-form">
            <h3>{data.goals.length === 0 ? t.firstGoal : t.addGoal}</h3>
            {goalError && (
              <div className="form-error" role="alert">
                {goalError}
              </div>
            )}
            <div className="field">
              <label htmlFor="goal-title">{t.what}</label>
              <input id="goal-title" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} maxLength={60} placeholder={t.placeholder} required />
            </div>
            <fieldset className="money-goal-artwork">
              <legend>{t.artLabel}</legend>
              <p>{t.artHint}</p>
              <div className="money-goal-artwork-options">
                {GOAL_ARTWORKS.map((key) => <button key={key} type="button" className={`money-goal-artwork-option${goalArtwork === key ? " money-goal-artwork-option--selected" : ""}`} aria-pressed={goalArtwork === key} onClick={() => setGoalArtwork(key)}>
                  <img src={`/assets/rewards/reward-${key}-256.webp`} alt="" loading="lazy" width="64" height="64" />
                  <span>{t.artNames[key]}</span>
                </button>)}
              </div>
            </fieldset>
            <div className="field">
              <span className="field-label" id="goal-target-label">
                {t.howMany}
              </span>
              <div aria-labelledby="goal-target-label">
                <Stepper value={goalTarget} max={100000} onChange={setGoalTarget} />
              </div>
              <div className="money-chips" role="group" aria-label={t.quick}>
                {[20, 50, 100, 200].map((n) => (
                  <button key={n} type="button" className={`money-chip${goalTarget === n ? " money-chip--on" : ""}`} onClick={() => setGoalTarget(n)} aria-pressed={goalTarget === n}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={!goalTitle.trim() || !goalArtwork}>
              {t.save}
            </button>
            {rewards.some((r) => !data.goals.some((g) => g.rewardId === r.id)) && (
              <div className="money-goal-rewards">
                <span className="field-label">{t.orReward}</span>
                <div className="money-chips" role="group" aria-label={t.rewards}>
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

      <VaultExplainer prime={data.vault.prime} rule={ruleSentence(data.vault)} older={data.ageBand === "AGE_10_12"} startOpen={vault === 0 || !explained} />

      <FinanceTip screen="vault" refreshKey={`${data.balances.vault}-${data.goals.length}`} onVisible={setTipShown} />
      {!tipShown && <FinanceQuestion key={data.balances.vault > 0 ? "coffre" : "vide"} context="vault" />}
    </div>
  );
}
