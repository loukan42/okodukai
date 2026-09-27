import { SHARE_CARD_COOLDOWN_MS, SHARE_CARD_STORAGE_KEY } from "./campaign";

interface DismissState {
  dismissedAt: number;
}

export function isShareCardDismissed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(SHARE_CARD_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissState;
    if (typeof parsed.dismissedAt !== "number") return false;
    return now - parsed.dismissedAt < SHARE_CARD_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissShareCard(now = Date.now()): void {
  const state: DismissState = { dismissedAt: now };
  localStorage.setItem(SHARE_CARD_STORAGE_KEY, JSON.stringify(state));
}
