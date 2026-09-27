import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { ChildForm, type ChildFormValues } from "../../components/ChildForm";
import { Avatar } from "../../components/Avatar";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    title: "Vos enfants",
    lead: "Chaque enfant a son profil et son code. Vous pourrez en ajouter d'autres plus tard.",
    created: "Profils créés",
    first: "Premier profil",
    another: "Ajouter un autre enfant",
    add: "Ajouter cet enfant",
    next: (n: number) => `Continuer avec ${n} ${n > 1 ? "enfants" : "enfant"}`,
    skip: "Passer cette étape",
  },
  en: {
    title: "Your children",
    lead: "Each child gets their own profile and code. You can add more later.",
    created: "Profiles created",
    first: "First profile",
    another: "Add another child",
    add: "Add this child",
    next: (n: number) => `Continue with ${n} ${n === 1 ? "child" : "children"}`,
    skip: "Skip this step",
  },
});

interface ChildRow {
  id: string;
  displayName: string;
  avatarId: string;
}

/** Accueil, étape 3 : un profil par enfant (prénom, âge, avatar, code). */
export function ChildrenStep() {
  const t = useCopy(COPY);
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get<{ children: ChildRow[] }>("/household/children")
      .then((res) => setChildren(res.children))
      .catch(() => setChildren([]));
  }, []);

  async function onSubmit(values: ChildFormValues) {
    setCreating(true);
    try {
      const res = await api.post<{ child: ChildRow }>("/household/children", values);
      setChildren((prev) => [...prev, res.child]);
    } finally {
      setCreating(false);
    }
  }

  const count = children.length;

  return (
    <WorldShell wide>
      <OnboardingPath current={2} />
      <h1 className="world-title">{t.title}</h1>
      <p className="world-lead">{t.lead}</p>

      {count > 0 && (
        <ul className="child-roster" aria-label={t.created}>
          {children.map((child) => (
            <li key={child.id} className="child-roster-item">
              <Avatar avatarId={child.avatarId} />
              <span>{child.displayName}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="world-subpanel">
        <h2 className="world-subtitle">{count === 0 ? t.first : t.another}</h2>
        <ChildForm onSubmit={onSubmit} submitting={creating} submitLabel={t.add} idPrefix="onboarding-child" />
      </div>

      <div className="world-actions">
        {count > 0 ? (
          <button type="button" className="btn btn-quest btn-block" onClick={() => navigate("/accueil/pret")}>
            {t.next(count)}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate("/accueil/pret")}>
            {t.skip}
          </button>
        )}
      </div>
    </WorldShell>
  );
}
