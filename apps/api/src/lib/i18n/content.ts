// Contenus de référence en anglais (univers, cartes, badges, modules). La base garde les textes
// français d'origine ; ces tables les remplacent à la lecture quand la requête demande l'anglais.
import { locale } from "../i18n.js";

/** Titre d'univers français (tel qu'importé du CSV) → anglais. */
const UNIVERSES_EN: Record<string, string> = {
  "Les grandes époques de l'histoire": "Great periods of history",
  "Les merveilles du monde (Antiques)": "Wonders of the ancient world",
  "Les grands explorateurs": "Great explorers",
  "Les grandes capitales": "Great capital cities",
  "Les grands personnages historiques": "Great figures in history",
  "Les grandes inventions": "Great inventions",
  "Les planètes du système solaire": "Planets of the solar system",
  "Les instruments de musique": "Musical instruments",
  "Émotions": "Emotions",
  Sports: "Sports",
  "Créatures fantastiques": "Fantastic creatures",
  "Dinosaures et créatures préhistoriques": "Dinosaurs and prehistoric creatures",
  "Les Dieux Grecs": "The Greek gods",
  "Les guerriers du monde": "Warriors of the world",
};

/** Nom de carte français (normalisé, voir `key`) → anglais. Les noms identiques ne sont pas répétés. */
const CARDS_EN: Record<string, string> = {
  athenes: "Athens",
  brasilia: "Brasília",
  londres: "London",
  moscou: "Moscow",
  pekin: "Beijing",
  cleopatre: "Cleopatra",
  "jeanne d'arc": "Joan of Arc",
  "jules cesar": "Julius Caesar",
  "leonard de vinci": "Leonardo da Vinci",
  "napoleon bonaparte": "Napoleon Bonaparte",
  "colosse de rhodes": "Colossus of Rhodes",
  "grande pyramide de gizeh": "Great Pyramid of Giza",
  "jardins suspendus de babylone": "Hanging Gardens of Babylon",
  "mausolee d'halicarnasse": "Mausoleum at Halicarnassus",
  "phare d'alexandrie": "Lighthouse of Alexandria",
  "statue de zeus a olympie": "Statue of Zeus at Olympia",
  "temple d'artemis a ephese": "Temple of Artemis at Ephesus",
  "marche de l'antiquite et temples": "Ancient market and temples",
  "moyen age": "Middle Ages",
  neolithique: "Neolithic",
  prehistoire: "Prehistory",
  "revolution industrielle": "Industrial Revolution",
  "epoque contemporaine": "Modern times",
  "fee des forets": "Forest fairy",
  "golem de pierre": "Stone golem",
  griffon: "Griffin",
  licorne: "Unicorn",
  phenix: "Phoenix",
  sirene: "Mermaid",
  apollon: "Apollo",
  athena: "Athena",
  demeter: "Demeter",
  hephaistos: "Hephaestus",
  mercure: "Mercury",
  saturne: "Saturn",
  terre: "Earth",
  calme: "Calm",
  curiosite: "Curiosity",
  empathie: "Empathy",
  fierte: "Pride",
  joie: "Joy",
  batterie: "Drum kit",
  flute: "Flute",
  guitare: "Guitar",
  harpe: "Harp",
  tambour: "Drum",
  trompette: "Trumpet",
  violon: "Violin",
  "christophe colomb": "Christopher Columbus",
  "exploration spatiale": "Space exploration",
  "fernand de magellan": "Ferdinand Magellan",
  athletisme: "Athletics",
  basket: "Basketball",
  escalade: "Climbing",
  natation: "Swimming",
  skate: "Skateboarding",
  chevalier: "Knight",
  gladiateur: "Gladiator",
  samourai: "Samurai",
  ankylosaure: "Ankylosaurus",
  brachiosaure: "Brachiosaurus",
  ichthyosaure: "Ichthyosaurus",
  mamouth: "Mammoth",
  megalodon: "Megalodon",
  pterosaure: "Pterosaur",
  "l'imprimerie": "The printing press",
  "l'ecriture": "Writing",
  "la machine a vapeur": "The steam engine",
  "la roue": "The wheel",
  "le feu": "Fire",
  "l'electricite": "Electricity",
};

/** Clé tolérante : sans accents ni casse, apostrophes droites. */
function key(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();
}

const en = () => locale() === "en";

export function universeTitle(title: string): string {
  return en() ? UNIVERSES_EN[title] ?? title : title;
}

export function cardName(name: string): string {
  return en() ? CARDS_EN[key(name)] ?? name : name;
}

/** « Booster Les grandes inventions » → « Great inventions booster ». */
export function boosterTitle(title: string, universe?: string): string {
  if (!en()) return title;
  const base = universe ?? title.replace(/^Booster\s+/, "");
  return `${universeTitle(base)} booster`;
}

/** Remplace les champs lisibles d'un univers (et garde le reste tel quel). */
export function localizeUniverse<T extends { title: string; description?: string | null }>(universe: T): T {
  if (!en()) return universe;
  return { ...universe, title: universeTitle(universe.title), description: universe.description ? universe.description : universe.description };
}

export function localizeCard<T extends { name: string }>(card: T): T {
  return en() ? { ...card, name: cardName(card.name) } : card;
}

const BADGES_EN: Record<string, { title: string; description: string }> = {
  premier_objectif: { title: "First goal", description: "Reach your first savings goal." },
  super_epargnant: { title: "Super saver", description: "Keep some coins in your vault." },
  explorateur: { title: "Explorer", description: "Discover three learning lessons." },
  collectionneur: { title: "Collector", description: "Collect 50 different cards." },
  perseverant: { title: "Determined", description: "Finish ten quests." },
};

export function localizeBadge<T extends { code: string; title: string; description: string }>(badge: T): T {
  const text = en() ? BADGES_EN[badge.code] : undefined;
  return text ? { ...badge, ...text } : badge;
}

export function badgeTitle(code: string, title: string): string {
  return (en() && BADGES_EN[code]?.title) || title;
}

interface ModuleText {
  title: string;
  subtitle: string;
  situation: string;
  choice: { a: string; b: string };
  consequence: string;
  explanation: string;
  vocabulary: string;
  quiz: { question: string; options: string[]; explanation: string };
}

/** Modules pédagogiques en anglais (même code, même bonne réponse que `contentSeed.ts`). */
const MODULES_EN: Record<string, ModuleText> = {
  budget: {
    title: "My coins aren't endless",
    subtitle: "Budget",
    situation: "You have 100 coins.",
    choice: { a: "Use them all at once", b: "Keep some aside" },
    consequence: "If you keep some, you can still choose later.",
    explanation: "A budget means deciding in advance how to share out what you have.",
    vocabulary: "In real life, this is called a budget.",
    quiz: {
      question: "If you spend everything, what do you have left?",
      options: ["Half", "Nothing", "Double"],
      explanation: "Everything you spend is gone: there's nothing left for later.",
    },
  },
  epargne: {
    title: "Now or later?",
    subtitle: "Saving",
    situation: "You want something that costs more than you have.",
    choice: { a: "Spend what you have on something else", b: "Put some aside every week" },
    consequence: "By putting some aside, you can reach your goal.",
    explanation: "Not using everything straight away means you'll have more later.",
    vocabulary: "This is called saving.",
    quiz: {
      question: "Saving means…",
      options: ["Spending everything right away", "Putting some aside for later", "Borrowing from a friend"],
      explanation: "Saving means keeping part of what you have to use later.",
    },
  },
  inflation: {
    title: "Why do prices change?",
    subtitle: "Inflation",
    situation: "At the valley market, the shopping list costs 100 practice units.",
    choice: { a: "It will always cost 100", b: "Its price can change over time" },
    consequence: "A year later, the same list costs 103 practice units.",
    explanation: "When most prices go up over time, it's called inflation. The prices in your family shop are set by your parents.",
    vocabulary: "This is called inflation.",
    quiz: {
      question: "Inflation is when most prices…",
      options: ["Go down", "Always stay the same", "Go up"],
      explanation: "Inflation is when most prices go up over time.",
    },
  },
};

/** Texte anglais d'un module, s'il existe et si la requête le demande. */
export function moduleText(code: string): ModuleText | null {
  return en() ? MODULES_EN[code] ?? null : null;
}
