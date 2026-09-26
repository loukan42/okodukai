// Contenu des modules pédagogiques : la bonne réponse reste côté serveur. Le client reçoit
// la question et les propositions, renvoie l'index choisi, et le serveur décide (XP compris).

export interface ModuleQuiz {
  question: string;
  options: string[];
  answerIndex: number;
  /** Explication montrée après une réponse, juste ou non. */
  explanation: string;
}

export interface ModuleContent {
  situation: string;
  choice: { a: string; b: string };
  consequence: string;
  explanation: string;
  vocabulary: string;
  quiz: ModuleQuiz;
}

// Anciens contenus (quiz à une seule réponse, bonne réponse toujours en premier à l'écran) :
// propositions complètes par code de module, bonne réponse jamais en première position.
const LEGACY_QUIZ: Record<string, Omit<ModuleQuiz, "question">> = {
  budget: {
    options: ["Encore la moitié", "Rien", "Le double"],
    answerIndex: 1,
    explanation: "Tout ce qui est dépensé est sorti : il ne reste rien pour plus tard.",
  },
  epargne: {
    options: ["Tout dépenser tout de suite", "Mettre de côté pour plus tard", "Emprunter à un ami"],
    answerIndex: 1,
    explanation: "Épargner, c'est garder une partie de ce qu'on a pour l'utiliser plus tard.",
  },
  inflation: {
    options: ["Baissent", "Restent toujours pareils", "Augmentent"],
    answerIndex: 2,
    explanation: "L'inflation, c'est quand la plupart des prix montent avec le temps.",
  },
};

// L'ancien module inflation parlait de prix en pièces (« une glace à 10 puis 12 pièces ») :
// il laissait croire que la boutique familiale allait augmenter. On le remplace, en unités école.
const LEGACY_TEXT: Record<string, Omit<ModuleContent, "quiz">> = {
  inflation: {
    situation: "Au marché de la vallée, la liste de courses coûte 100 unités école.",
    choice: { a: "Elle coûtera toujours 100", b: "Son prix peut changer avec le temps" },
    consequence: "Un an plus tard, la même liste coûte 103 unités école.",
    explanation: "Quand la plupart des prix montent avec le temps, on parle d'inflation. Les prix de ta boutique familiale, eux, sont fixés par tes parents.",
    vocabulary: "Cela s'appelle l'inflation.",
  },
};

/** Remet un contenu stocké (ancien ou nouveau format) au format courant. */
export function normalizeContent(code: string, raw: unknown): ModuleContent {
  type StoredQuiz = Partial<ModuleQuiz> & { answer?: string };
  const content = (raw ?? {}) as Omit<Partial<ModuleContent>, "quiz"> & { quiz?: StoredQuiz };
  const quiz: StoredQuiz = content.quiz ?? {};
  let normalized: ModuleQuiz;
  if (Array.isArray(quiz.options) && typeof quiz.answerIndex === "number") {
    normalized = { question: quiz.question ?? "", options: quiz.options, answerIndex: quiz.answerIndex, explanation: quiz.explanation ?? content.explanation ?? "" };
  } else {
    const legacy = LEGACY_QUIZ[code];
    normalized = legacy
      ? { question: quiz.question ?? "", ...legacy }
      : { question: quiz.question ?? "", options: [quiz.answer ?? "Oui"], answerIndex: 0, explanation: content.explanation ?? "" };
  }
  const legacyText = !Array.isArray(quiz.options) ? LEGACY_TEXT[code] : undefined;
  if (legacyText) return { ...legacyText, quiz: normalized };
  return {
    situation: content.situation ?? "",
    choice: content.choice ?? { a: "", b: "" },
    consequence: content.consequence ?? "",
    explanation: content.explanation ?? "",
    vocabulary: content.vocabulary ?? "",
    quiz: normalized,
  };
}

/** Ce que le client a le droit de voir : pas de bonne réponse ni d'explication du quiz. */
export function publicContent(content: ModuleContent) {
  const { answerIndex: _answer, explanation: _explanation, ...quiz } = content.quiz;
  return { ...content, quiz };
}
