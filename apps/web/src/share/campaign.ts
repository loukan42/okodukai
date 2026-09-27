/** Manifeste centralisé de la campagne de partage organique parent. */

export const CANONICAL_ORIGIN = "https://okodukai-gold.vercel.app";
export const CAMPAIGN_ID = "parent-organic-v1";

export type ShareFormatId = "story" | "feed" | "square" | "landscape";
export type SharePlatformId =
  | "native"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "linkedin"
  | "whatsapp"
  | "messenger"
  | "telegram"
  | "sms"
  | "email"
  | "copy_link"
  | "copy_caption"
  | "download";

export type BannerVariant = "a" | "b";
export type CtaVariant = "a" | "b";

export interface VideoFormat {
  id: ShareFormatId;
  labelFr: string;
  labelEn: string;
  url: string;
  silentUrl: string;
  width: number;
  height: number;
  duration: number;
  fileName: string;
}

/** Variantes de wording configurables (pas d'infra A/B). */
export const BANNER_VARIANTS: Record<BannerVariant, { fr: string; en: string }> = {
  a: {
    fr: "Okodukai est gratuit. Un partage peut nous aider à le faire découvrir à d'autres parents.",
    en: "Okodukai is free. Sharing helps other parents discover it.",
  },
  b: {
    fr: "Vous connaissez un parent qui répète « Range ta chambre » tous les jours ?",
    en: "Know a parent who repeats “Tidy your room” every day?",
  },
};

export const CTA_VARIANTS: Record<CtaVariant, { fr: string; en: string }> = {
  a: { fr: "Partager Okodukai", en: "Share Okodukai" },
  b: { fr: "Faire découvrir Okodukai", en: "Help others discover Okodukai" },
};

export const ACTIVE_BANNER_VARIANT: BannerVariant = "a";
export const ACTIVE_CTA_VARIANT: CtaVariant = "a";

export const VIDEO_FORMATS: Record<ShareFormatId, VideoFormat> = {
  story: {
    id: "story",
    labelFr: "Story 9:16",
    labelEn: "Story 9:16",
    url: "/social/parent-organic-v1/video/okodukai-story-12s.mp4",
    silentUrl: "/social/parent-organic-v1/video/okodukai-story-12s-silent.mp4",
    width: 1080,
    height: 1920,
    duration: 12.5,
    fileName: "okodukai-story-12s.mp4",
  },
  feed: {
    id: "feed",
    labelFr: "Post 4:5",
    labelEn: "Post 4:5",
    url: "/social/parent-organic-v1/video/okodukai-feed-12s.mp4",
    silentUrl: "/social/parent-organic-v1/video/okodukai-feed-12s-silent.mp4",
    width: 1080,
    height: 1350,
    duration: 12.5,
    fileName: "okodukai-feed-12s.mp4",
  },
  square: {
    id: "square",
    labelFr: "Carré 1:1",
    labelEn: "Square 1:1",
    url: "/social/parent-organic-v1/video/okodukai-square-12s.mp4",
    silentUrl: "/social/parent-organic-v1/video/okodukai-square-12s-silent.mp4",
    width: 1080,
    height: 1080,
    duration: 12.5,
    fileName: "okodukai-square-12s.mp4",
  },
  landscape: {
    id: "landscape",
    labelFr: "Paysage 16:9",
    labelEn: "Landscape 16:9",
    url: "/social/parent-organic-v1/video/okodukai-landscape-15s.mp4",
    silentUrl: "/social/parent-organic-v1/video/okodukai-landscape-15s-silent.mp4",
    width: 1920,
    height: 1080,
    duration: 15,
    fileName: "okodukai-landscape-15s.mp4",
  },
};

export const POSTER_URL = "/social/parent-organic-v1/poster/okodukai-story-poster.webp";
export const OG_IMAGE_PATH = "/social/parent-organic-v1/og/okodukai-og.jpg";

export const VIDEO_TRANSCRIPT = {
  fr: [
    "Vous répétez ça tous les jours ?",
    "Range ta chambre. Prépare ton sac. Mets la table.",
    "Transformez les routines en missions.",
    "Une mission. Une validation. +10.",
    "Après, c'est à elle de choisir : dépenser, Mon coffre, ou placer en simulation.",
    "Dépenser. Économiser. Comprendre.",
    "Okodukai. Son premier compte. Pour de faux. Ses premiers réflexes avec l'argent. Pour de vrai. 100 % gratuit.",
  ].join(" "),
  en: [
    "Do you repeat this every day?",
    "Tidy your room. Pack your bag. Set the table.",
    "Turn routines into missions.",
    "One mission. One approval. +10.",
    "Then it's their choice: spend, vault, or try a simulation.",
    "Spend. Save. Understand.",
    "Okodukai. Their first account. Make-believe. Their first money habits. For real. 100% free.",
  ].join(" "),
};

export const SHARE_CARD_STORAGE_KEY = "okodukai:share-card";
export const SHARE_CARD_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;
