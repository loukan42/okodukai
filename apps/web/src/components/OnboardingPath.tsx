import { defineCopy, useCopy } from "../i18n";

const COPY = defineCopy({
  fr: { steps: ["Compte", "Famille", "Enfants"], label: "Étapes de l'inscription", done: " (terminé)" },
  en: { steps: ["Account", "Family", "Children"], label: "Sign-up steps", done: " (done)" },
});

/**
 * Le chemin d'accueil en trois étapes, visible dès la création du compte pour que le
 * parent sache ce qui l'attend. `current` = index de l'étape en cours (3 = tout est fait).
 */
export function OnboardingPath({ current }: { current: 0 | 1 | 2 | 3 }) {
  const t = useCopy(COPY);
  return (
    <ol className="onboarding-path" aria-label={t.label}>
      {t.steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`onboarding-path-step onboarding-path-step--${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="onboarding-path-node" aria-hidden="true">
              {state === "done" ? (
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className="onboarding-path-label">
              {label}
              {state === "done" && <span className="sr-only">{t.done}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
