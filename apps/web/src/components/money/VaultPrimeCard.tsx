import type { CSSProperties, ReactNode } from "react";
import { ObjectArt } from "../../art/ObjectArt";
import { GameIcon } from "../GameIcon";
import { pieces, type VaultPrimePreview } from "../../lib/money";
import { defineCopy, useCopy } from "../../i18n";
import { dateFormatter } from "../../i18n/format";

const LONG = dateFormatter({ weekday: "long", day: "numeric", month: "long" });
const SHORT = dateFormatter({ day: "numeric", month: "short" });

const COPY = defineCopy({
  fr: {
    kicker: "Ma prime de lundi",
    givesStart: "Lundi, ton coffre te donne",
    givesDetail: (day: string) => `Le ${day} à 8 h, si tu laisses tes pièces dans ton coffre jusque-là.`,
    emptyTitle: "Ton coffre peut te faire gagner des pièces",
    emptyDetail: "Range des pièces dedans : chaque lundi, il t'en donne en plus.",
    waitTitle: "Tes pièces commencent à compter lundi",
    waitDetail: "Pour gagner la prime, les pièces doivent rester une semaine entière dans ton coffre.",
    moreTitle: (coins: string) => `Encore ${coins} à ranger`,
    moreDetail: (coins: string) => `Avec ${coins} gardées toute la semaine, ton coffre te donne 1 pièce en plus.`,
    fromNextWeek: (coins: string) => `Les ${coins} rangées cette semaine compteront à partir de lundi.`,
    ifUntouched: "Si tu n'y touches pas, chaque lundi",
    today: "Aujourd'hui",
    inWeeks: (n: number) => `Dans ${n} semaines :`,
    inVault: "dans ton coffre, juste en attendant.",
    rule: (step: number, cap: string) => `La règle : 1 pièce en plus pour chaque ${step} pièces gardées toute la semaine, jusqu'à ${cap} par semaine.`,
  },
  en: {
    kicker: "My Monday bonus",
    givesStart: "On Monday, your vault gives you",
    givesDetail: (day: string) => `On ${day} at 8 am, if you leave your coins in the vault until then.`,
    emptyTitle: "Your vault can earn you coins",
    emptyDetail: "Put some coins in: every Monday, it gives you a few extra.",
    waitTitle: "Your coins start counting on Monday",
    waitDetail: "To get the bonus, coins have to stay in your vault for a whole week.",
    moreTitle: (coins: string) => `${coins} more to put away`,
    moreDetail: (coins: string) => `With ${coins} kept all week, your vault gives you 1 extra coin.`,
    fromNextWeek: (coins: string) => `The ${coins} you put away this week will count from Monday.`,
    ifUntouched: "If you leave them, every Monday",
    today: "Today",
    inWeeks: (n: number) => `In ${n} weeks:`,
    inVault: "in your vault, just by waiting.",
    rule: (step: number, cap: string) => `The rule: 1 extra coin for every ${step} coins kept all week, up to ${cap} a week.`,
  },
});

/**
 * « Ma prime de lundi » : ce que Mon coffre va donner lundi, et ce qu'il devient si on n'y touche
 * pas. Tous les nombres viennent du serveur ; ici, on ne fait que les montrer.
 */
export function VaultPrimeCard({ prime }: { prime: VaultPrimePreview }) {
  const t = useCopy(COPY);
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
        {t.givesStart} <strong>+{pieces(next.amount)}</strong>
      </>
    );
    detail = t.givesDetail(day);
  } else if (balance === 0) {
    title = t.emptyTitle;
    detail = t.emptyDetail;
  } else if (countsFromNextWeek > 0 && balance >= step) {
    title = t.waitTitle;
    detail = t.waitDetail;
  } else {
    title = t.moreTitle(pieces(Math.max(1, step - balance)));
    detail = t.moreDetail(pieces(step));
  }

  return (
    <section className="vault-prime" aria-labelledby="vault-prime-title">
      <div className="vault-prime-head">
        <ObjectArt name="coin-sprout" size={88} className="vault-prime-art" />
        <div>
          <p className="vault-prime-kicker">{t.kicker}</p>
          <h2 id="vault-prime-title">{title}</h2>
          <p className="vault-prime-detail">{detail}</p>
        </div>
      </div>

      {next.amount > 0 && countsFromNextWeek > 0 && <p className="vault-prime-note">{t.fromNextWeek(pieces(countsFromNextWeek))}</p>}

      {grows && last && (
        <figure className="vault-prime-growth">
          <figcaption>{t.ifUntouched}</figcaption>
          <ol>
            <li style={{ "--h": balance / last.balance } as CSSProperties}>
              <strong>{balance}</strong>
              <span className="vault-prime-bar" aria-hidden="true" />
              <span className="vault-prime-when">{t.today}</span>
            </li>
            {projection.map((p) => (
              <li key={p.at} style={{ "--h": p.balance / last.balance } as CSSProperties}>
                <strong>{p.balance}</strong>
                <span className="vault-prime-bar" aria-hidden="true">
                  {p.prime > 0 && <em>+{p.prime}</em>}
                </span>
                <span className="vault-prime-when">{SHORT.format(new Date(p.at))}</span>
              </li>
            ))}
          </ol>
          <p>
            {t.inWeeks(projection.length)} <strong>{pieces(last.balance)}</strong> {t.inVault}
          </p>
        </figure>
      )}

      <p className="vault-prime-rule">
        <GameIcon name="coin" size={16} />
        <span>{t.rule(step, pieces(weeklyCap))}</span>
      </p>
    </section>
  );
}
