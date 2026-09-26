# Plan de tests : argent, coffre et placements

## Automatisé (API, `npm test` dans `apps/api`, base locale requise)

| Fichier | Ce qui est garanti |
| --- | --- |
| `routes/money.e2e.test.ts` | Double appui : une seule écriture par clé d'intention ; montant trop grand → erreur chiffrée ; objectifs remplis en cascade ; règle « avec accord » : dépôts antérieurs libres, demande `202`, une seule demande en attente, refus automatique si le coffre ne suffit plus, acceptation → `SAVINGS_UNLOCK` ; semaine (entrées, mis de côté, repris) ; relevé signé et soldes avant/après ; détail d'un transfert (deux lignes) ; isolation entre foyers. |
| `routes/invest.e2e.test.ts` | Observatoire fermé avant un premier dépôt au coffre ; répartition invalide refusée (total, pas de 5 %) ; démarrage idempotent ; aucune fuite de `seed`, `marketPath` ou nom de scénario ; un relevé par rendez-vous, rattrapage sans doublon ; arbitrage prévu au prochain relevé, un seul à la fois ; bilan marqué lu ; vue parent identique ; désactivation parent ; isolation entre foyers. |
| `routes/learning.e2e.test.ts` | La bonne réponse ne quitte jamais le serveur ; `{ correct: true }` forgé refusé ; XP une seule fois. |
| `routes/authContinue.e2e.test.ts` | Créer ou se connecter avec le même formulaire, e-mail insensible à la casse, accueil marqué terminé. |
| `routes/questBooster.e2e.test.ts` | Validation de quête idempotente, booster ouvert une seule fois. |
| `lib/financeSim/*.test.ts` | Moteur : reproductibilité, horloge (fuseaux, heure d'été), scénarios équilibrés, valorisation, frais, pédagogie. |

## Parcours manuels (avant chaque mise en production)

1. **Compte** : nouvel e-mail → accueil (famille, enfant, prêt) → espace parent ; déconnexion, même
   écran avec le même e-mail → connexion ; mauvais mot de passe → message clair.
2. **Mon compte** (8-9 et 10-12) : solde, semaine, derniers mouvements ; aucun montant rouge hors erreur.
3. **Mon coffre** : mettre 10 de côté (aperçu avant → après exact), double-tap rapide → un seul
   transfert ; reprendre ; créer deux objectifs, vérifier l'ordre de remplissage ; ranger un objectif.
4. **Règles** : parent passe à « Avec votre accord » → l'enfant voit la phrase avant le dépôt ;
   demande de retrait → visible au tableau de bord parent → accepter / refuser → message côté enfant.
5. **Historique** : filtres (10-12), « Voir plus », fiche d'un mouvement (Avant · Mouvement · Après).
6. **Investir** : observatoire fermé tant qu'aucun dépôt ; onboarding 6 étapes sans pré-remplissage ;
   8-9 : jetons, aucune valeur en % ; 10-12 : % et courbe ; tout sur un seul support → encart
   non bloquant ; avancer `startedAt` en base pour révéler des relevés → bilan, fermeture, arbitrage.
7. **Accessibilité** : navigation clavier complète (onglets, bascules, pas à pas), lecteur d'écran sur
   une ligne de relevé (« Sortie, 30 pièces, Récompense Soirée film »), `prefers-reduced-motion`.
8. **Mobile 375 px** : onglets de Mon argent lisibles, atelier utilisable au pouce (cibles ≥ 44 px).
