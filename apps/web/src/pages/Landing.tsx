import type { PointerEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useAuth, LAST_HOUSEHOLD_KEY } from "../lib/AuthContext";
import { Logo } from "../art/Logo";
import { ValleyBackdrop } from "../art/ValleyBackdrop";
import { HeroChest } from "../art/HeroChest";
import { DustMotes } from "../art/DustMotes";
import { ChestArt } from "../art/ChestArt";
import { CoinArt } from "../art/CoinArt";
import { GameIcon, type GameIconName } from "../components/GameIcon";

const HERO = {
  title: "Son premier compte, en version jeu",
  lead: "Votre enfant gagne des pièces en accomplissant les quêtes que vous créez. Il les dépense à la boutique familiale ou les met de côté dans son coffre. Les pièces sont virtuelles, et c'est vous qui fixez les règles.",
};

type LoopArt = { kind: "object"; src: string } | { kind: "coin" } | { kind: "chest" };

const LOOP: { title: string; text: string; art: LoopArt }[] = [
  { title: "Gagner", text: "Il accomplit une quête que vous avez créée : ranger, lire, aider. Vous validez, les pièces arrivent sur son compte.", art: { kind: "object", src: "quest-scroll" } },
  { title: "Choisir", text: "Dépenser maintenant ou garder pour plus tard ? Chaque pièce pose la question.", art: { kind: "coin" } },
  { title: "Dépenser", text: "La boutique familiale propose vos récompenses : une sortie, un film, du temps de jeu.", art: { kind: "object", src: "coin-pouch" } },
  { title: "Économiser", text: "Il met des pièces de côté dans son coffre, pour un objectif qu'il a choisi.", art: { kind: "chest" } },
  { title: "Attendre", text: "Le coffre se remplit semaine après semaine. Patienter fait partie du jeu.", art: { kind: "object", src: "hourglass" } },
  { title: "Comprendre l'investissement", text: "Avec un capital d'école fictif, il voit comment un placement évolue. Sans lien avec ses vraies pièces.", art: { kind: "object", src: "coin-sprout" } },
];

const GUARANTEES: { icon: GameIconName; title: string; text: string }[] = [
  { icon: "lock", title: "Un solde que personne ne retouche", text: "Chaque mouvement est enregistré et daté. Le solde se calcule à partir de l'historique, jamais à la main." },
  { icon: "check", title: "Vous validez", text: "Les quêtes terminées, les achats et les sorties du coffre passent par vous." },
  { icon: "coin", title: "Des pièces virtuelles", text: "Aucun paiement, aucune carte bancaire, aucune conversion en euros." },
  { icon: "flag", title: "Sans pression", text: "Pas de classement entre frères et sœurs, pas de notification culpabilisante." },
];

const STATEMENT = [
  { day: "Aujourd'hui", rows: [{ label: "Quête", detail: "Ranger sa chambre", amount: 20 }, { label: "Transfert", detail: "Vers Mon coffre", amount: -40 }] },
  { day: "Hier", rows: [{ label: "Récompense", detail: "Soirée film", amount: -15 }, { label: "Bonus", detail: "Aide pour les courses", amount: 10 }] },
];

function LoopArtwork({ art }: { art: LoopArt }) {
  if (art.kind === "coin") return <CoinArt size={132} className="lp-step-art-img lp-step-art-img--coin" />;
  if (art.kind === "chest") return <ChestArt state="full" size={170} className="lp-step-art-img" />;
  return (
    <img
      className="lp-step-art-img"
      src={`/assets/objects/${art.src}-256.webp`}
      srcSet={`/assets/objects/${art.src}-128.webp 128w, /assets/objects/${art.src}-256.webp 256w, /assets/objects/${art.src}-512.webp 512w`}
      sizes="160px"
      width={160}
      height={160}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}

function formatAmount(n: number) {
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
}

export function Landing() {
  const { session } = useAuth();
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 });
  const sy = useSpring(my, { stiffness: 50, damping: 18 });
  const bgX = useTransform(sx, (v) => v * -14);
  const bgY = useTransform(sy, (v) => v * -8);
  const chestX = useTransform(sx, (v) => v * 22);
  const chestY = useTransform(sy, (v) => v * 14);

  if (session?.kind === "parent") return <Navigate to="/parent" replace />;
  if (session?.kind === "child") return <Navigate to="/enfant" replace />;

  const hasHousehold = Boolean(localStorage.getItem(LAST_HOUSEHOLD_KEY));

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.55, ease: [0.23, 1, 0.32, 1] as const } };

  const primaryCta = hasHousehold ? { to: "/profils", label: "Choisir mon profil" } : { to: "/inscription", label: "Créer un compte" };
  const secondaryCta = hasHousehold ? { to: "/connexion", label: "Espace parent" } : { to: "/connexion", label: "Se connecter" };

  return (
    <div className="lp">
      <section className="lp-hero" onPointerMove={onPointerMove}>
        <motion.div
          className="lp-hero-backdrop"
          style={{ x: bgX, y: bgY }}
          initial={reduce ? false : { scale: 1.08, opacity: 0 }}
          animate={{ scale: 1.03, opacity: 1 }}
          transition={{ scale: { duration: 2.4, ease: [0.23, 1, 0.32, 1] }, opacity: { duration: 0.6 } }}
        >
          <ValleyBackdrop mood="golden" className="lp-backdrop-img" />
        </motion.div>
        <div className="lp-hero-veil" aria-hidden="true" />
        <DustMotes />

        <header className="lp-nav">
          <Link to="/" className="lp-nav-brand" aria-label="Okodukai">
            <Logo sizes="(max-width: 600px) 124px, 156px" alt="" />
          </Link>
          <Link to={secondaryCta.to} className="lp-nav-link">
            {secondaryCta.label}
          </Link>
        </header>

        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <motion.h1 className="landing-title" {...rise(0.25)}>
              {HERO.title}
            </motion.h1>
            <motion.p className="lp-hero-lead" {...rise(0.38)}>
              {HERO.lead}
            </motion.p>
            <motion.div className="lp-hero-actions" {...rise(0.5)}>
              <Link to={primaryCta.to} className="btn btn-quest">
                {primaryCta.label}
              </Link>
              <Link to={secondaryCta.to} className="btn lp-btn-light">
                {secondaryCta.label}
              </Link>
            </motion.div>
          </div>
          <div className="lp-hero-stage">
            <HeroChest offsetX={chestX} offsetY={chestY} />
          </div>
        </div>
      </section>

      <section className="lp-loop" aria-labelledby="lp-loop-title">
        <div className="lp-container">
          <h2 id="lp-loop-title" className="landing-h2">
            De la quête au coffre
          </h2>
          <p className="lp-section-lead">Chaque pièce gagnée suit le même chemin. Votre enfant le parcourt à son rythme ; vous validez les étapes importantes.</p>

          <div className="lp-board">
            <svg className="lp-board-path" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
              <path className="lp-board-trail" d="M200 120 L1000 120 C1290 120 1290 470 1000 470 L200 470" />
              <motion.path
                className="lp-board-glow"
                d="M200 120 L1000 120 C1290 120 1290 470 1000 470 L200 470"
                initial={reduce ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
            <ol className="lp-steps">
              {LOOP.map((step, i) => (
                <li key={step.title} className={`lp-step lp-step--${i + 1}`}>
                  <div className="lp-step-art" aria-hidden="true">
                    <LoopArtwork art={step.art} />
                  </div>
                  <div className="lp-step-text">
                    <h3>
                      <span className="lp-step-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      {step.title}
                    </h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="lp-trust" aria-labelledby="lp-trust-title">
        <div className="lp-container lp-trust-grid">
          <div>
            <h2 id="lp-trust-title" className="landing-h2">
              Vous gardez la main
            </h2>
            <p className="lp-section-lead">Okodukai tient les comptes comme une banque, sans en être une : aucun argent réel ne circule.</p>
            <ul className="lp-guarantees">
              {GUARANTEES.map((g) => (
                <li key={g.title}>
                  <span className="lp-guarantee-icon">
                    <GameIcon name={g.icon} size={22} />
                  </span>
                  <div>
                    <strong>{g.title}</strong>
                    <p>{g.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <figure className="lp-statement">
            <div className="lp-statement-card">
              <div className="lp-statement-head">
                <span className="lp-statement-owner">Compte de Léa</span>
                <span className="lp-statement-tag">Exemple</span>
              </div>
              <div className="lp-statement-balance">
                <CoinArt size={44} />
                <strong>128</strong>
                <span>pièces disponibles</span>
              </div>
              <div className="lp-statement-vault">
                <ChestArt state="low" size={52} />
                <div>
                  <span>Mon coffre · objectif « jeu de société »</span>
                  <div className="lp-statement-progress" role="img" aria-label="60 pièces sur 150">
                    <span style={{ width: "40%" }} />
                  </div>
                </div>
                <strong>60 / 150</strong>
              </div>
              {STATEMENT.map((group) => (
                <div key={group.day} className="lp-statement-day">
                  <span className="lp-statement-date">{group.day}</span>
                  <ul>
                    {group.rows.map((row) => (
                      <li key={row.detail}>
                        <span className="lp-statement-label">
                          <strong>{row.label}</strong>
                          {row.detail}
                        </span>
                        <span className={`lp-statement-amount${row.amount > 0 ? " lp-statement-amount--in" : ""}`}>{formatAmount(row.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <figcaption>Un relevé comme celui que votre enfant consulte dans « Mon argent ».</figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-final" aria-labelledby="lp-final-title">
        <ValleyBackdrop mood="dusk" className="lp-final-backdrop" />
        <div className="lp-container lp-final-inner">
          <ChestArt state="almost" size={220} className="lp-final-chest" />
          <div>
            <h2 id="lp-final-title" className="landing-h2">
              Deux minutes pour commencer
            </h2>
            <p>Un e-mail et un mot de passe, le nom de votre famille, puis un profil par enfant. Tout se modifie ensuite.</p>
            <div className="lp-hero-actions">
              <Link to={primaryCta.to} className="btn btn-quest">
                {primaryCta.label}
              </Link>
              <Link to={secondaryCta.to} className="btn lp-btn-light">
                {secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container">
          <p>Okodukai n'est pas une banque. Les pièces sont virtuelles : elles ne s'achètent pas et ne se convertissent pas en euros.</p>
        </div>
      </footer>
    </div>
  );
}
