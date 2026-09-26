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
- **XP des placements** (`XpSourceType.FINANCE_LEARNING`, montant fixe, jamais lié au résultat) :
  +20 à la première répartition (`fin:onboarding:{childId}`, une fois par enfant) et +20 quand le
  bilan final d'une partie est lu (`fin:partie:{childId}:{runId}`, une fois par partie).
- Les anciennes tables `SimulationScenario` / `SimulationPortfolio` / `SimulationTransaction`
  (simulateur « clic pour avancer ») ont été supprimées (migration `20260926082000_drop_legacy_simulator`).

## Argent de poche, cadeaux, notifications

- `WalletTransactionType` : `ALLOWANCE` (argent de poche) et `GIFT` (cadeau, avec sa raison), des entrées à part.
- **`AllowanceSchedule`** (1 par enfant) : montant, jour de la semaine (8 h, heure de Paris), actif, `startsAt`.
  Les versements dus sont créés à la lecture du compte, datés du jour dû, clé `allowance:{childId}:{date}`.
- **`PushSubscription`** : abonnements Web Push d'un enfant ; `InvestSettings.notifyStatement` (désactivé par
  défaut) ; `SimulationSnapshot.notifiedAt` : au plus une notification par relevé.
- **`InvestPause`** : pauses parentales (`to` nul tant que dure la pause) ; `InvestSettings.contributionsEnabled`
  et `contributionCap` pour les versements programmés de l'observatoire.
- **`FinanceNotionProgress`** et **`FinanceTipLog`** : notions (rencontrée, expliquée, vérifiée) et feuillets vus.
  `ChildProfile.pedagogyLevel` (AUTO, DECOUVERTE, APPROFONDI) prime sur la tranche d'âge.

## Connexion

- **`AuthThrottle`** : compteur d'essais par clé (`parent:{email}`, `child-pin:{childId}`), en base
  car l'API tourne en serverless. L'essai est compté avant la vérification, sous verrou de ligne ; un
  succès supprime la ligne. Mot de passe parent : 10 essais par 15 min (connexion et sortie du mode
  enfant partagent le compteur). PIN enfant : 5 essais par 15 min. Chaque blocage double le suivant
  (parent 15 min → 1 h, enfant 5 min → 1 h) ; les blocages sont oubliés un jour après le dernier.
  Réponse 429 avec `Retry-After`. Un e-mail inconnu ne crée pas de ligne.
- Clé `ip:{adresse}` (30 essais par 15 min, succès compris) : seulement pour une adresse signée par le relais du
  site (`PROXY_SECRET`). Cookie `okodukai_device` (foyer signé, 1 an) : exigé pour la liste des profils et le PIN.

## Isolation et autorité

Chaque route enfant lit l'identité dans la session signée ; chaque route parent vérifie que l'enfant
appartient au foyer de la session (réponse 404 sinon). Les valeurs affichées (soldes, variations,
risque d'une répartition) viennent toutes du serveur.
