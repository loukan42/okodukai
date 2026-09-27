import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../../lib/api";
import { intentKey } from "../../../lib/money";
import {
  riskNote,
  RISK_SENTENCE,
  RISK_WORD,
  SUPPORTS,
  SUPPORT_ORDER,
  TREND_GLYPH,
  rendezVousLabel,
  signedPercent,
  signedUnits,
  trendOf,
  flatWords,
  trendWords,
  units,
  yearOf,
  type InvestRun,
  type InvestState,
  type SupportCode,
} from "../../../lib/invest";
import { Atelier, EMPTY_ALLOCATION, type Allocation } from "../../../components/invest/Atelier";
import { RiskMeter, SupportEmblem } from "../../../components/invest/SupportEmblem";
import { ValueChart } from "../../../components/invest/ValueChart";
import { XpEarned } from "../../../components/invest/XpEarned";
import { FinanceQuestion } from "../../../components/finance/FinanceQuestion";
import { FinanceTip } from "../../../components/finance/FinanceTip";
import { GameIcon } from "../../../components/GameIcon";
import { GameEnd } from "../../../components/invest/GameEnd";
import { MonthSummary } from "../../../components/money/MonthSummary";
import { StatementAlerts } from "../../../components/invest/StatementAlerts";
import { Contributions } from "../../../components/invest/Contributions";
import { ObjectArt } from "../../../art/ObjectArt";
import { defineCopy, useCopy } from "../../../i18n";
import { percentText } from "../../../i18n/format";

const RISKS: Record<SupportCode, number> = { SECURISE: 1, PRETER: 2, MONDE: 4, ENTREPRISES: 5 };

const COPY = defineCopy({
  fr: {
    kicker: "L'observatoire",
    riskOf: (n: number) => `Niveau de risque ${n} sur 5`,
    mixRisk: (n: number) => `Niveau de risque de ta répartition : ${n} sur 5`,
    mixYoung: (word: string) => `Ta répartition : ${word}`,
    notSaved: "Ta répartition n'a pas été enregistrée. Rien n'a changé. Réessaie.",
    step: (n: number) => `Étape ${n} sur 6`,
    s1Title: "Choisis combien de pièces placer.",
    s1Text: (n: number) => `Tu as ${n} pièces disponibles. Le montant choisi quittera ton compte et sera placé dans ton observatoire. Sa valeur pourra monter ou baisser.`,
    s1Field: "Pièces à transférer",
    tokensLabel: "10 jetons représentant 10 parts chacun",
    tokensHint: (n: number) => `Ces 10 jetons représentent 100 parts. Tu vas répartir tes ${n} pièces entre plusieurs supports.`,
    emptyAccount: "Ton compte est vide. Termine une quête pour gagner des pièces, ou reprends-en dans ton coffre si la règle le permet.",
    ok: "D'accord",
    s2Title: "Il existe plusieurs types de supports.",
    s2Young: "Un support, c'est un endroit où tu places tes pièces. Sa valeur peut bouger. Tu en découvres deux pour commencer.",
    s2Old: "Un support, c'est un type de placement. Chacun a sa façon d'évoluer et son niveau de risque.",
    back: "Retour",
    seeSupports: "Voir les supports",
    s3Title: "Les supports",
    realYoung: "Dans la vraie vie, on peut aussi prêter de l'argent, ou acheter un petit morceau d'une entreprise.",
    split: "Répartir mes pièces",
    s4Young: "Répartis tes pièces en 100 parts.",
    s4Old: "Répartis ton capital.",
    next: "Continuer",
    leftYoung: (n: number) => `Répartis encore ${n} parts`,
    leftOld: (n: number) => `Il reste ${n} % à répartir`,
    s5Title: "Ta répartition",
    s5Text: (n: number) => `Tu vas transférer ${n} pièces depuis ton compte. Elles seront réparties ainsi :`,
    partsOf: (n: number) => `${n} parts sur 100`,
    allocationWord: "La façon dont tu répartis ton capital entre les supports s'appelle l'allocation.",
    nothingYoung: (first: string) => `Rien ne bouge avant le premier relevé, ${first}. Tu pourras changer ta répartition lors d'un bilan.`,
    nothingOld: (first: string) => `Rien ne bouge avant le premier relevé, ${first}. Tu pourras la changer plus tard : cela s'appellera un arbitrage.`,
    edit: "Modifier",
    wait: "Un instant…",
    start: (n: number) => `Transférer ${n} pièces et commencer`,
    s6Title: "Ta répartition est enregistrée.",
    s6Text: (n: number, first: string) => `${n} pièces ont quitté ton compte pour rejoindre tes placements. Premier relevé : ${first}.`,
    firstSplit: "Première répartition",
    s6Note: "La valeur de ton placement peut monter ou baisser. Les pièces que tu as transférées ne sont plus dans ton solde disponible.",
    seeObservatory: "Voir l'observatoire",
    flat: "Ton placement n'a presque pas bougé cette fois.",
    up: (n: string) => `Ton placement a monté cette fois : ${n} de plus. Ça ne veut pas dire qu'il montera toujours.`,
    down: (n: string, units: boolean) => `Ton placement a baissé cette fois : ${n} de moins. Ce n'est pas une erreur de ta part.${units ? " Tes pièces n'ont pas bougé." : " La valeur des pièces placées peut varier."}`,
    reportTitle: (year: number) => `Ton bilan · Année ${year}`,
    since: (n: number) => `Depuis ta dernière visite : ${n} relevés. Voici le plus récent ; les autres sont dans ta courbe.`,
    nextStatement: (when: string | null) => `Prochain relevé : ${when ?? "la partie est terminée"}. Rien ne bouge d'ici là.`,
    closeReport: "Fermer le bilan",
    noted: (next: string) => `C'est noté. Ton changement sera appliqué au prochain relevé, ${next}.`,
    changeFailed: "Ton changement n'a pas été enregistré. Rien n'a changé.",
    titleFunded: "Mes placements",
    titleUnits: "Mes placements école",
    finished: "Ta partie est terminée.",
    paused: "L'observatoire est en pause. Rien ne bouge jusqu'à la reprise.",
    ready: (next: string) => `Ta répartition est prête. Le premier relevé aura lieu ${next}. D'ici là, rien ne bouge.`,
    yearLine: (year: number, young: boolean, total: number, next: string) => `Année ${year} ${young ? "de ta partie" : `sur ${total}`} · Prochain relevé : ${next}. Rien ne bouge d'ici là.`,
    reportReady: "Ton bilan est prêt.",
    valueLabel: "Valeur de mes placements",
    placedCoins: "pièces placées",
    schoolUnits: "unités école",
    startNow: (a: string, b: string) => `Au départ : ${a} · Maintenant : ${b} · `,
    same: "Pareil",
    sinceStart: "Depuis le départ :",
    sinceLast: "Depuis le dernier relevé :",
    trail: "Les derniers relevés",
    supports: "Mes supports",
    coinsOrUnits: (funded: boolean) => (funded ? "pièces" : "unités"),
    share: (v: string, word: string, actual: number, target: number) => `${v} ${word} · ${actual} % (choisi ${target} %)`,
    pendingChange: (next: string) => `Changement de répartition prévu au prochain relevé, ${next}.`,
    changeTitle: "Changer ma répartition",
    changeHint: "Le changement sera appliqué au prochain relevé, à la valeur de ce relevé. Tu n'es pas obligé de changer.",
    keep: "Garder ma répartition",
    saveChange: "Enregistrer le changement",
    orchard: "Le verger du temps long",
    orchardLocked: "S'ouvre après ton premier bilan lu.",
    orchardNew: "Un nouveau lieu est ouvert : un contrat pour placer sur de longues années.",
    orchardValue: (v: string) => `Mon contrat école : ${v} unités.`,
    library: "La bibliothèque",
    libraryHint: "Des histoires courtes pour comprendre l'argent.",
    failed: "Impossible d'afficher tes placements pour l'instant.",
    failedHint: "Réessaie dans un instant pour voir où en sont tes pièces.",
    retry: "Réessayer",
    legacyClosed: "Ta partie précédente en unités école est terminée. Tu la retrouves dans « Mes parties » ; tes nouvelles parties utilisent tes pièces.",
    loading: "L'observatoire s'ouvre…",
    disabled: "Tes parents peuvent activer les placements depuis leurs réglages.",
    lockedTitle: "L'observatoire est fermé",
    lockedText: "Range d'abord quelques pièces dans ton coffre pour ouvrir l'observatoire.",
    lockedHint: "Tu pourras les reprendre ensuite, selon la règle choisie par tes parents.",
    putAside: "Mettre de côté",
  },
  en: {
    kicker: "The observatory",
    riskOf: (n: number) => `Risk level ${n} of 5`,
    mixRisk: (n: number) => `Risk level of your split: ${n} of 5`,
    mixYoung: (word: string) => `Your split: ${word}`,
    notSaved: "Your split wasn't saved. Nothing changed. Try again.",
    step: (n: number) => `Step ${n} of 6`,
    s1Title: "Choose how many coins to invest.",
    s1Text: (n: number) => `You have ${n} coins available. The amount you choose will leave your account and go into your observatory. Its value can go up or down.`,
    s1Field: "Coins to move",
    tokensLabel: "10 tokens, each worth 10 parts",
    tokensHint: (n: number) => `These 10 tokens stand for 100 parts. You're going to share your ${n} coins across several holdings.`,
    emptyAccount: "Your account is empty. Finish a quest to earn coins, or take some out of your vault if the rule allows it.",
    ok: "OK",
    s2Title: "There are several kinds of holdings.",
    s2Young: "A holding is a place where you put your coins. Its value can move. You'll start with two of them.",
    s2Old: "A holding is a type of investment. Each one moves in its own way and has its own level of risk.",
    back: "Back",
    seeSupports: "See the holdings",
    s3Title: "The holdings",
    realYoung: "In real life, people can also lend money, or buy a small piece of a company.",
    split: "Share out my coins",
    s4Young: "Share your coins into 100 parts.",
    s4Old: "Split your money.",
    next: "Continue",
    leftYoung: (n: number) => `Share out ${n} more parts`,
    leftOld: (n: number) => `${n}% left to split`,
    s5Title: "Your split",
    s5Text: (n: number) => `You're about to move ${n} coins from your account. They'll be split like this:`,
    partsOf: (n: number) => `${n} parts of 100`,
    allocationWord: "The way you split your money across holdings is called your allocation.",
    nothingYoung: (first: string) => `Nothing moves before the first statement, ${first}. You can change your split when you get a report.`,
    nothingOld: (first: string) => `Nothing moves before the first statement, ${first}. You can change it later: that's called rebalancing.`,
    edit: "Change",
    wait: "One moment…",
    start: (n: number) => `Move ${n} coins and start`,
    s6Title: "Your split is saved.",
    s6Text: (n: number, first: string) => `${n} coins have left your account and joined your investments. First statement: ${first}.`,
    firstSplit: "First split",
    s6Note: "The value of your investment can go up or down. The coins you moved are no longer in your available balance.",
    seeObservatory: "See the observatory",
    flat: "Your investment barely moved this time.",
    up: (n: string) => `Your investment went up this time: ${n} more. That doesn't mean it will always go up.`,
    down: (n: string, units: boolean) => `Your investment went down this time: ${n} less. It's not something you did wrong.${units ? " Your coins haven't moved." : " The value of invested coins can change."}`,
    reportTitle: (year: number) => `Your report · Year ${year}`,
    since: (n: number) => `Since your last visit: ${n} statements. Here's the latest one; the others are in your curve.`,
    nextStatement: (when: string | null) => `Next statement: ${when ?? "the game is over"}. Nothing moves until then.`,
    closeReport: "Close the report",
    noted: (next: string) => `Got it. Your change will apply at the next statement, ${next}.`,
    changeFailed: "Your change wasn't saved. Nothing changed.",
    titleFunded: "My investments",
    titleUnits: "My practice investments",
    finished: "Your game is over.",
    paused: "The observatory is paused. Nothing moves until it starts again.",
    ready: (next: string) => `Your split is ready. The first statement comes ${next}. Until then, nothing moves.`,
    yearLine: (year: number, young: boolean, total: number, next: string) => `Year ${year} ${young ? "of your game" : `of ${total}`} · Next statement: ${next}. Nothing moves until then.`,
    reportReady: "Your report is ready.",
    valueLabel: "Value of my investments",
    placedCoins: "coins invested",
    schoolUnits: "practice units",
    startNow: (a: string, b: string) => `At the start: ${a} · Now: ${b} · `,
    same: "The same",
    sinceStart: "Since the start:",
    sinceLast: "Since the last statement:",
    trail: "The latest statements",
    supports: "My holdings",
    coinsOrUnits: (funded: boolean) => (funded ? "coins" : "units"),
    share: (v: string, word: string, actual: number, target: number) => `${v} ${word} · ${actual}% (chosen ${target}%)`,
    pendingChange: (next: string) => `New split planned for the next statement, ${next}.`,
    changeTitle: "Change my split",
    changeHint: "The change applies at the next statement, at that statement's value. You don't have to change anything.",
    keep: "Keep my split",
    saveChange: "Save the change",
    orchard: "The long-term orchard",
    orchardLocked: "Opens after you've read your first report.",
    orchardNew: "A new place is open: a contract for investing over many years.",
    orchardValue: (v: string) => `My practice contract: ${v} units.`,
    library: "The library",
    libraryHint: "Short stories to help you understand money.",
    failed: "We can't show your investments right now.",
    failedHint: "Try again in a moment to see how your coins are doing.",
    retry: "Try again",
    legacyClosed: "Your earlier practice-unit game has ended. Find it under \"My games\"; new games use your coins.",
    loading: "Opening the observatory…",
    disabled: "Your parents can turn on investing in their settings.",
    lockedTitle: "The observatory is closed",
    lockedText: "Put a few coins in your vault first to open the observatory.",
    lockedHint: "You can take them back afterwards, depending on the rule your parents chose.",
    putAside: "Put aside",
  },
});


/** En-tête de l'observatoire. `lit` : un bilan attend, les lanternes de la vallée s'allument une à une. */
function ObservatoryHeader({ title, subtitle, lit = false }: { title: string; subtitle: string; lit?: boolean }) {
  const t = useCopy(COPY);
  return (
    <header className="observatory-head">
      <span className={`observatory-lanterns${lit ? " is-lit" : ""}`} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <ObjectArt name="telescope" size={96} />
      <div>
        <p className="scene-kicker">{t.kicker}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

/** Onboarding du capital école : 6 étapes, rien de pré-rempli (docs/INVESTMENT_UX.md §5). */
function Onboarding({ state, onDone }: { state: InvestState; onDone: () => Promise<void> }) {
  const t = useCopy(COPY);
  const young = state.ageBand === "AGE_8_9";
  const allowed = state.allowedSupports ?? SUPPORT_ORDER;
  const [step, setStep] = useState(1);
  const [allocation, setAllocation] = useState<Allocation>(EMPTY_ALLOCATION);
  const [amount, setAmount] = useState(Math.min(100, Math.max(1, state.availablePoints)));
  const [open, setOpen] = useState<SupportCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [checkDone, setCheckDone] = useState(false);
  const key = useRef(intentKey());
  const first = rendezVousLabel(state.firstRendezVousAt);
  const placed = SUPPORT_ORDER.reduce((s, c) => s + allocation[c], 0);

  async function validate() {
    setSending(true);
    setError(null);
    try {
      const res = await api.post<{ xpAwarded?: number }>("/child/invest/start", { allocation, amount, idempotencyKey: key.current });
      setXpAwarded(res.xpAwarded ?? 0);
      setStep(6);
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.notSaved);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="money-page">
      {state.legacyClosed && step === 1 && <p className="money-banner" role="status">{t.legacyClosed}</p>}
      <p className="onboarding-count">{t.step(step)}</p>
      {step === 1 && (
        <section className="invest-step">
          <h1>{t.s1Title}</h1>
          <p>{t.s1Text(state.availablePoints)}</p>
          <label className="invest-amount-field" htmlFor="invest-amount">{t.s1Field}
            <input id="invest-amount" type="number" min={1} max={state.availablePoints} step={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
          </label>
          <div className="study-tokens" aria-label={t.tokensLabel}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="study-token" />
            ))}
          </div>
          <p className="money-hint">{t.tokensHint(amount || 0)}</p>
          {state.availablePoints === 0 && <p className="money-hint">{t.emptyAccount}</p>}
          <button className="btn btn-quest" onClick={() => setStep(2)} disabled={!Number.isInteger(amount) || amount < 1 || amount > state.availablePoints}>
            {t.ok}
          </button>
        </section>
      )}
      {step === 2 && (
        <section className="invest-step">
          <h1>{t.s2Title}</h1>
          <p>{young ? t.s2Young : t.s2Old}</p>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              {t.back}
            </button>
            <button className="btn btn-quest" onClick={() => setStep(3)}>
              {t.seeSupports}
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="invest-step">
          <h1>{t.s3Title}</h1>
          <p className="money-hint">{riskNote()}</p>
          <ul className="support-cards">
            {SUPPORT_ORDER.filter((c) => allowed.includes(c)).map((code) => (
              <li key={code} className="support-card">
                <button type="button" className="support-card-head" onClick={() => setOpen(open === code ? null : code)} aria-expanded={open === code}>
                  <span className="support-card-emblem">
                    <SupportEmblem code={code} size={30} />
                  </span>
                  <span>
                    <strong>{young ? SUPPORTS[code].name : `${SUPPORTS[code].name} · ${SUPPORTS[code].realWord}`}</strong>
                    <small>{SUPPORTS[code].place}</small>
                  </span>
                  <RiskMeter level={RISKS[code]} label={t.riskOf(RISKS[code])} />
                </button>
                <p>{young ? SUPPORTS[code].young : SUPPORTS[code].older}</p>
                <p className="support-card-risk">{young ? RISK_WORD[RISKS[code]] : RISK_SENTENCE[RISKS[code]]}</p>
                {open === code && <p className="support-card-real">{young ? t.realYoung : SUPPORTS[code].realLife}</p>}
              </li>
            ))}
          </ul>
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              {t.back}
            </button>
            <button className="btn btn-quest" onClick={() => setStep(4)}>
              {t.split}
            </button>
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="invest-step">
          <h1>{young ? t.s4Young : t.s4Old}</h1>
          <Atelier young={young} step={state.allocationStep} allowed={allowed} risks={RISKS} value={allocation} onChange={setAllocation} />
          <div className="invest-step-actions">
            <button className="btn btn-ghost" onClick={() => setStep(3)}>
              {t.back}
            </button>
            <button className="btn btn-quest" onClick={() => setStep(5)} disabled={placed !== 100}>
              {placed === 100 ? t.next : young ? t.leftYoung(100 - placed) : t.leftOld(100 - placed)}
            </button>
          </div>
        </section>
      )}
      {step === 5 && (
        <section className="invest-step">
          <h1>{t.s5Title}</h1>
          <p>{t.s5Text(amount)}</p>
          <ul className="allocation-summary">
            {SUPPORT_ORDER.filter((c) => allocation[c] > 0).map((c) => (
              <li key={c}>
                <SupportEmblem code={c} size={22} />
                <span>{SUPPORTS[c].name}</span>
                <strong>{young ? t.partsOf(allocation[c]) : percentText(String(allocation[c]))}</strong>
              </li>
            ))}
          </ul>
          {!young && <p className="library-note" role="note">{t.allocationWord}</p>}
          <p>{young ? t.nothingYoung(first) : t.nothingOld(first)}</p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setStep(4)}>
              {t.edit}
            </button>
            <button className="btn btn-quest" onClick={() => void validate()} disabled={sending}>
              {sending ? t.wait : t.start(amount)}
            </button>
          </div>
        </section>
      )}
      {step === 6 && (
        <section className="invest-step">
          <h1>{t.s6Title}</h1>
          <p>{t.s6Text(amount, first)}</p>
          <XpEarned amount={xpAwarded} reason={t.firstSplit} />
          {/* Q04 (INVESTMENT_UX O6) ; si la notion est déjà vérifiée, la phrase seule suffit. */}
          <FinanceQuestion context="onboarding" onEmpty={() => setCheckDone(true)} />
          {checkDone && (
            <p className="library-note" role="note">
              {t.s6Note}
            </p>
          )}
          <button className="btn btn-quest" onClick={() => void onDone()}>
            {t.seeObservatory}
          </button>
        </section>
      )}
    </div>
  );
}

/** Le bilan d'un relevé : ce qui a changé, sans mise en scène (docs/INVESTMENT_UX.md §10). */
function Statement({ run, young, onClose }: { run: InvestRun; young: boolean; onClose: () => Promise<void> }) {
  const t = useCopy(COPY);
  const [tipShown, setTipShown] = useState(false);
  const last = run.lastStatement!;
  const s = run.statements[run.statements.length - 1];
  const delta = last.endValue - last.startValue;
  const trend = trendOf(delta, last.startValue, young);
  const main = trend === "flat" ? t.flat : trend === "up" ? t.up(units(Math.abs(delta), young)) : t.down(units(Math.abs(delta), young), run.fundedAmount === null);
  return (
    <section className="statement" aria-labelledby="statement-title">
      <h2 id="statement-title">{t.reportTitle(yearOf(s.step - 1))}</h2>
      {run.unseen > 1 && <p className="money-hint">{t.since(run.unseen)}</p>}
      <p className="statement-main">
        <span aria-hidden="true">{TREND_GLYPH[trend]}</span> {main}
        {!young && ` (${signedPercent(last.performance)})`}
      </p>
      <ul className="statement-supports">
        {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005).map((c) => {
          const d = last.bySupportChange[c] ?? 0;
          const tr = trendOf(d, run.bySupport[c] - d, young);
          return (
            <li key={c}>
              <SupportEmblem code={c} size={22} />
              <span>{SUPPORTS[c].name}</span>
              <strong>
                <span aria-hidden="true">{TREND_GLYPH[tr]}</span> {tr === "flat" ? flatWords() : young ? trendWords(tr, d, young) : signedUnits(d, young)}
              </strong>
            </li>
          );
        })}
      </ul>
      <MonthSummary />
      <FinanceTip screen="bilan" mode="MIROIR" refreshKey={s.index} onVisible={setTipShown} />
      {!tipShown && <FinanceQuestion key={s.index} context="bilan" mode="MIROIR" />}
      <p>{t.nextStatement(run.clock.nextRendezVousAt ? rendezVousLabel(run.clock.nextRendezVousAt) : null)}</p>
      <button className="btn btn-primary" onClick={() => void onClose()}>
        {t.closeReport}
      </button>
    </section>
  );
}

function Observatory({ state, reload }: { state: InvestState; reload: () => Promise<void> }) {
  const t = useCopy(COPY);
  const run = state.run!;
  const funded = run.fundedAmount !== null;
  const young = state.ageBand === "AGE_8_9";
  const [showStatement, setShowStatement] = useState(run.unseen > 0);
  const [rebalancing, setRebalancing] = useState(false);
  const [draft, setDraft] = useState<Allocation>({ ...EMPTY_ALLOCATION, ...run.targetAllocation });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const key = useRef(intentKey());
  const next = rendezVousLabel(run.clock.nextRendezVousAt);
  const finished = run.status === "TERMINEE";
  const sinceStart = run.value - run.contributed;
  const startTrend = trendOf(sinceStart, run.contributed, young);
  const lastDelta = run.lastStatement ? run.lastStatement.endValue - run.lastStatement.startValue : 0;
  const lastTrend = trendOf(lastDelta, run.lastStatement?.startValue ?? 100, young);
  const recent = run.statements.slice(-5);

  async function closeStatement() {
    const last = run.statements[run.statements.length - 1];
    await api.post(`/child/invest/statements/${last.index}/seen`);
    setShowStatement(false);
    await reload();
  }

  async function rebalance() {
    setMessage(null);
    try {
      await api.post("/child/invest/rebalance", { allocation: draft, idempotencyKey: key.current });
      key.current = intentKey();
      setRebalancing(false);
      setMessage({ tone: "ok", text: t.noted(next) });
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError && err.status !== 0 && err.status < 500 ? err.message : t.changeFailed });
    }
  }

  async function newGame() {
    await api.post("/child/invest/new-game");
    await reload();
  }

  return (
    <div className="money-page">
      <ObservatoryHeader
        title={funded ? t.titleFunded : t.titleUnits}
        lit={run.unseen > 0}
        subtitle={
          finished
            ? t.finished
            : run.paused
              ? t.paused
              : run.clock.rendezVousCount === 0
              ? t.ready(next)
              : t.yearLine(yearOf(run.clock.revealedSteps - 1), young, Math.ceil(run.horizonMonths / 12), next)
        }
      />

      {showStatement && run.lastStatement && run.unseen > 0 && <Statement run={run} young={young} onClose={closeStatement} />}
      {!showStatement && run.unseen > 0 && (
        <button className="money-banner money-banner--button" onClick={() => setShowStatement(true)}>
          {t.reportReady}
        </button>
      )}

      <section className="observatory-value" aria-label={t.valueLabel}>
        <p className="observatory-value-number">
          <strong>{units(run.value, young)}</strong> <span>{funded ? t.placedCoins : t.schoolUnits}</span>
        </p>
        {young ? (
          <p>
            {t.startNow(units(run.contributed, young), units(run.value, young))}
            <b>
              <span aria-hidden="true">{TREND_GLYPH[startTrend]}</span> {startTrend === "flat" ? t.same : trendWords(startTrend, sinceStart, young)}
            </b>
          </p>
        ) : (
          <p>
            {t.sinceStart} <b>{signedUnits(sinceStart, young)}</b> ({signedPercent(run.performance)})
          </p>
        )}
        {run.lastStatement && (
          <p>
            {t.sinceLast}{" "}
            <b>
              <span aria-hidden="true">{TREND_GLYPH[lastTrend]}</span> {lastTrend === "flat" ? flatWords() : young ? trendWords(lastTrend, lastDelta, young) : signedUnits(lastDelta, young)}
            </b>
          </p>
        )}
        <p className="observatory-risk">
          <RiskMeter level={run.riskLevel} label={t.mixRisk(run.riskLevel)} />
          {young ? t.mixYoung(RISK_WORD[run.riskLevel].toLowerCase()) : t.mixRisk(run.riskLevel)}
        </p>
      </section>

      {!young && run.series.length > 1 && <ValueChart series={run.series} horizonMonths={run.horizonMonths} />}
      {young && recent.length > 0 && (
        <p className="observatory-trail" aria-label={t.trail}>
          {[{ value: run.contributed }, ...recent].map((s, i, all) => {
            const prev = i > 0 ? all[i - 1].value : null;
            const tr = prev === null ? null : trendOf(s.value - prev, prev, true);
            return (
              <span key={i}>
                {i > 0 && " → "}
                {units(s.value, true)}
                {tr && <span aria-hidden="true"> {TREND_GLYPH[tr]}</span>}
              </span>
            );
          })}
        </p>
      )}

      <section aria-labelledby="supports-title">
        <div className="section-heading">
          <h2 id="supports-title">{t.supports}</h2>
        </div>
        <ul className="observatory-supports">
          {SUPPORT_ORDER.filter((c) => (run.bySupport[c] ?? 0) > 0.005 || run.targetAllocation[c] > 0).map((c) => (
            <li key={c}>
              <Link to={`/enfant/argent/investir/support/${c}`} className="observatory-support-link">
                <span className="support-card-emblem">
                  <SupportEmblem code={c} size={26} />
                </span>
                <span className="observatory-support-name">
                  <strong>{SUPPORTS[c].name}</strong>
                  <small>{young ? `${units(run.bySupport[c], true)} ${t.coinsOrUnits(funded)}` : t.share(units(run.bySupport[c], false), t.coinsOrUnits(funded), Math.round(run.actualAllocation[c]), run.targetAllocation[c])}</small>
                </span>
                <RiskMeter level={run.supportsRisk[c]} label={t.riskOf(run.supportsRisk[c])} />
                <GameIcon name="arrow" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {message && (
        <p className={`money-message money-message--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      {run.pendingOperations > 0 && <p className="money-banner">{t.pendingChange(next)}</p>}

      {finished ? (
        <GameEnd run={run} young={young} onNewGame={() => void newGame()} />
      ) : rebalancing ? (
        <section className="invest-step">
          <h2>{t.changeTitle}</h2>
          <p className="money-hint">{t.changeHint}</p>
          <Atelier young={young} step={run.allocationStep} allowed={run.allowedSupports} risks={RISKS} value={draft} onChange={setDraft} />
          <div className="invest-step-actions invest-step-actions--even">
            <button className="btn btn-ghost" onClick={() => setRebalancing(false)}>
              {t.keep}
            </button>
            <button className="btn btn-quest" onClick={() => void rebalance()} disabled={SUPPORT_ORDER.reduce((s, c) => s + draft[c], 0) !== 100}>
              {t.saveChange}
            </button>
          </div>
        </section>
      ) : (
        run.clock.rendezVousCount > 0 &&
        run.pendingOperations === 0 && (
          <button className="btn btn-ghost btn-block" onClick={() => setRebalancing(true)}>
            {t.changeTitle}
          </button>
        )
      )}

      {!finished && state.settings.notifyStatement && <StatementAlerts />}

      {!finished && !young && !run.paused && state.settings.contributionsEnabled && run.clock.rendezVousCount > 0 && (
        <Contributions run={run} cap={run.contributionCap ?? state.settings.contributionCap} onChanged={reload} />
      )}

      {state.orchard && state.orchard.gate !== "hidden" && (
        <Link to="/enfant/argent/investir/verger" className={`home-callout${state.orchard.gate === "locked" ? " home-callout--locked" : ""}`}>
          <ObjectArt name="hourglass" size={64} />
          <span>
            <strong>{t.orchard}</strong>
            <small>
              {state.orchard.gate === "locked"
                ? t.orchardLocked
                : state.orchard.gate === "onboarding"
                  ? t.orchardNew
                  : t.orchardValue(units(state.orchard.run!.value, false))}
            </small>
          </span>
        </Link>
      )}

      <Link to="/enfant/argent/investir/bibliotheque" className="home-callout">
        <ObjectArt name="quest-scroll" size={64} />
        <span>
          <strong>{t.library}</strong>
          <small>{t.libraryHint}</small>
        </span>
      </Link>
    </div>
  );
}

/** Onglet Investir : porte, onboarding, puis l'observatoire. */
export function Invest() {
  const t = useCopy(COPY);
  const [state, setState] = useState<InvestState | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      setState(await api.get<InvestState>("/child/invest"));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed)
    return (
      <div className="empty-state" role="alert">
        <strong>{t.failed}</strong>
        <p>{t.failedHint}</p>
        <button className="btn btn-primary" onClick={() => void load()}>
          {t.retry}
        </button>
      </div>
    );
  if (!state) return <p className="loading-message" role="status">{t.loading}</p>;

  if (state.gate === "disabled")
    return (
      <div className="money-page">
        <ObservatoryHeader title={t.titleFunded} subtitle={t.disabled} />
      </div>
    );
  if (state.gate === "locked")
    return (
      <div className="money-page">
        <ObservatoryHeader title={t.lockedTitle} subtitle={t.lockedText} />
        {state.legacyClosed && <p className="money-banner" role="status">{t.legacyClosed}</p>}
        <p className="money-hint">{t.lockedHint}</p>
        <Link to="/enfant/argent/coffre" className="btn btn-quest">
          {t.putAside}
        </Link>
      </div>
    );
  if (state.gate === "onboarding") return <Onboarding state={state} onDone={load} />;
  return <Observatory state={state} reload={load} />;
}
