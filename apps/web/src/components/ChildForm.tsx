import { useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";
import { Avatar, AVAILABLE_AVATARS, AVATAR_LABELS, AVATAR_LABELS_EN } from "./Avatar";
import { defineCopy, useCopy, useLocale } from "../i18n";

export interface ChildFormValues {
  displayName: string;
  ageBand: "AGE_8_9" | "AGE_10_12";
  avatarId: string;
  pin: string;
}

interface ChildFormProps {
  onSubmit: (values: ChildFormValues) => Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  /** Préfixe des identifiants de champs, si le formulaire apparaît deux fois dans une page. */
  idPrefix?: string;
}

const AGE_BANDS = ["AGE_8_9", "AGE_10_12"] as const;

const COPY = defineCopy({
  fr: {
    ages: { AGE_8_9: "Moins de 9 ans", AGE_10_12: "9 ans ou plus" },
    create: "Créer le profil",
    creating: "Création…",
    noName: "Indiquez le prénom de l'enfant.",
    badPin: "Le code doit comporter 4 chiffres.",
    failed: "Le profil n'a pas pu être créé. Réessayez dans un instant.",
    name: "Prénom",
    age: "Âge",
    ageHint: "Ce choix adapte les explications à l'enfant. Vous pourrez changer son niveau pédagogique ensuite.",
    avatar: "Choisir un avatar",
    avatarHint: "Ce portrait apparaîtra sur le profil de votre enfant.",
    pin: "Code à 4 chiffres",
    pinHint: "L'enfant le tape pour entrer dans son espace.",
  },
  en: {
    ages: { AGE_8_9: "Under 9", AGE_10_12: "9 or over" },
    create: "Create the profile",
    creating: "Creating…",
    noName: "Enter your child's first name.",
    badPin: "The code needs 4 digits.",
    failed: "The profile couldn't be created. Try again in a moment.",
    name: "First name",
    age: "Age",
    ageHint: "This adapts the explanations to your child. You can change their learning level later.",
    avatar: "Choose an avatar",
    avatarHint: "This portrait will appear on your child's profile.",
    pin: "4-digit code",
    pinHint: "Your child types it to open their space.",
  },
});

/** Formulaire d'ajout d'un profil enfant, partagé entre l'accueil et la gestion des enfants. */
export function ChildForm({ onSubmit, submitting = false, submitLabel, idPrefix = "child" }: ChildFormProps) {
  const t = useCopy(COPY);
  const { locale } = useLocale();
  const avatarLabels = locale === "fr" ? AVATAR_LABELS : AVATAR_LABELS_EN;
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState<ChildFormValues["ageBand"]>("AGE_8_9");
  const [avatarId, setAvatarId] = useState(AVAILABLE_AVATARS[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError(t.noName);
    if (pin.length !== 4) return setError(t.badPin);
    try {
      await onSubmit({ displayName: displayName.trim(), ageBand, avatarId, pin });
      setDisplayName("");
      setAgeBand("AGE_8_9");
      setAvatarId(AVAILABLE_AVATARS[0]);
      setPin("");
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 ? err.message : t.failed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="child-form">
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>{t.name}</label>
        <input id={`${idPrefix}-name`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} autoComplete="off" required />
      </div>

      <fieldset className="field choice-field">
        <legend>{t.age}</legend>
        <div className="segmented">
          {AGE_BANDS.map((band) => (
            <label key={band} className={`segmented-option${ageBand === band ? " segmented-option--on" : ""}`}>
              <input type="radio" name={`${idPrefix}-age`} value={band} checked={ageBand === band} onChange={() => setAgeBand(band)} />
              {t.ages[band]}
            </label>
          ))}
        </div>
        <p className="field-hint">{t.ageHint}</p>
      </fieldset>

      <fieldset className="field choice-field">
        <legend>{t.avatar}</legend>
        <p className="field-hint">{t.avatarHint}</p>
        <div className="avatar-grid">
          {AVAILABLE_AVATARS.map((id, i) => (
            <label key={id} className={`avatar-pick${id === avatarId ? " avatar-pick--selected" : ""}`}>
              <input type="radio" name={`${idPrefix}-avatar`} value={id} checked={id === avatarId} onChange={() => setAvatarId(id)} aria-label={avatarLabels[i]} />
              <Avatar avatarId={id} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`${idPrefix}-pin`}>{t.pin}</label>
        <input
          id={`${idPrefix}-pin`}
          className="pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={`${idPrefix}-pin-hint`}
          required
        />
        <p id={`${idPrefix}-pin-hint`} className="field-hint">
          {t.pinHint}
        </p>
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? t.creating : submitLabel ?? t.create}
      </button>
    </form>
  );
}
