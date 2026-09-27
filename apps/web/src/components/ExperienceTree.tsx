import { useEffect, useState, type CSSProperties } from "react";
import { defineCopy, useCopy } from "../i18n";
import type { LevelView } from "../lib/levels";
import "../styles/experience-tree.css";

const stages = [
  { level: 1, asset: "sprout" },
  { level: 5, asset: "sapling" },
  { level: 10, asset: "young" },
  { level: 20, asset: "flowering" },
  { level: 30, asset: "mature" },
] as const;

const copy = defineCopy({
  fr: {
    name: "Mon arbre d'aventure",
    lead: "Il grandit avec ton XP.",
    names: ["Une pousse", "Un jeune arbre", "Ses premières branches", "Un arbre en fleurs", "Un grand arbre"],
    next: (level: number) => `Prochaine forme au niveau ${level}`,
    complete: "Ton arbre a atteint sa plus grande forme.",
  },
  en: {
    name: "My adventure tree",
    lead: "It grows with your XP.",
    names: ["A sprout", "A sapling", "Its first branches", "A flowering tree", "A full-grown tree"],
    next: (level: number) => `Next form at level ${level}`,
    complete: "Your tree has reached its fullest form.",
  },
});

/** The server owns XP. These thresholds only choose which illustration to show. */
export function experienceTreeStage(level: number) {
  for (let index = stages.length - 1; index > 0; index--) {
    if (level >= stages[index].level) return index;
  }
  return 0;
}

export function ExperienceTree({ level, childId, compact = false }: { level: LevelView; childId?: string; compact?: boolean }) {
  const t = useCopy(copy);
  const index = experienceTreeStage(level.level);
  const stage = stages[index];
  const next = stages[index + 1];
  const fraction = level.xpForNextLevel > 0 ? level.xpIntoLevel / level.xpForNextLevel : 0;
  const stageProgress = next ? Math.min(1, Math.max(0, (level.level - stage.level + fraction) / (next.level - stage.level))) : 1;
  const style = { "--tree-growth": (0.88 + stageProgress * 0.12).toFixed(3) } as CSSProperties;
  const [recentGrowth, setRecentGrowth] = useState(false);

  useEffect(() => {
    if (!childId || typeof level.totalXp !== "number") return;
    const key = `okodukai:experience-tree:${childId}`;
    try {
      const last = window.localStorage.getItem(key);
      if (last !== null && level.totalXp > Number(last)) setRecentGrowth(true);
      window.localStorage.setItem(key, String(level.totalXp));
    } catch { /* Browsers can disable storage; the tree still reflects the server level. */ }
    const timer = window.setTimeout(() => setRecentGrowth(false), 1000);
    return () => window.clearTimeout(timer);
  }, [childId, level.totalXp]);

  return <div className={`experience-tree${compact ? " experience-tree--compact" : ""}${recentGrowth ? " experience-tree--grown" : ""}`} style={style} aria-hidden={compact || undefined}>
    <div className="experience-tree-art">
      <img
        src={`/assets/experience/xp-tree-${stage.asset}-256.webp`}
        srcSet={`/assets/experience/xp-tree-${stage.asset}-256.webp 256w, /assets/experience/xp-tree-${stage.asset}-512.webp 512w`}
        sizes={compact ? "64px" : "(max-width: 600px) 160px, 250px"}
        alt=""
        loading={compact ? "eager" : "lazy"}
        width="256"
        height="256"
      />
    </div>
    {!compact && <div className="experience-tree-story">
      <p className="experience-tree-kicker">{t.name}</p>
      <strong>{t.names[index]}</strong>
      <span>{t.lead}</span>
      <small>{next ? t.next(next.level) : t.complete}</small>
    </div>}
  </div>;
}
