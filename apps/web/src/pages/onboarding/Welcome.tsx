import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { StepIndicator } from "../../components/StepIndicator";

interface WelcomeState {
  householdName?: string;
  children?: { id: string; displayName: string }[];
}

export function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const state = (location.state as WelcomeState | null) ?? {};

  if (session?.kind === "child") return <Navigate to="/enfant" replace />;
  if (session?.kind !== "parent") return <Navigate to="/inscription" replace />;

  const children = state.children ?? [];
  const names = children.map((c) => c.displayName).join(", ");
  const verb = children.length > 1 ? "peuvent" : "peut";
  const possessive = children.length > 1 ? "leur" : "son";

  return (
    <div className="centered-auth">
      <div className="onboarding-shell">
        <StepIndicator current={4} total={4} />
        <div className="card" style={{ textAlign: "center" }}>
          <span style={{ fontSize: 40 }} aria-hidden="true">
            🎉
          </span>
          <h1 className="font-display" style={{ fontSize: 24, margin: "8px 0 4px" }}>
            {state.householdName ? `${state.householdName} est prêt` : "Votre foyer est prêt"}
          </h1>
          <p className="text-faint" style={{ marginBottom: 20 }}>
            {children.length > 0
              ? `${names} ${verb} maintenant se connecter avec ${possessive} code PIN.`
              : "Vous pourrez ajouter vos enfants à tout moment depuis le tableau de bord."}
          </p>
          <button className="btn btn-primary btn-block" onClick={() => navigate("/parent", { replace: true })}>
            Aller au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
}
