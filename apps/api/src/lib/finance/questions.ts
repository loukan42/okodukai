// Vérifications de compréhension (docs/FINANCIAL_EDUCATION.md §9) : une question, 2 ou 3 options
// mélangées par le serveur, puis « Je ne sais pas encore » en dernier. Le serveur garde la bonne
// réponse et les retours ; le client n'envoie que l'identifiant de l'option choisie.
import type { Band } from "./notions.js";
import type { RunFacts } from "./tips.js";

export type QuestionContext = "onboarding" | "vault" | "bilan" | "library";

export interface QuestionCtx {
  band: Band;
  run?: RunFacts;
  hasTransfer?: boolean;
  hasArbitrage?: boolean;
}

interface Option {
  id: string;
  text: string;
  correct?: true;
  feedback: string;
}

interface Built {
  prompt: string;
  options: Option[];
  /** Explication neutre, montrée pour « Je ne sais pas encore ». */
  explain: string;
}

interface QuestionDef {
  id: string;
  notion: string;
  band: "all" | Band;
  contexts: QuestionContext[];
  build: (ctx: QuestionCtx) => Built | null;
}

export const DONT_KNOW = "je_ne_sais_pas";
const fmt = (n: number, band: Band) =>
  band === "young" ? String(Math.round(n)) : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const QUESTIONS: QuestionDef[] = [
  {
    id: "Q04", notion: "unites_ecole", band: "all", contexts: ["onboarding", "library"],
    build: () => ({
      prompt: "Ton placement école a baissé. Et tes pièces ?",
      explain: "Les unités école servent à apprendre. Elles ne touchent jamais tes pièces.",
      options: [
        { id: "a", text: "Elles ne bougent pas.", correct: true, feedback: "Oui. Les unités école servent à apprendre. Elles ne touchent jamais tes pièces." },
        { id: "b", text: "Elles baissent aussi.", feedback: "Non. Ce sont deux choses séparées : tes pièces ne bougent pas." },
      ],
    }),
  },
  {
    id: "Q02", notion: "transfert", band: "all", contexts: ["vault", "library"],
    build: (c) =>
      c.hasTransfer === false
        ? null
        : {
            prompt: "Tu mets 10 pièces dans Mon coffre. Combien de pièces as-tu en tout ?",
            explain: "Mettre des pièces dans Mon coffre les change de place : le total ne change pas.",
            options: [
              { id: "a", text: "Autant qu'avant.", correct: true, feedback: "Oui. Tes pièces ont changé de place, le total ne change pas." },
              { id: "b", text: "10 de moins.", feedback: "Non : elles ne sont pas dépensées, elles sont dans Mon coffre." },
              { id: "c", text: "10 de plus.", feedback: "Non : tu n'as rien gagné, tu as déplacé des pièces." },
            ],
          },
  },
  {
    id: "Q01", notion: "compte", band: "all", contexts: ["vault", "library"],
    build: () => ({
      prompt: "Tu as 20 pièces sur Mon compte et 50 dans Mon coffre. Une récompense coûte 30 pièces. Que se passe-t-il ?",
      explain: "Seules les pièces de Mon compte s'utilisent directement. Il faut d'abord reprendre 10 pièces de Mon coffre.",
      options: [
        { id: "a", text: "Je dois d'abord reprendre des pièces de Mon coffre.", correct: true, feedback: "Oui. Mon compte, c'est ce que tu peux utiliser tout de suite." },
        { id: "b", text: "Je peux l'acheter tout de suite.", feedback: "Pas encore : seules les pièces de Mon compte s'utilisent directement. Il faut d'abord reprendre 10 pièces de Mon coffre." },
      ],
    }),
  },
  {
    id: "Q05", notion: "hausse_baisse", band: "all", contexts: ["bilan"],
    build: (c) => {
      const s = c.run?.lastStatement;
      if (!s) return null;
      const avant = fmt(s.startValue, c.band);
      const apres = fmt(s.endValue, c.band);
      if (avant === apres) return null;
      const up = s.endValue > s.startValue;
      const d = fmt(Math.abs(s.endValue - s.startValue), c.band);
      return {
        prompt: `Ton placement valait ${avant}. Il vaut ${apres}. Que s'est-il passé ?`,
        explain: `Regarde les deux nombres : ${apres} est plus ${up ? "grand" : "petit"} que ${avant}. Il a ${up ? "monté" : "baissé"} de ${d}.`,
        options: [
          { id: "a", text: `Il a ${up ? "monté" : "baissé"} de ${d}.`, correct: true, feedback: `Oui : de ${avant} à ${apres}, il a ${up ? "monté" : "baissé"} de ${d}.` },
          { id: "b", text: `Il a ${up ? "baissé" : "monté"} de ${d}.`, feedback: `Regarde les deux nombres : ${apres} est plus ${up ? "grand" : "petit"} que ${avant}.` },
          { id: "c", text: `Il a ${up ? "gagné" : "perdu"} ${apres}.`, feedback: `Non : il n'a changé que de ${d}.` },
        ],
      };
    },
  },
  {
    id: "Q13", notion: "patience", band: "all", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Entre deux relevés, que se passe-t-il si tu regardes tes placements 10 fois ?",
      explain: "La valeur change seulement au relevé. Tu n'as pas besoin de regarder toutes les cinq minutes.",
      options: [
        { id: "a", text: "Rien ne change.", correct: true, feedback: "Oui. La valeur change seulement au relevé. Tu n'as pas besoin de regarder toutes les cinq minutes." },
        { id: "b", text: "Ils montent.", feedback: "Non. La valeur change seulement au relevé, pas quand tu regardes." },
        { id: "c", text: "Ils baissent.", feedback: "Non. La valeur change seulement au relevé, pas quand tu regardes." },
      ],
    }),
  },
  {
    id: "Q06", notion: "risque", band: "all", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Un support a un niveau de risque 5 sur 5. Qu'est-ce que ça veut dire ?",
      explain: "Le niveau dit à quel point ça peut bouger, pas dans quel sens.",
      options: [
        { id: "a", text: "Sa valeur peut beaucoup bouger, vers le haut ou vers le bas.", correct: true, feedback: "Oui. Le niveau dit à quel point ça peut bouger, pas dans quel sens." },
        { id: "b", text: "Il va forcément monter.", feedback: "Non : personne ne sait dans quel sens il va bouger." },
        { id: "c", text: "Il va forcément baisser.", feedback: "Non : personne ne sait dans quel sens il va bouger." },
      ],
    }),
  },
  {
    id: "Q07", notion: "concentration", band: "all", contexts: ["bilan", "library"],
    build: (c) =>
      c.band === "young"
        ? {
            prompt: "Tout ton placement est sur Entreprises. Entreprises baisse beaucoup. Que fait ton placement ?",
            explain: "Tout était au même endroit : il baisse beaucoup aussi. En répartissant, une partie aurait pu moins bouger.",
            options: [
              { id: "a", text: "Il baisse beaucoup aussi.", correct: true, feedback: "Oui, tout était au même endroit. En répartissant, une partie aurait pu moins bouger." },
              { id: "b", text: "Il ne bouge pas.", feedback: "Si : tout était sur ce support." },
            ],
          }
        : {
            prompt: "Tu as 100 % sur Entreprises. Entreprises baisse de 20 %. Ton portefeuille…",
            explain: "Tout était sur ce support : il baisse de 20 %. Répartir sur plusieurs supports peut limiter cet effet : c'est la diversification.",
            options: [
              { id: "a", text: "baisse de 20 %.", correct: true, feedback: "Oui. Répartir sur plusieurs supports peut limiter cet effet : c'est la diversification." },
              { id: "b", text: "ne bouge pas.", feedback: "Si : tout était sur ce support." },
            ],
          },
  },
  {
    id: "Q08b", notion: "repartition", band: "young", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Tu as 100 unités école. Tu en mets 60 sur Sécurisé. Combien en reste-t-il à placer ?",
      explain: "100 moins 60, il en reste 40.",
      options: [
        { id: "a", text: "40", correct: true, feedback: "Oui : 100 moins 60, il en reste 40." },
        { id: "b", text: "60", feedback: "100 moins 60, il en reste 40." },
        { id: "c", text: "160", feedback: "100 moins 60, il en reste 40." },
      ],
    }),
  },
  {
    id: "Q08", notion: "pourcentage", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Tu as 100 unités. Tu en mets 30 sur Prêter. Quelle part est-ce ?",
      explain: "Pour cent veut dire « sur 100 » : 30 sur 100, c'est 30 %.",
      options: [
        { id: "a", text: "30 %", correct: true, feedback: "Oui : 30 sur 100." },
        { id: "b", text: "3 %", feedback: "Pour cent veut dire « sur 100 » : 30 sur 100, c'est 30 %." },
        { id: "c", text: "70 %", feedback: "Pour cent veut dire « sur 100 » : 30 sur 100, c'est 30 %." },
      ],
    }),
  },
  {
    id: "Q16", notion: "verse_vs_valeur", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Tu as versé 150 unités. Ton portefeuille vaut 162. Combien viennent des mouvements des placements ?",
      explain: "Ce que tu as versé n'est pas un gain : seule la différence, 12, vient des placements.",
      options: [
        { id: "a", text: "12", correct: true, feedback: "Oui : 162 moins 150." },
        { id: "b", text: "162", feedback: "Ce que tu as versé n'est pas un gain : seule la différence vient des placements." },
        { id: "c", text: "150", feedback: "Ce que tu as versé n'est pas un gain : seule la différence vient des placements." },
      ],
    }),
  },
  {
    id: "Q12", notion: "horizon", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Tu auras besoin de tes unités dans 1 an. Quel support a le plus de risques d'être plus bas qu'au départ à ce moment-là ?",
      explain: "Sur un horizon court, ce qui bouge beaucoup peut être en baisse au mauvais moment.",
      options: [
        { id: "a", text: "Entreprises.", correct: true, feedback: "Oui. Sur un horizon court, ce qui bouge beaucoup peut être en baisse au mauvais moment." },
        { id: "b", text: "Sécurisé.", feedback: "Sécurisé bouge très peu." },
      ],
    }),
  },
  {
    id: "Q09", notion: "frais", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Deux portefeuilles ont eu exactement la même histoire. L'un a des frais, l'autre non. Lequel vaut le plus aujourd'hui ?",
      explain: "Les frais retirent une petite part chaque année, même si tout le reste est identique.",
      options: [
        { id: "a", text: "Celui sans frais.", correct: true, feedback: "Oui. Chaque année, les frais retirent une petite part." },
        { id: "b", text: "Pareil.", feedback: "Non : les frais sont retirés même si tout le reste est identique." },
      ],
    }),
  },
  {
    id: "Q10", notion: "pouvoir_achat", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "La liste du marché coûtait 100, elle coûte maintenant 105. Ton placement Sécurisé est passé de 100 à 103. Peux-tu acheter plus ou moins de choses qu'au départ ?",
      explain: "Ton placement a grandi moins vite que les prix : ton pouvoir d'achat a baissé.",
      options: [
        { id: "a", text: "Un peu moins.", correct: true, feedback: "Oui. Ton placement a grandi moins vite que les prix : ton pouvoir d'achat a baissé." },
        { id: "b", text: "Plus.", feedback: "Il a grandi, mais les prix ont grandi plus vite." },
      ],
    }),
  },
  {
    id: "Q11", notion: "capitalisation", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "L'an dernier, tes intérêts ont été ajoutés à ton placement. Cette année, ils…",
      explain: "Ils restent dans ton placement et rapportent à leur tour : c'est la capitalisation.",
      options: [
        { id: "a", text: "rapportent eux aussi des intérêts.", correct: true, feedback: "Oui : c'est la capitalisation." },
        { id: "b", text: "disparaissent.", feedback: "Ils restent dans ton placement et rapportent à leur tour." },
        { id: "c", text: "ne comptent plus.", feedback: "Ils restent dans ton placement et rapportent à leur tour." },
      ],
    }),
  },
  {
    id: "Q14", notion: "arbitrage", band: "old", contexts: ["bilan", "library"],
    build: () => ({
      prompt: "Arbitrer, c'est…",
      explain: "Arbitrer, c'est déplacer de la valeur d'un support à un autre.",
      options: [
        { id: "a", text: "déplacer de la valeur d'un support à un autre.", correct: true, feedback: "Oui." },
        { id: "b", text: "transformer des unités en pièces.", feedback: "Impossible : les unités école ne deviennent jamais des pièces." },
        { id: "c", text: "ajouter des unités.", feedback: "Ça, c'est un versement." },
      ],
    }),
  },
  {
    id: "Q15", notion: "assurance_vie", band: "old", contexts: ["library"],
    build: () => ({
      prompt: "Dans ce jeu, le verger du temps long sert surtout à…",
      explain: "C'est une enveloppe pour attendre longtemps. Elle ne donne jamais de pièces.",
      options: [
        { id: "a", text: "placer sur de longues années.", correct: true, feedback: "Oui." },
        { id: "b", text: "dépenser vite.", feedback: "C'est une enveloppe pour attendre longtemps. Elle ne donne jamais de pièces." },
        { id: "c", text: "gagner des pièces.", feedback: "C'est une enveloppe pour attendre longtemps. Elle ne donne jamais de pièces." },
      ],
    }),
  },
];

export function questionById(id: string) {
  return QUESTIONS.find((q) => q.id === id) ?? null;
}

const bandFits = (q: QuestionDef, band: Band) => q.band === "all" || q.band === band;

/** Première question à poser dans ce contexte, pour une notion pas encore vérifiée. */
export function pickQuestion(context: QuestionContext, ctx: QuestionCtx, verified: Set<string>) {
  for (const q of QUESTIONS) {
    if (!q.contexts.includes(context) || !bandFits(q, ctx.band) || verified.has(q.notion)) continue;
    const built = q.build(ctx);
    if (built) return { def: q, built };
  }
  return null;
}

/** Vue client : options mélangées, bonne réponse et retours gardés côté serveur. */
export function publicQuestion(def: QuestionDef, built: Built) {
  const shuffled = [...built.options].sort(() => Math.random() - 0.5);
  return {
    id: def.id,
    prompt: built.prompt,
    options: [...shuffled.map((o) => ({ id: o.id, text: o.text })), { id: DONT_KNOW, text: "Je ne sais pas encore" }],
  };
}

export function grade(def: QuestionDef, ctx: QuestionCtx, optionId: string) {
  const built = def.build(ctx);
  if (!built) return null;
  if (optionId === DONT_KNOW) return { correct: false, feedback: built.explain };
  const option = built.options.find((o) => o.id === optionId);
  if (!option) return null;
  return { correct: Boolean(option.correct), feedback: option.feedback };
}

export type { QuestionDef };
