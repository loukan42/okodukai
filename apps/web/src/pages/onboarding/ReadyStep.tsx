import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth, type ParentSession } from "../../lib/AuthContext";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { ChestArt } from "../../art/ChestArt";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    steps: [
      { title: "Créez une première quête", text: "Ranger sa chambre, lire 15 minutes : vous fixez la récompense en pièces." },
      { title: "Remplissez la boutique", text: "Les récompenses sont les vôtres : une sortie, un choix de film, du temps de jeu." },
      { title: "Laissez entrer votre enfant", text: "Depuis l'accueil, « Choisir mon profil », puis son code à 4 chiffres." },
    ],
    failed: "Votre espace n'a pas pu s'ouvrir. Réessayez dans un instant.",
    title: (name: string) => `Tout est prêt pour ${name}`,
    lead: "Vous pouvez commencer par créer une quête ou ajouter une récompense. Ces réglages restent accessibles depuis votre espace parent.",
    open: "Ouvrir mon espace parent",
  },
  en: {
    steps: [
      { title: "Create a first quest", text: "Tidy the bedroom, read for 15 minutes: you set the reward in coins." },
      { title: "Fill the shop", text: "The rewards are yours to choose: an outing, picking the film, extra play time." },
      { title: "Let your child in", text: "From the home page, \"Choose my profile\", then their 4-digit code." },
    ],
    failed: "Your space couldn't open. Try again in a moment.",
    title: (name: string) => `Everything is ready for ${name}`,
    lead: "You can start by creating a quest or adding a reward. You'll find these settings in your parent area.",
    open: "Open my parent area",
  },
});

/** Accueil terminé : on marque le foyer comme prêt et on montre les premiers pas. */
export function ReadyStep({ session }: { session: ParentSession }) {
  const t = useCopy(COPY);
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
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorldShell emblem={<ChestArt state="low" size={156} />}>
      <OnboardingPath current={3} />
      <h1 className="world-title">{t.title(session.household.name)}</h1>
      <p className="world-lead">{t.lead}</p>
      <ol className="next-steps">
        {t.steps.map((step) => (
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
        {t.open}
      </button>
    </WorldShell>
  );
}
