import { CANONICAL_ORIGIN, CAMPAIGN_ID } from "./campaign";

const ALLOWED_SOURCES = new Set([
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "linkedin",
  "whatsapp",
  "messenger",
  "telegram",
  "sms",
  "email",
  "native",
  "copy_link",
  "download",
  "parent_share",
]);

export interface CampaignLinkOptions {
  source: string;
  content?: string;
  origin?: string;
}

/** Construit une URL de campagne sans donnée personnelle. */
export function buildCampaignUrl(options: CampaignLinkOptions): string {
  const origin = (options.origin ?? CANONICAL_ORIGIN).replace(/\/$/, "");
  const source = ALLOWED_SOURCES.has(options.source) ? options.source : "parent_share";
  const url = new URL(`${origin}/`);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "organic_share");
  url.searchParams.set("utm_campaign", "parent_referral");
  url.searchParams.set("utm_content", options.content ?? "video_v1");
  return url.toString();
}

const FORBIDDEN_PARAM_KEYS = [
  "child",
  "childId",
  "child_id",
  "email",
  "household",
  "householdId",
  "household_id",
  "userId",
  "user_id",
  "name",
  "balance",
  "prenom",
  "firstname",
];

export function urlContainsPersonalData(url: string): boolean {
  try {
    const parsed = new URL(url);
    for (const key of FORBIDDEN_PARAM_KEYS) {
      if (parsed.searchParams.has(key)) return true;
    }
    const hay = `${parsed.pathname}?${parsed.search}`.toLowerCase();
    return FORBIDDEN_PARAM_KEYS.some((k) => hay.includes(`${k.toLowerCase()}=`));
  } catch {
    return true;
  }
}

export function isReferralUtm(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get("utm_campaign") === "parent_referral" && params.get("utm_medium") === "organic_share";
}

export { CAMPAIGN_ID };
