import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";

export function Landing() {
  const { session } = useAuth();

  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;

  const hasHousehold = Boolean(localStorage.getItem(LAST_HOUSEHOLD_KEY));

  return (
    <div className="centered-auth">
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <img src="/logo-full.png" alt="Okodukai" style={{ width: "100%", maxWidth: 340, marginBottom: 8 }} />
        <h1 className="font-display" style={{ fontSize: 28, marginBottom: 12 }}>
          Le premier portefeuille de votre enfant.
        </h1>
        <p className="text-faint" style={{ marginBottom: 32, fontSize: 16 }}>
          Des quêtes, des objectifs et des récompenses pour apprendre à gagner, économiser et faire ses
          premiers choix avec l'argent.
        </p>
        <div className="stack">
          {hasHousehold && (
            <Link to="/profils" className="btn btn-gold btn-block">
              👋 Choisir mon profil
            </Link>
          )}
          <Link to="/connexion" className="btn btn-primary btn-block">
            Espace parent
          </Link>
          <Link to="/inscription" className="btn btn-ghost btn-block">
            Créer mon foyer
          </Link>
        </div>
      </div>
    </div>
  );
}
