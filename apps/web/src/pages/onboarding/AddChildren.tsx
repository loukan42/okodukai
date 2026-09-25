import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { StepIndicator } from "../../components/StepIndicator";
import { ChildForm, type ChildFormValues } from "../../components/ChildForm";

interface AddedChild {
  id: string;
  displayName: string;
}

export function AddChildren() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const householdName = (location.state as { householdName?: string } | null)?.householdName;
  const [children, setChildren] = useState<AddedChild[]>([]);
  const [creating, setCreating] = useState(false);

  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  if (session?.kind !== "parent") return <Navigate to="/inscription" replace />;

  async function onSubmit(values: ChildFormValues) {
    setCreating(true);
    try {
      const res = await api.post<{ child: AddedChild }>("/household/children", values);
      setChildren((prev) => [...prev, res.child]);
    } finally {
      setCreating(false);
    }
  }

  function goToWelcome() {
    navigate("/inscription/bienvenue", { state: { householdName, children } });
  }

  return (
    <div className="centered-auth">
      <div className="onboarding-shell">
        <StepIndicator current={3} total={4} />
        <div className="card">
          <h1 className="font-display" style={{ fontSize: 24, marginBottom: 4 }}>
            Ajoutez vos enfants
          </h1>
          <p className="text-faint text-sm" style={{ marginBottom: 20 }}>
            {householdName ? `Qui rejoint ${householdName} ?` : "Chaque enfant aura son propre profil et son code PIN."}
          </p>

          {children.length > 0 && (
            <div className="row-wrap" style={{ marginBottom: 20 }}>
              {children.map((child) => (
                <span key={child.id} className="pill pill-forest">
                  ✓ {child.displayName}
                </span>
              ))}
            </div>
          )}

          <ChildForm onSubmit={onSubmit} submitting={creating} submitLabel="Ajouter cet enfant" />

          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={goToWelcome}>
            {children.length === 0 ? "Passer, j'ajouterai mes enfants plus tard" : "Continuer"}
          </button>
        </div>
      </div>
    </div>
  );
}
