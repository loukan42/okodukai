import type { CSSProperties, ReactNode } from "react";
import { ObjectArt } from "../../art/ObjectArt";
import { GameIcon } from "../GameIcon";
import { pieces, type VaultPrimePreview } from "../../lib/money";

const LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/**
 * « Ma prime de lundi » : ce que Mon coffre va donner lundi, et ce qu'il devient si on n'y touche
 * pas. Tous les nombres viennent du serveur ; ici, on ne fait que les montrer.
 */
export function VaultPrimeCard({ prime }: { prime: VaultPrimePreview }) {
  if (!prime.active || !prime.next) return null;
  const { next, balance, step, weeklyCap, countsFromNextWeek, projection } = prime;
  const day = LONG.format(new Date(next.at));
  const last = projection.at(-1);
  const grows = balance > 0 && projection.some((p) => p.prime > 0);

  let title: ReactNode;
  let detail: string;
  if (next.amount > 0) {
    title = (
      <>
        Lundi, ton coffre te donne <strong>+{pieces(next.amount)}</strong>
      </>
    );
    detail = `Le ${day} à 8 h, si tu laisses tes pièces dans ton coffre jusque-là.`;
  } else if (balance === 0) {
    title = "Ton coffre peut te faire gagner des pièces";
    detail = "Range des pièces dedans : chaque lundi, il t'en donne en plus.";
  } else if (countsFromNextWeek > 0 && balance >= step) {
    title = "Tes pièces commencent à compter lundi";
    detail = "Pour gagner la prime, les pièces doivent rester une semaine entière dans ton coffre.";
  } else {
    title = `Encore ${pieces(Math.max(1, step - balance))} à ranger`;
    detail = `Avec ${pieces(step)} gardées toute la semaine, ton coffre te donne 1 pièce en plus.`;
  }

  return (
    <section className="vault-prime" aria-labelledby="vault-prime-title">
      <div className="vault-prime-head">
        <ObjectArt name="coin-sprout" size={88} className="vault-prime-art" />
        <div>
          <p className="vault-prime-kicker">Ma prime de lundi</p>
          <h2 id="vault-prime-title">{title}</h2>
          <p className="vault-prime-detail">{detail}</p>
        </div>
      </div>

      {next.amount > 0 && countsFromNextWeek > 0 && (
        <p className="vault-prime-note">Les {pieces(countsFromNextWeek)} rangées cette semaine compteront à partir de lundi.</p>
      )}

      {grows && last && (
        <figure className="vault-prime-growth">
          <figcaption>Si tu n'y touches pas</figcaption>
          <ol>
            <li style={{ "--h": balance / last.balance } as CSSProperties}>
              <strong>{balance}</strong>
              <span className="vault-prime-bar" aria-hidden="true" />
              <span className="vault-prime-when">Aujourd'hui</span>
            </li>
            {projection.map((p) => (
              <li key={p.at} style={{ "--h": p.balance / last.balance } as CSSProperties}>
                <strong>{p.balance}</strong>
                <span className="vault-prime-bar" aria-hidden="true">
                  {p.prime > 0 && <em>+{p.prime}</em>}
                </span>
                <span className="vault-prime-when">Lun. {SHORT.format(new Date(p.at))}</span>
              </li>
            ))}
          </ol>
          <p>
            Dans {projection.length} semaines : <strong>{pieces(last.balance)}</strong> dans ton coffre, juste en attendant.
          </p>
        </figure>
      )}

      <p className="vault-prime-rule">
        <GameIcon name="coin" size={16} />
        <span>
          La règle : 1 pièce en plus pour chaque {step} pièces gardées toute la semaine, jusqu'à {pieces(weeklyCap)} par semaine.
        </span>
      </p>
    </section>
  );
}
