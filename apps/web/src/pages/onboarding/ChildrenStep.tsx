import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { WorldShell } from "../../components/WorldShell";
import { OnboardingPath } from "../../components/OnboardingPath";
import { ChildForm, type ChildFormValues } from "../../components/ChildForm";
import { Avatar } from "../../components/Avatar";

interface ChildRow {
  id: string;
  displayName: string;
  avatarId: string;
}

/** Accueil, étape 3 : un profil par enfant (prénom, âge, avatar, code). */
export function ChildrenStep() {
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
      <h1 className="world-title">Vos enfants</h1>
      <p className="world-lead">Chaque enfant a son profil et son code. Vous pourrez en ajouter d'autres plus tard.</p>

      {count > 0 && (
        <ul className="child-roster" aria-label="Profils créés">
          {children.map((child) => (
            <li key={child.id} className="child-roster-item">
              <Avatar avatarId={child.avatarId} />
              <span>{child.displayName}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="world-subpanel">
        <h2 className="world-subtitle">{count === 0 ? "Premier profil" : "Ajouter un autre enfant"}</h2>
        <ChildForm onSubmit={onSubmit} submitting={creating} submitLabel="Ajouter cet enfant" idPrefix="onboarding-child" />
      </div>

      <div className="world-actions">
        {count > 0 ? (
          <button type="button" className="btn btn-quest btn-block" onClick={() => navigate("/accueil/pret")}>
            Continuer avec {count} {count > 1 ? "enfants" : "enfant"}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate("/accueil/pret")}>
            Passer cette étape
          </button>
        )}
      </div>
    </WorldShell>
  );
}
