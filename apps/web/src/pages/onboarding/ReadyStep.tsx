import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth, type ParentSession } from "../../lib/AuthContext";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { ChestArt } from "../../art/ChestArt";

const NEXT_STEPS = [
  { title: "Créez une première quête", text: "Ranger sa chambre, lire vingt minutes : vous fixez la récompense en pièces." },
  { title: "Remplissez la boutique", text: "Les récompenses sont les vôtres : une sortie, un choix de film, du temps de jeu." },
  { title: "Laissez entrer votre enfant", text: "Depuis l'accueil, « Choisir mon profil », puis son code à 4 chiffres." },
];

/** Accueil terminé : on marque le foyer comme prêt et on montre les premiers pas. */
export function ReadyStep({ session }: { session: ParentSession }) {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Idempotent côté serveur : on peut l'appeler à l'arrivée puis au clic si besoin.
  const complete = useCallback(async () => {
    await api.post("/household/onboarding/complete");
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session.household.onboardingCompleted) complete().catch(() => undefined);
  }, [session.household.onboardingCompleted, complete]);

  async function openParentSpace() {
    setError(null);
    setBusy(true);
    try {
      if (!session.household.onboardingCompleted) await complete();
      navigate("/parent", { replace: true });
    } catch {
      setError("Votre espace n'a pas pu s'ouvrir. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorldShell emblem={<ChestArt state="low" size={156} />}>
      <OnboardingPath current={3} />
      <h1 className="world-title">Tout est prêt pour {session.household.name}</h1>
      <p className="world-lead">Voici par où commencer. Chaque étape se fait depuis votre espace, à votre rythme.</p>
      <ol className="next-steps">
        {NEXT_STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button type="button" className="btn btn-quest btn-block" onClick={openParentSpace} disabled={busy}>
        Ouvrir mon espace parent
      </button>
    </WorldShell>
  );
}
