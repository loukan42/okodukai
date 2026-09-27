import { useCopy } from "../i18n";
import { LEVEL_TITLE, TITLE_STEPS, XP_COPY, levelTitle, type LevelView } from "../lib/levels";
import { ProgressBar } from "./ProgressBar";
import { GameIcon } from "./GameIcon";
import { BoosterPack } from "./booster/BoosterPack";
import { ExperienceTree } from "./ExperienceTree";

/**
 * Le niveau de l'enfant et ce qu'il débloque : titre, barre d'XP, récompense du prochain niveau,
 * d'où vient l'XP et la règle « l'XP ne se change jamais en pièces ».
 */
export function XpGuide({ level }: { level: LevelView }) {
  const t = useCopy(XP_COPY);
  const maxed = level.xpForNextLevel === 0;
  const left = Math.max(0, level.xpForNextLevel - level.xpIntoLevel);
  const nextTitle = level.nextReward?.title ? LEVEL_TITLE[level.nextReward.title] : null;

  return (
    <section className="xp-guide" aria-labelledby="xp-guide-title">
      <div className="xp-guide-head">
        <span className="xp-guide-badge" aria-hidden="true">
          <GameIcon name="xp" size={22} />
        </span>
        <div>
          <p className="xp-guide-kicker">{t.current}</p>
          <h2 id="xp-guide-title">{levelTitle(level) || t.level(level.level)}</h2>
          <p className="xp-guide-level">{t.level(level.level)}</p>
        </div>
      </div>

      <ExperienceTree level={level} />

      {maxed ? (
        <p className="xp-guide-left">{t.maxed}</p>
      ) : (
        <>
          <ProgressBar value={level.xpIntoLevel} max={level.xpForNextLevel} />
          <p className="xp-guide-left">
            <strong>{level.xpIntoLevel} / {level.xpForNextLevel} XP</strong> · {t.xpLeft(left, level.level + 1)}
          </p>
          <div className="xp-guide-reward">
            <BoosterPack className="xp-guide-pack" />
            <p>
              <small>{t.nextReward}</small>
              <strong>{t.boosterReward}</strong>
              {nextTitle && <span>+ {t.titleReward(nextTitle)}</span>}
            </p>
          </div>
        </>
      )}

      <details className="xp-guide-more">
        <summary>{t.whatTitle}</summary>
        <p>{t.whatBody}</p>
        <p className="xp-guide-rule">{t.notCoins}</p>
        <h3>{t.fromTitle}</h3>
        <ul className="xp-guide-sources">
          {t.from.map((line) => (
            <li key={line}>
              <GameIcon name="xp" size={14} /> {line}
            </li>
          ))}
        </ul>
        <h3>{t.titlesTitle}</h3>
        <ol className="xp-guide-titles">
          {TITLE_STEPS.map((step) => (
            <li key={step.code} className={step.level <= level.level ? "is-earned" : undefined}>
              <span>{t.titleAt(step.level)}</span>
              <strong>{LEVEL_TITLE[step.code]}</strong>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
