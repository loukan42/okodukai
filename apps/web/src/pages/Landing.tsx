import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext";
import { LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import cardBoosterImage from "../assets/cards/card-booster.png";

const LOOP_STEPS = [
  {
    title: "Gagner",
    emoji: "🎯",
    text: "Il termine des quêtes que vous créez — ranger sa chambre, réviser, aider à la maison — et reçoit des pièces.",
  },
  {
    title: "Choisir",
    emoji: "🧭",
    text: "Chaque pièce gagnée est une petite décision : la dépenser maintenant ou la garder pour plus tard.",
  },
  {
    title: "Dépenser",
    emoji: "🛍️",
    text: "Il utilise ses pièces dans la boutique familiale — les récompenses, c'est vous qui les définissez.",
  },
  {
    title: "Économiser",
    emoji: "🏦",
    text: "Il met de côté dans son coffre, vers un objectif qu'il a choisi lui-même.",
  },
  {
    title: "Attendre",
    emoji: "⏳",
    text: "Le coffre ne se débloque pas tout de suite : la patience fait partie de l'apprentissage.",
  },
  {
    title: "Comprendre l'investissement",
    emoji: "📈",
    text: "Avec un simulateur en unités fictives, sans lien avec ses vraies pièces, il découvre comment un placement évolue.",
  },
];

const TRUST_POINTS = [
  "Le solde est toujours calculé par le serveur, jamais modifiable par l'enfant.",
  "Aucun paiement réel, aucune carte bancaire, aucun lien avec de l'argent réel.",
  "Vous validez chaque quête, chaque achat et chaque retrait du coffre.",
  "Pas de classement entre frères et sœurs, pas de notification culpabilisante.",
];

export function Landing() {
  const { session } = useAuth();

  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;

  const hasHousehold = Boolean(localStorage.getItem(LAST_HOUSEHOLD_KEY));

  return (
    <div className="landing">
      <section className="landing-hero">
        <img src="/logo-full.png" alt="Okodukai" className="landing-logo" />
        <h1 className="font-display landing-headline">
          Il gagne ses pièces avec des quêtes. Vous gardez le contrôle.
        </h1>
        <p className="landing-subhead">
          Okodukai remplace l'argent de poche classique par des quêtes, des objectifs et un petit
          simulateur d'investissement — pour apprendre à gagner, choisir et économiser avant d'avoir
          de vrais comptes en banque.
        </p>
        <div className="hero-cta">
          {hasHousehold ? (
            <>
              <Link to="/profils" className="btn btn-gold btn-block">
                👋 Choisir mon profil
              </Link>
              <Link to="/connexion" className="btn btn-ghost btn-block">
                Espace parent
              </Link>
            </>
          ) : (
            <>
              <Link to="/inscription" className="btn btn-primary btn-block">
                Créer le compte familial
              </Link>
              <Link to="/connexion" className="btn btn-ghost btn-block">
                Se connecter
              </Link>
            </>
          )}
        </div>

        <motion.div
          className="hero-peek"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
        >
          <motion.div
            className="hero-peek-card hero-peek-card--1"
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="gilded-frame">
              <div className="gilded-inner">
                <div className="gilded-aspect" style={{ background: "linear-gradient(160deg, var(--sky-soft), var(--sky))" }}>
                  <span className="hero-peek-emoji" aria-hidden="true">
                    🗡️
                  </span>
                </div>
              </div>
            </div>
            <p className="hero-peek-caption">Quêtes</p>
          </motion.div>

          <motion.div
            className="hero-peek-card hero-peek-card--2"
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <img src={cardBoosterImage} alt="" className="hero-peek-booster" />
            <p className="hero-peek-caption">Collection</p>
          </motion.div>

          <motion.div
            className="hero-peek-card hero-peek-card--3"
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="gilded-frame">
              <div className="gilded-inner">
                <div className="gilded-aspect" style={{ background: "linear-gradient(160deg, var(--gold-soft), var(--gold))" }}>
                  <span className="hero-peek-emoji" aria-hidden="true">
                    🏦
                  </span>
                </div>
              </div>
            </div>
            <p className="hero-peek-caption">Coffre</p>
          </motion.div>
        </motion.div>
      </section>

      <section className="landing-section">
        <h2 className="font-display landing-section-title">Comment ça marche</h2>
        <div className="quest-path">
          {LOOP_STEPS.map((step, i) => (
            <div className="quest-path-step" data-step={i + 1} key={step.title}>
              <h3 className="landing-loop-title">
                <span aria-hidden="true">{step.emoji}</span> {step.title}
              </h3>
              <p className="text-faint">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2 className="font-display landing-section-title">Ce que vous gardez en main</h2>
        <ul className="trust-list">
          {TRUST_POINTS.map((point) => (
            <li key={point}>
              <span aria-hidden="true">✓</span> {point}
            </li>
          ))}
        </ul>
        <Link to={hasHousehold ? "/profils" : "/inscription"} className="btn btn-primary">
          {hasHousehold ? "Choisir mon profil" : "Créer le compte familial"}
        </Link>
      </section>
    </div>
  );
}
