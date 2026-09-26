// Notions financières et leur progression par enfant (docs/FINANCIAL_EDUCATION.md §3 et §4.2) :
// inconnue → rencontrée (événement vécu) → expliquée (encart lu) → vérifiée (bonne réponse, XP).
import type { AgeBand, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { grantXp } from "../xp.js";

type Client = Prisma.TransactionClient | typeof prisma;

export type Band = "young" | "old";
export const bandOf = (ageBand: AgeBand): Band => (ageBand === "AGE_8_9" ? "young" : "old");

/** Code → mot appris, chapitre du carnet, tranche minimale du mot (§3). */
export const NOTIONS: Record<string, { word: string; chapter: number; old?: true }> = {
  compte: { word: "Mon compte", chapter: 1 },
  solde: { word: "solde", chapter: 1 },
  entree: { word: "entrée", chapter: 1 },
  sortie: { word: "sortie", chapter: 1 },
  historique: { word: "historique", chapter: 1 },
  transfert: { word: "transfert", chapter: 2 },
  epargne: { word: "épargne", chapter: 2 },
  objectif: { word: "objectif", chapter: 2 },
  unites_ecole: { word: "unités école", chapter: 3 },
  placement: { word: "placement", chapter: 3 },
  support: { word: "support", chapter: 3 },
  repartition: { word: "répartir", chapter: 3 },
  releve: { word: "relevé", chapter: 3 },
  hausse_baisse: { word: "monter, baisser", chapter: 3 },
  risque: { word: "risque", chapter: 3 },
  concentration: { word: "tout au même endroit", chapter: 3 },
  patience: { word: "patience", chapter: 4 },
  temps_long: { word: "attendre longtemps", chapter: 4 },
  pourcentage: { word: "pour cent", chapter: 5, old: true },
  rendement: { word: "rendement", chapter: 5, old: true },
  volatilite: { word: "volatilité", chapter: 5, old: true },
  obligation: { word: "obligation", chapter: 5, old: true },
  action: { word: "action", chapter: 5, old: true },
  fonds: { word: "fonds", chapter: 5, old: true },
  diversification: { word: "diversification", chapter: 5, old: true },
  allocation: { word: "allocation", chapter: 5, old: true },
  latent: { word: "plus-value, moins-value", chapter: 5, old: true },
  patrimoine: { word: "patrimoine", chapter: 5, old: true },
  interets: { word: "intérêts", chapter: 6, old: true },
  capitalisation: { word: "capitalisation", chapter: 6, old: true },
  frais: { word: "frais de gestion", chapter: 6, old: true },
  inflation: { word: "inflation", chapter: 6, old: true },
  pouvoir_achat: { word: "pouvoir d'achat", chapter: 6, old: true },
  arbitrage: { word: "arbitrage", chapter: 7, old: true },
  reequilibrage: { word: "rééquilibrer", chapter: 7, old: true },
  versement_regulier: { word: "versement programmé", chapter: 7, old: true },
  verse_vs_valeur: { word: "versé et valeur", chapter: 7, old: true },
  horizon: { word: "horizon", chapter: 7, old: true },
  assurance_vie: { word: "assurance-vie", chapter: 8, old: true },
};

export const CHAPTERS: Record<number, string> = {
  1: "Mon compte",
  2: "Coffre magique",
  3: "L'observatoire",
  4: "Le temps",
  5: "Les vrais mots",
  6: "Ce qui grignote, ce qui fait grandir",
  7: "Décider dans la durée",
  8: "Le verger du temps long",
};

/** Notions montrées à cette tranche (les mots 10-12 ne s'affichent pas en Découverte). */
export const notionsFor = (band: Band) => Object.entries(NOTIONS).filter(([, n]) => band === "old" || !n.old);

/** L'événement a eu lieu : la notion est « rencontrée » (jamais de retour en arrière). */
export async function encounter(client: Client, childId: string, codes: string[], anchor?: string) {
  for (const notionCode of codes.filter((c) => NOTIONS[c])) {
    await client.financeNotionProgress.upsert({
      where: { childId_notionCode: { childId, notionCode } },
      create: { childId, notionCode, anchor },
      update: {},
    });
  }
}

/** Encart lu (« J'ai compris ») : la notion passe « expliquée », sauf si elle est déjà vérifiée. */
export async function explain(client: Client, childId: string, codes: string[]) {
  const now = new Date();
  for (const notionCode of codes.filter((c) => NOTIONS[c])) {
    await client.financeNotionProgress.upsert({
      where: { childId_notionCode: { childId, notionCode } },
      create: { childId, notionCode, state: "EXPLIQUEE", explainedAt: now },
      update: {},
    });
    await client.financeNotionProgress.updateMany({ where: { childId, notionCode, state: "RENCONTREE" }, data: { state: "EXPLIQUEE", explainedAt: now } });
  }
}

export const NOTION_XP = 10;

/** Bonne réponse : la notion est vérifiée et donne 10 XP, une seule fois (§7.1). */
export async function verify(client: Prisma.TransactionClient, childId: string, notionCode: string) {
  const now = new Date();
  await client.financeNotionProgress.upsert({
    where: { childId_notionCode: { childId, notionCode } },
    create: { childId, notionCode, state: "VERIFIEE", explainedAt: now, verifiedAt: now },
    update: { state: "VERIFIEE", verifiedAt: now },
  });
  const granted = await grantXp(client, { childId, amount: NOTION_XP, sourceType: "FINANCE_LEARNING", sourceId: notionCode, idempotencyKey: `fin:notion:${childId}:${notionCode}` });
  return granted ? NOTION_XP : 0;
}
