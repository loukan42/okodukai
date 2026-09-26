import type { CardRarity } from "@okodukai/shared";

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** Textes de l'ouverture d'un booster (enfant : phrases courtes, jamais de pression). */
export const COPY = {
  dialogLabel: "Ouverture du booster",
  skip: "Passer",
  soundOn: "Couper le son",
  soundOff: "Remettre le son",
  summonTitle: "Le booster s'éveille",
  summonWaiting: "Tes cartes arrivent…",
  boosterOf: (universe: string) => `Booster ${universe}`,
  crystalPrompt: "Touche le cristal !",
  crystalHold: "Tu peux aussi rester appuyé.",
  crystalLeft: (n: number) => `Encore ${n} ${plural(n, "touche", "touches")}`,
  crystalHint: "Le cristal change de couleur…",
  crystalLabel: (n: number) => `Briser le cristal : encore ${n} ${plural(n, "touche", "touches")}`,
  crystalBreaking: "Le cristal se brise !",
  announce: {
    RARE: "Une carte rare arrive.",
    EPIQUE: "Une carte épique arrive !",
    LEGENDAIRE: "Une carte légendaire se réveille !",
  } as Partial<Record<CardRarity, string>>,
  counter: (i: number, n: number) => `Carte ${i} sur ${n}`,
  flipLabel: "Retourner la carte",
  flipHint: "Touche la carte pour la retourner.",
  flip: "Retourner",
  next: "Carte suivante",
  seeAll: "Voir mes cartes",
  revealAll: "Tout révéler",
  newBadge: "Nouvelle !",
  owned: "Déjà dans ton album",
  summaryTitle: "Ton booster est ouvert",
  summaryNew: (n: number) => `${n} ${plural(n, "nouvelle carte rejoint", "nouvelles cartes rejoignent")} ton album.`,
  summaryNoNew: "Tu avais déjà ces cartes : elles s'ajoutent à tes doubles.",
  openNext: (n: number) => `Booster suivant (${n})`,
  back: "Retour à l'album",
  errorTitle: "Le booster n'a pas pu s'ouvrir.",
  errorBody: "Vérifie ta connexion, puis réessaie. Ton booster t'attend toujours.",
  retry: "Réessayer",
  close: "Fermer",
};
