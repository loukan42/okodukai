const STEPS = ["Compte", "Famille", "Enfants"] as const;

/**
 * Le chemin d'accueil en trois étapes, visible dès la création du compte pour que le
 * parent sache ce qui l'attend. `current` = index de l'étape en cours (3 = tout est fait).
 */
export function OnboardingPath({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="onboarding-path" aria-label="Étapes de l'inscription">
      {STEPS.map((label, i) => {
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
              {state === "done" && <span className="sr-only"> (terminé)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
