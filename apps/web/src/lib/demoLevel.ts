import { api } from "./api";
import type { LevelView } from "./levels";

export const DEMO_LEVEL_CHANGE = "okodukai:demo-level-change";
const key = (childId: string) => `okodukai:demo-level:${childId}`;
const memory = new Map<string, number | null>();

/** The override belongs to this tab and child, and only exists in development builds. */
export function getDemoLevel(childId: string): number | null {
  if (!import.meta.env.DEV) return null;
  try {
    const stored = window.sessionStorage.getItem(key(childId));
    if (stored === null) return memory.get(childId) ?? null;
    const level = Number(stored);
    return Number.isInteger(level) && level >= 1 && level <= 30 ? level : null;
  } catch {
    return memory.get(childId) ?? null;
  }
}

export function setDemoLevel(childId: string, level: number | null) {
  if (!import.meta.env.DEV) return;
  memory.set(childId, level);
  try {
    if (level === null) window.sessionStorage.removeItem(key(childId));
    else window.sessionStorage.setItem(key(childId), String(level));
  } catch { /* The in-memory value still updates the current tab. */ }
  window.dispatchEvent(new Event(DEMO_LEVEL_CHANGE));
}

/** Preview values come from the server's actual level curve without changing the child record. */
export async function childLevelForDisplay(childId: string): Promise<{ level: LevelView; previewing: boolean }> {
  const previewLevel = getDemoLevel(childId);
  if (previewLevel === null) {
    const result = await api.get<{ level: LevelView }>("/child/me");
    return { level: result.level, previewing: false };
  }
  const result = await api.get<{ level: LevelView }>(`/dev/level-preview?level=${previewLevel}`);
  return { level: result.level, previewing: true };
}
