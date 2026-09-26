# Mon argent : expérience bancaire de l'enfant

Implémentation de la phase 1 de la mission financière : le premier compte de l'enfant, 100 % virtuel, lu
comme un vrai relevé. Les règles de fond (vocabulaire, pédagogie, anti-patterns) sont dans
`docs/FINANCIAL_EDUCATION.md` §11 ; ce document décrit ce qui est livré et où.

## Navigation

Barre enfant : **Accueil · Mon argent · Quêtes · Boutique · Collection**. « Mon argent » ouvre quatre
onglets : **Mon compte** (`/enfant/argent`) · **Mon coffre** (`/enfant/argent/coffre`) · **Investir**
(`/enfant/argent/investir`, l'atelier actuel en attendant l'observatoire) · **Historique**
(`/enfant/argent/historique`). Les anciennes adresses `/enfant/coffre` et `/enfant/apprendre` redirigent.

## Mon compte

- Le **livret** : le solde d'abord (« J'ai 82 pièces » en 8-9 ans, « Mon compte · 82 pièces » en 10-12), puis
  la semaine en cours (lundi, heure de Paris) : 8-9 « +40 gagnées, −25 dépensées » ; 10-12 « entrées ·
  sorties · différence · mis de côté ». Les transferts ne comptent ni en entrée ni en sortie.
- **Mon coffre** en carte, avec le coffre 3D dont l'état suit le premier objectif (vide, peu, bien rempli,
  presque, atteint ; sans objectif, selon la quantité), le solde et « présent sur cible · il te manque ».
- 10-12 : « Tout mon argent » (compte + coffre, tous deux en pièces : ils s'additionnent ; les unités école
  du simulateur ne s'y ajoutent jamais).
- Les 5 derniers mouvements, chacun ouvrable.

## Historique (relevé)

- Un lieu à la fois : **Mon compte** ou **Mon coffre**. Le signe dépend du lieu regardé : un transfert
  de 10 pièces s'écrit « Vers Mon coffre −10 » sur le compte et « Depuis Mon compte +10 » sur le coffre.
- Chaque ligne : icône de sens + **mot** (Entrée, Sortie, Transfert, Remboursement, Correction, Bonus
  d'épargne) + libellé nommant la source (quête, récompense, parent) + montant **toujours signé** (« − »
  typographique). Couleur facultative : vert doux pour les entrées, encre pour les sorties, **jamais de
  rouge** hors erreur.
- Groupes par jour : « Aujourd'hui », « Hier », « Mardi », puis « mardi 14 octobre ».
- 10-12 : solde après chaque ligne, filtres Tout / Entrées / Sorties / Transferts, résumé de la semaine.
  8-9 : 10 lignes puis « Voir plus ». Pagination par curseur : plus de limite cachée à 30 lignes.
- Fiche d'un mouvement (appui sur la ligne) : **Avant · Mouvement · Après**, date, auteur (« Toi » ou le
  prénom du parent), raison, état « en attente de validation » pour un achat non encore accepté.

## Mon coffre

- Coffre 3D en grand, solde, et **la règle dite avant le dépôt** (voir `SAVINGS_VAULT_SPEC.md`).
- Transfert : bascule « Mettre de côté / Reprendre », montants rapides 5 · 10 · 20 · Tout, stepper −/+,
  **aperçu obligatoire** « Mon compte 82 → 72 · Mon coffre 30 → 40 », bouton qui nomme l'action
  (« Mettre 10 pièces dans Mon coffre », « Demander à reprendre 10 pièces »).
- Une clé d'idempotence par intention (nouvelle à chaque changement de montant ou de sens, et après
  chaque transfert réussi), bouton désactivé pendant l'envoi : un double appui ne crée jamais deux transferts.
- Confirmation : « C'est fait. 10 pièces sont dans Mon coffre. Ton total n'a pas changé. »
- Objectifs multiples (5 au plus), remplis **dans l'ordre** ; chacun affiche présent, cible et manque ;
  « Ranger cet objectif » quand il est utilisé ou abandonné.

## Parent

- **Enfants** : règle de retrait du coffre par enfant (Libre, Avec votre accord, Durée minimale,
  Objectif atteint), appliquée aux pièces déposées à partir du changement.
- **Tableau de bord** : les demandes de retrait rejoignent les validations (quêtes, récompenses) avec
  Accepter / Refuser.

## API

| Route | Rôle |
| --- | --- |
| `GET /child/money` | Soldes, semaine, 5 derniers mouvements, objectifs remplis, règle et disponibilité du coffre, demande en attente |
| `GET /child/money/history?place=account\|vault&filter=all\|in\|out\|transfer&cursor=&limit=` | Relevé paginé, du plus récent au plus ancien, avec soldes avant/après |
| `GET /child/money/lines/:transactionId` | Les lignes d'une transaction (deux pour un transfert) |
| `POST /child/savings/lock` · `/unlock` `{ amount, idempotencyKey }` | Transferts ; `202` + demande quand la règle exige un parent ; erreurs chiffrées (`INSUFFICIENT_ACCOUNT`, `INSUFFICIENT_VAULT`, `VAULT_LOCKED_UNTIL`, `VAULT_LOCKED_GOAL`, `REQUEST_PENDING`) |
| `POST /child/savings/goals` · `GET` · `POST /child/savings/goals/:id/archive` | Objectifs |
| `GET\|PUT /household/children/:childId/vault-rule` | Règle du coffre (parent, foyer vérifié) |
| `GET /household/vault-requests` · `POST /household/vault-requests/:id/decision` | Demandes de retrait |

Tout est calculé à partir du ledger immuable (`lib/money.ts` relit les transactions dans l'ordre) ;
chaque écriture verrouille la ligne du portefeuille (`SELECT … FOR UPDATE`) pour que deux débits
simultanés ne passent pas le même contrôle de solde. Tests : `apps/api/src/routes/money.e2e.test.ts`.
