interface StepIndicatorProps {
  current: number;
  total: number;
  label?: string;
}

/** Repères d'étape pour un parcours en plusieurs écrans (onboarding). */
export function StepIndicator({ current, total, label }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      <span className="step-indicator-track" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`step-indicator-seg${i < current ? " step-indicator-seg--done" : ""}`} />
        ))}
      </span>
      <span className="step-indicator-text">
        {label ?? `Étape ${current} sur ${total}`}
      </span>
    </div>
  );
}
