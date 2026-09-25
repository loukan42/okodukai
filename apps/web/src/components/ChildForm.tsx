import { useState, type FormEvent } from "react";
import { Avatar, AVAILABLE_AVATARS } from "./Avatar";

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
}

/** Formulaire d'ajout d'un profil enfant, partagé entre l'onboarding et la gestion des enfants. */
export function ChildForm({ onSubmit, submitting = false, submitLabel = "Créer le profil" }: ChildFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState<"AGE_8_9" | "AGE_10_12">("AGE_8_9");
  const [avatarId, setAvatarId] = useState(AVAILABLE_AVATARS[0]);
  const [pin, setPin] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName || pin.length !== 4) return;
    await onSubmit({ displayName, ageBand, avatarId, pin });
    setDisplayName("");
    setAgeBand("AGE_8_9");
    setAvatarId(AVAILABLE_AVATARS[0]);
    setPin("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="child-name">Prénom</label>
        <input id="child-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="child-age">Tranche d'âge</label>
        <select
          id="child-age"
          value={ageBand}
          onChange={(e) => setAgeBand(e.target.value as "AGE_8_9" | "AGE_10_12")}
        >
          <option value="AGE_8_9">8-9 ans</option>
          <option value="AGE_10_12">10-12 ans</option>
        </select>
      </div>
      <div className="field">
        <label id="child-avatar-label">Avatar</label>
        <div className="row-wrap" role="group" aria-labelledby="child-avatar-label">
          {AVAILABLE_AVATARS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setAvatarId(id)}
              className={`avatar-pick${id === avatarId ? " avatar-pick--selected" : ""}`}
              aria-pressed={id === avatarId}
              aria-label={id.replace(/\.png$/i, "")}
            >
              <Avatar avatarId={id} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="child-pin">Code PIN (4 chiffres)</label>
        <input
          id="child-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="1234"
          required
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Création…" : submitLabel}
      </button>
    </form>
  );
}
