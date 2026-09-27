// Versions anglaises des vérifications de compréhension (même identifiant de question, mêmes
// identifiants d'options, même bonne réponse que `questions.ts`). Voir docs/FINANCIAL_EDUCATION.md §9.
import type { Band } from "./notions.js";
import type { QuestionCtx } from "./questions.js";

interface Option {
  id: string;
  text: string;
  correct?: true;
  feedback: string;
}

export interface BuiltEn {
  prompt: string;
  options: Option[];
  explain: string;
}

const fmt = (n: number, band: Band) =>
  band === "young" ? String(Math.round(n)) : n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DONT_KNOW_EN = "I don't know yet";

export const QUESTIONS_EN: Record<string, (c: QuestionCtx) => BuiltEn | null> = {
  Q04: () => ({
    prompt: "You invest coins you've earned, then their value goes down. What happened?",
    explain: "The invested coins left your available balance. Their value can go up or down during the game.",
    options: [
      { id: "a", text: "The value of the invested coins went down.", correct: true, feedback: "Yes. The market doesn't change your available balance, but the value of what you invested can change." },
      { id: "b", text: "Investing has no effect on my coins.", feedback: "The invested coins left your available balance, and their value can change." },
    ],
  }),
  Q02: (c) =>
    c.hasTransfer === false
      ? null
      : {
          prompt: "You put 10 coins in your vault. How many coins do you have in total?",
          explain: "You only moved these coins. Your total doesn't change.",
          options: [
            { id: "a", text: "The same as before.", correct: true, feedback: "Yes. Your coins moved to another place, and the total stays the same." },
            { id: "b", text: "10 fewer.", feedback: "No, they're in your vault. You didn't spend them." },
            { id: "c", text: "10 more.", feedback: "No: you didn't earn anything, you just moved coins." },
          ],
        },
  Q01: () => ({
    prompt: "You have 20 coins in your account and 50 in your vault. You want a reward that costs 30 coins. What do you do?",
    explain: "You need 10 more coins in your account. You can take them out of the vault before asking for the reward.",
    options: [
      { id: "a", text: "I take 10 coins out of my vault.", correct: true, feedback: "Yes. Then you'll have 30 coins available in your account." },
      { id: "b", text: "I can ask for it straight away.", feedback: "You're 10 available coins short. You can take them out of the vault." },
    ],
  }),
  Q05: (c) => {
    const s = c.run?.lastStatement;
    if (!s) return null;
    const before = fmt(s.startValue, c.band);
    const after = fmt(s.endValue, c.band);
    if (before === after) return null;
    const up = s.endValue > s.startValue;
    const d = fmt(Math.abs(s.endValue - s.startValue), c.band);
    return {
      prompt: `Your investment was worth ${before}. Now it's worth ${after}. What happened?`,
      explain: `Look at the two numbers: ${after} is ${up ? "bigger" : "smaller"} than ${before}. It went ${up ? "up" : "down"} by ${d}.`,
      options: [
        { id: "a", text: `It went ${up ? "up" : "down"} by ${d}.`, correct: true, feedback: `Yes: from ${before} to ${after}, it went ${up ? "up" : "down"} by ${d}.` },
        { id: "b", text: `It went ${up ? "down" : "up"} by ${d}.`, feedback: `Look at the two numbers: ${after} is ${up ? "bigger" : "smaller"} than ${before}.` },
        { id: "c", text: `It ${up ? "gained" : "lost"} ${after}.`, feedback: `No: it only changed by ${d}.` },
      ],
    };
  },
  Q13: () => ({
    prompt: "Between two statements, what happens if you check your investments 10 times?",
    explain: "The value only changes at a statement. You don't need to check every five minutes.",
    options: [
      { id: "a", text: "Nothing changes.", correct: true, feedback: "Yes. The value only changes at a statement. You don't need to check every five minutes." },
      { id: "b", text: "They go up.", feedback: "No. The value only changes at a statement, not when you look." },
      { id: "c", text: "They go down.", feedback: "No. The value only changes at a statement, not when you look." },
    ],
  }),
  Q06: () => ({
    prompt: "A holding has a risk level of 5 out of 5. What does that mean?",
    explain: "The level tells you how much it can move, not which way.",
    options: [
      { id: "a", text: "Its value can move a lot, up or down.", correct: true, feedback: "Yes. The level tells you how much it can move, not which way." },
      { id: "b", text: "It will definitely go up.", feedback: "No: nobody knows which way it will move." },
      { id: "c", text: "It will definitely go down.", feedback: "No: nobody knows which way it will move." },
    ],
  }),
  Q07: (c) =>
    c.band === "young"
      ? {
          prompt: "All of your investment is on Companies. Companies goes down a lot. What does your investment do?",
          explain: "Everything was in one place, so it goes down a lot too. If you'd split it, part of it could have moved less.",
          options: [
            { id: "a", text: "It goes down a lot too.", correct: true, feedback: "Yes, everything was in one place. If you'd split it, part of it could have moved less." },
            { id: "b", text: "It doesn't move.", feedback: "It does: everything was on that holding." },
          ],
        }
      : {
          prompt: "You have 100% on Companies. Companies drops by 20%. Your portfolio…",
          explain: "Everything was on that holding, so it drops by 20%. Spreading across several holdings can soften this: that's diversification.",
          options: [
            { id: "a", text: "drops by 20%.", correct: true, feedback: "Yes. Spreading across several holdings can soften this: that's diversification." },
            { id: "b", text: "doesn't move.", feedback: "It does: everything was on that holding." },
          ],
        },
  Q08b: () => ({
    prompt: "You have 100 practice units. You put 60 on Safe. How many are left to invest?",
    explain: "100 minus 60 leaves 40.",
    options: [
      { id: "a", text: "40", correct: true, feedback: "Yes: 100 minus 60 leaves 40." },
      { id: "b", text: "60", feedback: "100 minus 60 leaves 40." },
      { id: "c", text: "160", feedback: "100 minus 60 leaves 40." },
    ],
  }),
  Q08: () => ({
    prompt: "You have 100 units. You put 30 on Lending. What share is that?",
    explain: "Per cent means \"out of 100\": 30 out of 100 is 30%.",
    options: [
      { id: "a", text: "30%", correct: true, feedback: "Yes: 30 out of 100." },
      { id: "b", text: "3%", feedback: "Per cent means \"out of 100\": 30 out of 100 is 30%." },
      { id: "c", text: "70%", feedback: "Per cent means \"out of 100\": 30 out of 100 is 30%." },
    ],
  }),
  Q16: () => ({
    prompt: "You've paid in 150 units. Your portfolio is worth 162. How much comes from the investments moving?",
    explain: "What you paid in isn't a gain: only the difference, 12, comes from the investments.",
    options: [
      { id: "a", text: "12", correct: true, feedback: "Yes: 162 minus 150." },
      { id: "b", text: "162", feedback: "What you paid in isn't a gain: only the difference comes from the investments." },
      { id: "c", text: "150", feedback: "What you paid in isn't a gain: only the difference comes from the investments." },
    ],
  }),
  Q12: () => ({
    prompt: "You'll need your units in 1 year. Which holding is most likely to be lower than at the start by then?",
    explain: "Over a short horizon, something that moves a lot can be down at the wrong moment.",
    options: [
      { id: "a", text: "Companies.", correct: true, feedback: "Yes. Over a short horizon, something that moves a lot can be down at the wrong moment." },
      { id: "b", text: "Safe.", feedback: "Safe barely moves." },
    ],
  }),
  Q09: () => ({
    prompt: "Two portfolios had exactly the same story. One has fees, the other doesn't. Which is worth more today?",
    explain: "Fees take a small share every year, even when everything else is the same.",
    options: [
      { id: "a", text: "The one with no fees.", correct: true, feedback: "Yes. Every year, the fees take a small share." },
      { id: "b", text: "They're the same.", feedback: "No: fees are taken even when everything else is the same." },
    ],
  }),
  Q10: () => ({
    prompt: "The market list used to cost 100 and now costs 105. Your Safe investment went from 100 to 103. Can you buy more or less than at the start?",
    explain: "Your investment grew more slowly than prices: your buying power went down.",
    options: [
      { id: "a", text: "A little less.", correct: true, feedback: "Yes. Your investment grew more slowly than prices: your buying power went down." },
      { id: "b", text: "More.", feedback: "It grew, but prices grew faster." },
    ],
  }),
  Q11: () => ({
    prompt: "Last year, your interest was added to your investment. This year, that interest…",
    explain: "It stays in your investment and earns more interest in turn: that's compounding.",
    options: [
      { id: "a", text: "earns interest too.", correct: true, feedback: "Yes: that's compounding." },
      { id: "b", text: "disappears.", feedback: "It stays in your investment and earns more in turn." },
      { id: "c", text: "doesn't count any more.", feedback: "It stays in your investment and earns more in turn." },
    ],
  }),
  Q14: () => ({
    prompt: "Switching means…",
    explain: "Switching means moving value from one holding to another.",
    options: [
      { id: "a", text: "moving value from one holding to another.", correct: true, feedback: "Yes." },
      { id: "b", text: "taking coins back to my account.", feedback: "No. Switching changes the split of the investment; taking coins back is a withdrawal." },
      { id: "c", text: "adding units.", feedback: "That's a deposit." },
    ],
  }),
  Q15: () => ({
    prompt: "In this game, the long-term orchard is mainly for…",
    explain: "It's a wrapper for waiting a long time. It never gives out coins.",
    options: [
      { id: "a", text: "investing over many years.", correct: true, feedback: "Yes." },
      { id: "b", text: "spending quickly.", feedback: "It's a wrapper for waiting a long time. It never gives out coins." },
      { id: "c", text: "earning coins.", feedback: "It's a wrapper for waiting a long time. It never gives out coins." },
    ],
  }),
};
