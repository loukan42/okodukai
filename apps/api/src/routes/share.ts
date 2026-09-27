import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validateBody } from "../lib/validation.js";
import { takeAttempt, type ThrottleRule } from "../lib/throttle.js";

export const shareRouter = Router();

const EVENT_NAMES = [
  "parent_share_card_viewed",
  "parent_share_card_dismissed",
  "parent_share_modal_opened",
  "parent_share_video_played",
  "parent_share_format_selected",
  "parent_share_native_started",
  "parent_share_native_returned",
  "parent_share_platform_opened",
  "parent_share_video_downloaded",
  "parent_share_caption_copied",
  "parent_share_link_copied",
  "referral_landing_visited",
  "referral_signup_started",
  "referral_signup_completed",
] as const;

const SHARE_EVENT_THROTTLE: ThrottleRule = {
  maxAttempts: 60,
  windowMs: 60_000,
  lockMs: 60_000,
  maxLockMs: 5 * 60_000,
};

const eventSchema = z.object({
  name: z.enum(EVENT_NAMES),
  campaignId: z.string().min(1).max(64),
  format: z.string().min(1).max(32).optional(),
  platform: z.string().min(1).max(32).optional(),
});

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.ip;
  const ip = raw && raw.length > 0 ? raw : "unknown";
  return `share-event:${ip}`;
}

shareRouter.post("/events", validateBody(eventSchema), async (req, res) => {
  const attempt = await takeAttempt(clientKey(req), SHARE_EVENT_THROTTLE);
  if (!attempt.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(attempt.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Trop de requêtes. Réessayez dans un instant." });
  }

  const body = req.body as z.infer<typeof eventSchema>;
  await prisma.shareEvent.create({
    data: {
      name: body.name,
      campaignId: body.campaignId,
      format: body.format,
      platform: body.platform,
    },
  });
  res.status(204).end();
});
