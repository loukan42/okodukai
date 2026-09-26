# Mon coffre : règles, objectifs et demandes de retrait

Spécification de ce que le serveur applique (`apps/api/src/lib/money.ts`, `apps/api/src/routes/savings.ts`).

## Soldes

Mon coffre n'est pas une table : son solde est la somme des transactions `SAVINGS_LOCK` et `SAVINGS_BONUS`
moins les `SAVINGS_UNLOCK`. Mon compte reçoit l'opposé des transferts. Un transfert ne change jamais le
total de l'enfant.

## Règle de retrait (fixée par un parent, `VaultRule`)

| Mode | Retrait immédiat | Au-delà |
| --- | --- | --- |
| `FREE` (défaut) | tout | — |
| `PARENT_APPROVAL` | pièces déposées avant la règle | demande au parent (`202`, `VaultWithdrawalRequest`) |
| `MIN_DAYS` (1-365 j) | dépôts plus vieux que la durée, et dépôts antérieurs à la règle | refus chiffré avec la date de déblocage (`VAULT_LOCKED_UNTIL`) |
| `GOAL_ONLY` | tout, une fois le premier objectif atteint ; dépôts antérieurs à la règle | refus avec le manque (`VAULT_LOCKED_GOAL`) ; sans objectif actif : demande au parent |

**Dépôt par dépôt.** Chaque dépôt est un lot daté. Les retraits consomment les lots les plus anciens
d'abord (FIFO). Un lot déposé **avant** `VaultRule.since` reste libre : on ne change pas les règles d'un
dépôt déjà fait. Tout changement de mode ou de durée remet `since` à maintenant ; conséquence assumée : les
pièces déjà au coffre deviennent libres au moment d'un changement de règle.

## Demandes de retrait

- Une seule demande en attente par enfant (`409 REQUEST_PENDING` sinon).
- Clé d'idempotence du client : un double appui ne crée qu'une demande.
- Le parent accepte ou refuse depuis le tableau de bord. À l'acceptation, le serveur écrit un
  `SAVINGS_UNLOCK` (clé `vault-request:<id>`, donc jamais deux fois) ; si le coffre ne contient plus assez,
  la demande est refusée et le parent en est informé.
- L'enfant reçoit une notification dans les deux cas (`vault_request_decided`).

## Objectifs

- Jusqu'à 5 objectifs actifs (`SavingsGoal.archivedAt` nul), ordonnés par `position` puis date.
- **Remplissage en cascade** : Mon coffre remplit le premier objectif, puis le suivant avec le reste.
  Chaque objectif expose `present`, `missing`, `reached`.
- `achievedAt` est posé une seule fois quand un objectif devient rempli (notification `goal_completed`,
  badge « premier objectif ») ; `ChildProfile.activeGoalId` suit le premier objectif non rempli.
- « Ranger » un objectif l'archive : il sort de la cascade, son historique reste.

## Idempotence et concurrence

- Transferts : clé `savings-lock|savings-unlock:<childId>:<clé client>` ; un rejeu renvoie l'état courant
  sans rien écrire. Bonus d'épargne parent : clé optionnelle fournie par le client.
- Toute écriture au ledger prend un verrou `FOR UPDATE` sur la ligne `Wallet` pour la durée de la
  transaction.

## Pas encore fait

- Réordonner les objectifs (l'ordre est celui de création).
- Relier un objectif à une récompense de la boutique dans l'interface (le champ `rewardId` existe).
- Versements réguliers (« argent régulier ») et cadeaux : nouveaux types de transaction à ajouter.
