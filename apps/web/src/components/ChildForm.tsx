import { useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";
import { Avatar, AVAILABLE_AVATARS, AVATAR_LABELS } from "./Avatar";

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

const AGE_BANDS = [
  { value: "AGE_8_9", label: "Moins de 9 ans" },
  { value: "AGE_10_12", label: "9 ans ou plus" },
] as const;

/** Formulaire d'ajout d'un profil enfant, partagé entre l'accueil et la gestion des enfants. */
export function ChildForm({ onSubmit, submitting = false, submitLabel = "Créer le profil", idPrefix = "child" }: ChildFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState<ChildFormValues["ageBand"]>("AGE_8_9");
  const [avatarId, setAvatarId] = useState(AVAILABLE_AVATARS[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) return setError("Indiquez le prénom de l'enfant.");
    if (pin.length !== 4) return setError("Le code doit comporter 4 chiffres.");
    try {
      await onSubmit({ displayName: displayName.trim(), ageBand, avatarId, pin });
      setDisplayName("");
      setAgeBand("AGE_8_9");
      setAvatarId(AVAILABLE_AVATARS[0]);
      setPin("");
    } catch (err) {
      setError(err instanceof ApiError && err.status !== 0 ? err.message : "Le profil n'a pas pu être créé. Réessayez dans un instant.");
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
        <label htmlFor={`${idPrefix}-name`}>Prénom</label>
        <input id={`${idPrefix}-name`} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} autoComplete="off" required />
      </div>

      <fieldset className="field choice-field">
        <legend>Âge</legend>
        <div className="segmented">
          {AGE_BANDS.map((band) => (
            <label key={band.value} className={`segmented-option${ageBand === band.value ? " segmented-option--on" : ""}`}>
              <input type="radio" name={`${idPrefix}-age`} value={band.value} checked={ageBand === band.value} onChange={() => setAgeBand(band.value)} />
              {band.label}
            </label>
          ))}
        </div>
        <p className="field-hint">Ce choix adapte les explications à l'enfant. Vous pourrez changer son niveau pédagogique ensuite.</p>
      </fieldset>

      <fieldset className="field choice-field">
        <legend>Choisir un avatar</legend>
        <p className="field-hint">Ce portrait apparaîtra sur le profil de votre enfant.</p>
        <div className="avatar-grid">
          {AVAILABLE_AVATARS.map((id, i) => (
            <label key={id} className={`avatar-pick${id === avatarId ? " avatar-pick--selected" : ""}`}>
              <input type="radio" name={`${idPrefix}-avatar`} value={id} checked={id === avatarId} onChange={() => setAvatarId(id)} aria-label={AVATAR_LABELS[i]} />
              <Avatar avatarId={id} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`${idPrefix}-pin`}>Code à 4 chiffres</label>
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
          L'enfant le tape pour entrer dans son espace.
        </p>
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Création…" : submitLabel}
      </button>
    </form>
  );
}
