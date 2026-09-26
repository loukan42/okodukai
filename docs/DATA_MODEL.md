# Modèle de données : argent de l'enfant

Deux monnaies qui ne se rencontrent jamais :

| Monnaie | Où | Horloge | Écrit par |
| --- | --- | --- | --- |
| **Pièces** (économie familiale) | `WalletTransaction` (ledger immuable) | calendrier réel | quêtes, boutique, parents, transferts compte ↔ coffre |
| **Unités école** (simulateur) | `SimulationRun` / `SimulationOperation` / `SimulationSnapshot` | temps simulé, révélé par rendez-vous | enfant (répartition, arbitrage) ; moteur `finsim` |

Aucune table ne convertit, n'additionne ni ne transfère l'une dans l'autre. Schéma complet :
`apps/api/prisma/schema.prisma`.

## Pièces

- **`Wallet`** (1 par enfant) ; **`WalletTransaction`** : `amount` toujours positif, `type`
  (`QUEST_REWARD`, `PARENT_BONUS`, `PARENT_ADJUSTMENT` + `direction`, `REWARD_PURCHASE`, `REWARD_REFUND`,
  `SAVINGS_LOCK`, `SAVINGS_UNLOCK`, `SAVINGS_BONUS`), `sourceType`/`sourceId`, `actorId`, `reason`,
  `idempotencyKey` unique. Jamais modifiée ni supprimée : une correction est une nouvelle ligne.
- Soldes (Mon compte, Mon coffre) et relevé : **calculés** en relisant le ledger (`lib/ledger.ts`,
  `lib/money.ts`) ; aucune colonne `balance`.
- Toute écriture verrouille la ligne `Wallet` (`SELECT … FOR UPDATE`) le temps de la transaction.
- **`SavingsGoal`** : `title`, `targetCoins`, `position` (ordre de remplissage), `achievedAt`, `archivedAt`.
- **`VaultRule`** (1 par enfant, défaut libre) : `mode` (`FREE`, `PARENT_APPROVAL`, `MIN_DAYS`,
  `GOAL_ONLY`), `minDays`, `since` (les dépôts antérieurs restent libres).
- **`VaultWithdrawalRequest`** : `amount`, `status` (`PENDING` → `APPROVED` | `REFUSED`),
  `idempotencyKey` unique, `decidedById`. L'acceptation écrit un `SAVINGS_UNLOCK` de clé `vault-request:<id>`.

## Unités école

- **`InvestSettings`** (1 par enfant) : `enabled`, `rhythm` (`RAPIDE` | `STANDARD` | `LONG`),
  `horizonMonths` (60 ou 120). Le rythme et la durée s'appliquent à la partie suivante.
- **`SimulationRun`** : une partie. `seed` et `scenario` **jamais envoyés au client** avant la fin ;
  `marketPath` (trajectoire complète figée à la création, jamais sérialisée au-delà de l'étape
  révélée), `engineVersion`, `parametersFingerprint`, `rhythm`, `timeZone`, `startedAt`, `fees`,
  `status` (`EN_COURS`, `TERMINEE`, `ARRETEE` quand l'enfant recommence), `idempotencyKey` unique.
- **`SimulationOperation`** : journal immuable des décisions (`VERSEMENT` initial de 100 à l'étape 0,
  `ARBITRAGE` enregistré à l'étape du prochain rendez-vous). Clé d'idempotence unique.
- **`SimulationSnapshot`** : un relevé par rendez-vous (`rendezVousIndex` unique par partie), avec
  la valeur découverte (`valueAtReveal`), la valeur par support, le versé, l'indice de performance et
  l'indice des prix. Créé en rattrapage à la lecture, **jamais recalculé** ; `seenAt` quand le bilan
  est lu.
- Les anciennes tables `SimulationScenario` / `SimulationPortfolio` / `SimulationTransaction`
  (simulateur « clic pour avancer ») ne sont plus utilisées par l'API ; à supprimer dans une migration
  dédiée une fois les données de démonstration nettoyées.

## Isolation et autorité

Chaque route enfant lit l'identité dans la session signée ; chaque route parent vérifie que l'enfant
appartient au foyer de la session (réponse 404 sinon). Les valeurs affichées (soldes, variations,
risque d'une répartition) viennent toutes du serveur.
