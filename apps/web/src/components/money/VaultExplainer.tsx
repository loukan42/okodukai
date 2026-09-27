import { useState } from "react";
import { ObjectArt } from "../../art/ObjectArt";
import { ChestArt } from "../../art/ChestArt";
import { pieces, type VaultPrimePreview } from "../../lib/money";
import { defineCopy, useCopy } from "../../i18n";

const COPY = defineCopy({
  fr: {
    title: "Comment fonctionne le Coffre magique ?",
    step1: "Tu ranges des pièces",
    step1Text: "Tu déplaces des pièces de ton compte vers le coffre. Tu as toujours autant de pièces en tout.",
    step2: "Elles sont à l'abri",
    step2Text: "Tu ne les dépenses pas par erreur : elles attendent ton objectif.",
    step3: "Chaque lundi, ton coffre t'en donne en plus",
    step3Text: (step: number) => `Pour chaque ${step} pièces restées toute la semaine, tu gagnes 1 pièce.`,
    example: (kept: number) => `Exemple : ${kept} pièces gardées toute la semaine → lundi,`,
    goalTitle: "Ton objectif se rapproche",
    goalText: "Chaque pièce rangée te rapproche de ce que tu veux.",
    compare: "Tu peux utiliser les pièces de ton compte. Celles que tu laisses dans le coffre toute la semaine peuvent te rapporter une prime le lundi.",
    wordStart: "Dans une banque, ce petit supplément s'appelle des",
    word: "intérêts",
  },
  en: {
    title: "How does the Magic Vault work?",
    step1: "You put coins away",
    step1Text: "You move coins from your account into the vault. You still have the same number of coins in total.",
    step2: "They're kept safe",
    step2Text: "You won't spend them by mistake: they wait for your goal.",
    step3: "Every Monday, your vault gives you extra",
    step3Text: (step: number) => `For every ${step} coins that stay in all week, you get 1 coin.`,
    example: (kept: number) => `Example: ${kept} coins kept all week → on Monday,`,
    goalTitle: "Your goal gets closer",
    goalText: "Every coin you put away brings you closer to what you want.",
    compare: "You can use the coins in your account. The ones you leave in the vault all week can earn you a bonus on Monday.",
    wordStart: "At a bank, this little extra is called",
    word: "interest",
  },
});

/**
 * « Comment marche mon coffre ? » : trois étapes illustrées, écrites pour 8-12 ans. Ouvert tant que
 * le coffre est vide ou à la première visite, repliable ensuite.
 */
export function VaultExplainer({ prime, rule, older, startOpen }: { prime: VaultPrimePreview; rule: string; older: boolean; startOpen: boolean }) {
  const t = useCopy(COPY);
  const [open, setOpen] = useState(startOpen);
  return (
    <details className="vault-explainer" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>{t.title}</span>
        <span className="vault-explainer-chevron" aria-hidden="true" />
      </summary>
      <ol className="vault-steps">
        <li>
          <ObjectArt name="coin-pouch" size={72} className="vault-step-art" />
          <div>
            <h3>{t.step1}</h3>
            <p>{t.step1Text}</p>
          </div>
        </li>
        <li>
          <ChestArt state="full" size={72} className="vault-step-art" />
          <div>
            <h3>{t.step2}</h3>
            <p>
              {t.step2Text} {rule}
            </p>
          </div>
        </li>
        <li>
          {prime.active ? (
            <>
              <ObjectArt name="coin-sprout" size={72} className="vault-step-art" />
              <div>
                <h3>{t.step3}</h3>
                <p>{t.step3Text(prime.step)}</p>
                {prime.example.prime > 0 && (
                  <p className="vault-steps-example">
                    {t.example(prime.example.kept)} <strong>+{pieces(prime.example.prime)}</strong>.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <ObjectArt name="hourglass" size={72} className="vault-step-art" />
              <div>
                <h3>{t.goalTitle}</h3>
                <p>{t.goalText}</p>
              </div>
            </>
          )}
        </li>
      </ol>
      {prime.active && <p className="vault-explainer-compare">{t.compare}</p>}
      {prime.active && older && (
        <p className="vault-explainer-word">
          {t.wordStart} <strong>{t.word}</strong>.
        </p>
      )}
    </details>
  );
}
