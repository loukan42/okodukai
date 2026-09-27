import type { SharePlatformId } from "./campaign";

export type CaptionLocale = "fr" | "en";

const CAPTIONS: Record<CaptionLocale, Partial<Record<SharePlatformId, string>>> = {
  fr: {
    instagram:
      "Et si les routines du quotidien devenaient des missions ?\n\nAvec Okodukai, les enfants gagnent des pièces virtuelles, apprennent à les gérer, à économiser et à faire leurs premiers choix avec l'argent.\n\n100 % gratuit.\n\n#Okodukai #Parentalité #EducationFinancière",
    tiktok:
      "Et si « Range ta chambre » devenait une quête ?\n\nOkodukai transforme les routines en missions, les missions en pièces, et les pièces en premiers choix.\n\n100 % gratuit.",
    facebook:
      "Je viens de découvrir Okodukai : un jeu de compte bancaire fictif pour apprendre aux enfants à gagner, économiser et choisir. C'est entièrement gratuit.",
    x: "Et si ranger sa chambre devenait une quête ?\n\nOkodukai transforme les routines en missions, les missions en pièces, et les pièces en premiers choix financiers.\n\n100 % gratuit.",
    linkedin:
      "Je viens de découvrir Okodukai, un jeu de compte bancaire fictif qui transforme les routines du quotidien en missions et aide les enfants à apprendre à gérer leur argent. L'application est entièrement gratuite.",
    whatsapp:
      "Je te partage Okodukai, une application gratuite qui transforme les petites missions du quotidien en jeu et apprend aux enfants à gérer de l'argent virtuel.",
    messenger:
      "Je te partage Okodukai, une application gratuite qui transforme les petites missions du quotidien en jeu et apprend aux enfants à gérer de l'argent virtuel.",
    telegram:
      "Je te partage Okodukai, une application gratuite qui transforme les petites missions du quotidien en jeu et apprend aux enfants à gérer de l'argent virtuel.",
    sms: "Je te partage Okodukai : un jeu de compte fictif pour apprendre aux enfants à gagner, économiser et choisir. 100 % gratuit.",
    email:
      "Bonjour,\n\nJe te partage Okodukai, une application gratuite où les parents créent des missions et des récompenses, pendant que les enfants apprennent à gagner, économiser et faire des choix avec de l'argent virtuel.\n\nVoici le lien : {url}\n\nÀ bientôt.",
    native:
      "Je viens de découvrir Okodukai : un jeu de compte bancaire fictif pour apprendre aux enfants à gagner, économiser et choisir. C'est entièrement gratuit.",
  },
  en: {
    instagram:
      "What if everyday routines became missions?\n\nWith Okodukai, kids earn virtual coins, learn to manage them, save, and make their first money choices.\n\n100% free.\n\n#Okodukai #Parenting #FinancialEducation",
    tiktok:
      "What if “Tidy your room” became a quest?\n\nOkodukai turns routines into missions, missions into coins, and coins into first choices.\n\n100% free.",
    facebook:
      "I just found Okodukai: a make-believe bank account game that helps kids earn, save and choose. It's completely free.",
    x: "What if tidying a room became a quest?\n\nOkodukai turns routines into missions, missions into coins, and coins into first money choices.\n\n100% free.",
    linkedin:
      "I just discovered Okodukai, a make-believe bank account game that turns everyday routines into missions and helps kids learn to manage money. The app is completely free.",
    whatsapp:
      "Sharing Okodukai — a free app that turns small daily missions into a game and helps kids manage virtual money.",
    messenger:
      "Sharing Okodukai — a free app that turns small daily missions into a game and helps kids manage virtual money.",
    telegram:
      "Sharing Okodukai — a free app that turns small daily missions into a game and helps kids manage virtual money.",
    sms: "Sharing Okodukai: a make-believe account game for kids to earn, save and choose. 100% free.",
    email:
      "Hi,\n\nI'm sharing Okodukai, a free app where parents create missions and rewards while kids learn to earn, save and make choices with virtual money.\n\nHere's the link: {url}\n\nTake care.",
    native:
      "I just found Okodukai: a make-believe bank account game that helps kids earn, save and choose. It's completely free.",
  },
};

export const EMAIL_SUBJECT = {
  fr: "Une application gratuite pour apprendre aux enfants à gérer leur argent",
  en: "A free app that helps kids learn to manage money",
} as const;

export function captionFor(platform: SharePlatformId, locale: CaptionLocale, url?: string): string {
  const raw = CAPTIONS[locale][platform] ?? CAPTIONS[locale].native ?? "";
  return url ? raw.replaceAll("{url}", url) : raw.replaceAll("\n\nVoici le lien : {url}", "").replaceAll("\n\nHere's the link: {url}", "");
}

/** Refuse toute donnée personnelle dans un texte destiné au partage. */
export function assertNoPersonalData(text: string): boolean {
  const patterns = [
    /\b[\w.+-]+@[\w.-]+\.\w+\b/i,
    /\b(?:enfant|child)\s*[:=]\s*\w+/i,
    /\bhousehold[_-]?id\b/i,
    /\buser[_-]?id\b/i,
  ];
  return !patterns.some((p) => p.test(text));
}
