import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import { GameIcon } from "../components/GameIcon";

export function Landing() {
  const { session } = useAuth();

  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;

  const hasHousehold = Boolean(localStorage.getItem(LAST_HOUSEHOLD_KEY));

  return (
    <div className="landing-scene">
      <div className="landing-shell"><div className="landing-copy">
        <img src="/logo-full.png" alt="Okodukai" className="landing-logo" />
        <h1>Apprendre à gérer ses pièces. Vivre sa propre aventure.</h1>
        <p>Des quêtes pour gagner, un coffre pour économiser et des choix à faire en famille.</p>
        <div className="landing-actions">
          {hasHousehold && (
            <Link to="/profils" className="btn btn-gold btn-block">
              Choisir mon profil
            </Link>
          )}
          <Link to="/connexion" className="btn btn-primary btn-block">
            Espace parent
          </Link>
          <Link to="/inscription" className="btn btn-ghost btn-block">
            Créer mon foyer
          </Link>
        </div></div><div className="landing-scene-art" aria-hidden="true"><div className="landing-coin"><GameIcon name="coin" size={110}/></div><div className="landing-feature landing-feature--quest"><GameIcon name="quest" size={27}/><span>Mes quêtes</span></div><div className="landing-feature landing-feature--vault"><GameIcon name="vault" size={27}/><span>Mon coffre</span></div><div className="landing-feature landing-feature--collection"><GameIcon name="collection" size={27}/><span>Ma collection</span></div></div></div>
    </div>
  );
}
