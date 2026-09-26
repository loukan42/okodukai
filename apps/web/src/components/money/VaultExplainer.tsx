import { useState } from "react";
import { ObjectArt } from "../../art/ObjectArt";
import { ChestArt } from "../../art/ChestArt";
import { pieces, type VaultPrimePreview } from "../../lib/money";

/**
 * « Comment marche mon coffre ? » : trois étapes illustrées, écrites pour 8-12 ans. Ouvert tant que
 * le coffre est vide ou à la première visite, repliable ensuite.
 */
export function VaultExplainer({ prime, rule, older, startOpen }: { prime: VaultPrimePreview; rule: string; older: boolean; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details className="vault-explainer" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>Comment fonctionne le Coffre magique ?</span>
        <span className="vault-explainer-chevron" aria-hidden="true" />
      </summary>
      <ol className="vault-steps">
        <li>
          <ObjectArt name="coin-pouch" size={72} className="vault-step-art" />
          <div>
            <h3>Tu ranges des pièces</h3>
            <p>Tu déplaces des pièces de ton compte vers le coffre. Tu as toujours autant de pièces en tout.</p>
          </div>
        </li>
        <li>
          <ChestArt state="full" size={72} className="vault-step-art" />
          <div>
            <h3>Elles sont à l'abri</h3>
            <p>Tu ne les dépenses pas par erreur : elles attendent ton objectif. {rule}</p>
          </div>
        </li>
        <li>
          {prime.active ? (
            <>
              <ObjectArt name="coin-sprout" size={72} className="vault-step-art" />
              <div>
                <h3>Chaque lundi, ton coffre t'en donne en plus</h3>
                <p>Pour chaque {prime.step} pièces restées toute la semaine, tu gagnes 1 pièce.</p>
                {prime.example.prime > 0 && (
                  <p className="vault-steps-example">
                    Exemple : {prime.example.kept} pièces gardées toute la semaine → lundi, <strong>+{pieces(prime.example.prime)}</strong>.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <ObjectArt name="hourglass" size={72} className="vault-step-art" />
              <div>
                <h3>Ton objectif se rapproche</h3>
                <p>Chaque pièce rangée te rapproche de ce que tu veux.</p>
              </div>
            </>
          )}
        </li>
      </ol>
      {prime.active && (
        <p className="vault-explainer-compare">
          Tu peux utiliser les pièces de ton compte. Celles que tu laisses dans le coffre toute la semaine peuvent te rapporter une prime le lundi.
        </p>
      )}
      {prime.active && older && (
        <p className="vault-explainer-word">
          Dans une banque, ce petit supplément s'appelle des <strong>intérêts</strong>.
        </p>
      )}
    </details>
  );
}
