import { CAMPAIGN_ID, type ShareFormatId, type SharePlatformId } from "./campaign";
import { api } from "../lib/api";

export type ShareEventName =
  | "parent_share_card_viewed"
  | "parent_share_card_dismissed"
  | "parent_share_modal_opened"
  | "parent_share_video_played"
  | "parent_share_format_selected"
  | "parent_share_native_started"
  | "parent_share_native_returned"
  | "parent_share_platform_opened"
  | "parent_share_video_downloaded"
  | "parent_share_caption_copied"
  | "parent_share_link_copied"
  | "referral_landing_visited"
  | "referral_signup_started"
  | "referral_signup_completed";

const SESSION_KEYS = {
  landing: "okodukai:share-landing-tracked",
  signupStarted: "okodukai:share-signup-started",
  signupCompleted: "okodukai:share-signup-completed",
} as const;

export async function trackShareEvent(options: {
  name: ShareEventName;
  format?: ShareFormatId | null;
  platform?: SharePlatformId | string | null;
}): Promise<void> {
  try {
    await api.post("/share/events", {
      name: options.name,
      campaignId: CAMPAIGN_ID,
      format: options.format ?? undefined,
      platform: options.platform ?? undefined,
    });
  } catch {
    // Mesure best-effort : ne jamais bloquer l'UI.
  }
}

export function trackReferralLandingOnce(search: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(SESSION_KEYS.landing)) return;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (params.get("utm_campaign") !== "parent_referral") return;
  sessionStorage.setItem(SESSION_KEYS.landing, "1");
  void trackShareEvent({ name: "referral_landing_visited", platform: params.get("utm_source") });
}

export function trackReferralSignupStartedOnce(): void {
  if (typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(SESSION_KEYS.signupStarted)) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("utm_campaign") !== "parent_referral" && !sessionStorage.getItem(SESSION_KEYS.landing)) return;
  sessionStorage.setItem(SESSION_KEYS.signupStarted, "1");
  void trackShareEvent({ name: "referral_signup_started", platform: params.get("utm_source") });
}

export function trackReferralSignupCompletedOnce(): void {
  if (typeof sessionStorage === "undefined") return;
  if (sessionStorage.getItem(SESSION_KEYS.signupCompleted)) return;
  if (!sessionStorage.getItem(SESSION_KEYS.landing) && !sessionStorage.getItem(SESSION_KEYS.signupStarted)) return;
  sessionStorage.setItem(SESSION_KEYS.signupCompleted, "1");
  void trackShareEvent({ name: "referral_signup_completed" });
}
