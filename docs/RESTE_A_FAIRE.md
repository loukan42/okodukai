# Reste à faire : passation (26 septembre 2026)

Point de reprise pour la prochaine session (locale ou cloud). Tout ce qui est listé comme **fait** est
sur `main`. Lire aussi `CLAUDE.md` (règles produit) et `AGENTS.md` (skills).

---

## 0. Reprendre en local

```bash
git pull origin main
npm install                 # dépendances ajoutées : three, express-async-errors
npm run db:up               # Postgres Docker (si pas déjà lancé)
npm run db:migrate          # applique les migrations (onboarding, coffre, placements, verger)
npm run db:seed             # recrée le foyer de démo « Famille Martin » (Emma 8-9, Lucas 10-12)
npm run dev:api             # API : http://localhost:4000 (santé : /health)
npm run dev:web             # site : http://localhost:5173
```

- En dev, le bouton **Démo** (en bas à droite) connecte en un clic un parent ou un enfant de démo.
- Tests API : `cd apps/api && set -a && . ./.env && set +a && npx vitest run` (59 tests, tous verts
  au 26/09). Types : `npx tsc --noEmit -p apps/api` et `npm run build --workspace apps/web`.
- Pour voir des relevés de placements sans attendre : reculer `startedAt` de la partie en base, par
  exemple `UPDATE "SimulationRun" SET "startedAt" = now() - interval '4 days' WHERE "childId" = '…';`.

## 1. Production (Vercel) : à vérifier par le propriétaire

1. **Projet web** : variable `API_ORIGIN` = URL du projet API (sinon `VITE_API_URL` existante). Le site
   relaie `/api/*` via `apps/web/api/proxy.js` : le cookie de session est « first-party ».
2. **Projet API** : `DATABASE_URL` et `JWT_SECRET` obligatoires (sans `JWT_SECRET`, l'API répond 503).
   Le build lance maintenant `prisma generate && prisma migrate deploy` (`apps/api/vercel.json`).
   - Si le build échoue avec **P3005** (base créée sans historique de migrations) :
     `npx prisma migrate resolve --applied 20260925193030_init` avec la `DATABASE_URL` de prod, puis
     relancer le déploiement.
   - Si la base passe par un pooler (PgBouncer), `migrate deploy` peut exiger une URL directe
     (`directUrl` dans `schema.prisma`).
3. Contrôle : `https://okodukai-gold.vercel.app/api/health` doit renvoyer `"database":"ok"` et
   `"jwtSecret":"ok"`.
4. Les images de cartes et les anciens avatars (Héros de la classe) sont **gitignorés** : en prod, les
   cartes n'ont pas d'image. Il faut un vrai stockage (S3, Supabase storage propre à Okodukai ou Git
   LFS) : décision à prendre (voir `CLAUDE.md`).

## 2. Décisions en attente du propriétaire

| Sujet | Options | Où |
| --- | --- | --- |
| Visuel du booster | Garder l'image reprise de Héros de la classe (texte anglais « TRADING CARD BOOSTER PACK », crâne en bas) **ou** un booster Okodukai rendu en 3D (à produire, puis montrer les deux côte à côte) | `apps/web/src/assets/cards/card-booster.webp`, studio `scripts/art/studio/` |
| Boosters par univers | Un visuel de booster par univers de cartes (demandé dans la mission art) | dépend du point précédent |
| Stockage des images de cartes | S3 / Supabase / Git LFS | §1.4 |

Règle projet : pour tout choix entre deux éléments, **montrer les propositions** (images) et laisser
le propriétaire trancher.

---

## 3. Fait (résumé)

- **Compte** : écran unique « Votre compte Okodukai » (`/inscription`, `/connexion` →
  `POST /auth/continue` : connexion si l'e-mail existe, création sinon), puis accueil
  Famille → Enfants → Prêt (`/accueil/*`), garde tant que l'accueil n'est pas terminé.
- **Art** : studio 3D dans le repo (three.js + Chromium headless → WebP), bible mise à jour
  (`docs/ART_BIBLE.md` §2, §9, §10, §13), registre `docs/ASSET_REGISTRY.md`. Assets : pièce, coffre
  (6 états), parchemin, bourse, sablier, pousse à pièces, tableau d'aventurier, vallée heure dorée et
  crépuscule (desktop + mobile), 12 avatars SVG, logo en WebP.
- **Écrans habillés** : landing (hero 3D animé, plateau de la boucle, relevé exemple), compte et accueil,
  accueil enfant, quêtes, collection (crépuscule), Mon argent.
- **Mission financière** (voir `docs/BANKING_UX.md`, `docs/SAVINGS_VAULT_SPEC.md`, `docs/DATA_MODEL.md`,
  `docs/QA_PLAN.md`) :
  - « Mon argent » : Mon compte (livret, semaine), Historique (relevé jour par jour, signes écrits,
    filtres 10-12, fiche Avant · Mouvement · Après), Mon coffre (transferts idempotents avec aperçu,
    objectifs en cascade, règles de retrait fixées par le parent, demandes de retrait validées au
    tableau de bord parent).
  - « Investir » : observatoire branché sur le moteur `finsim-1.0.0` (partie figée, relevés en
    rattrapage, rien du futur côté client), onboarding 6 étapes, atelier de répartition, bilans sobres,
    arbitrage au prochain relevé, fin de partie avec scénario révélé ; 8-9 : jetons et mots, jamais de
    % ; 10-12 : %, courbe honnête, risque de la répartition.
  - Verger du temps long (assurance-vie simulée, 10-12) : frais d'exemple, versements programmés,
    relevés « belle récolte / un hiver », effet marché séparé des versements.
  - Bibliothèque : modules corrigés par le serveur (plus d'XP sur `correct: true` envoyé par le
    client) + leçons chiffrées 10-12 (boule de neige, frais, liste du marché).
  - Réglages parent par enfant : règle du coffre, placements (activés, rythme Rapide/Standard/Long,
    partie de 5 ou 10 ans).

---

## 4. Reste à faire, par priorité

### P1 : sécurité et solidité (fait le 26/09, branche `feat/p1-securite-solidite`)

Fait : limitation des essais en base (`AuthThrottle`, `lib/throttle.ts`, voir `DATA_MODEL.md`
§Connexion), XP des placements (+20 première répartition, +20 bilan final lu, `FINANCE_LEARNING`),
suppression des anciennes tables du simulateur. **Au prochain déploiement**, `migrate deploy` applique
3 migrations, dont un `DROP TABLE` des tables `Simulation{Scenario,Portfolio,Transaction}` (inutilisées).

Suites possibles :

1. **Limite par IP** (essais répartis sur beaucoup de comptes) : pas faite, l'IP n'est pas fiable
   derrière le relais `apps/web/api/proxy.js` (Vercel réécrit `x-forwarded-for`). Il faudrait que le
   relais transmette l'IP dans un en-tête signé par un secret partagé.
2. `GET /auth/households/:id/children` est public (prénoms et avatars d'un foyer à partir de son id,
   pour l'écran de choix du profil). Acceptable tant que l'id reste un UUID non divulgué ; à revoir
   si l'id circule (lien d'invitation, QR code…).
3. L'XP de première répartition est donnée à la validation ; quand Q04 existera (P2.2), la donner
   après Q04 comme le prévoit `FINANCIAL_EDUCATION.md` §7.1.

### P2 : mission financière (compléments)

Spécifications : `docs/INVESTMENT_UX.md`, `docs/FINANCIAL_EDUCATION.md`, `docs/INSURANCE_LIFE_SIMULATION.md`.

1. **Encarts pédagogiques contextuels** (T01 à T46) avec journal serveur « vu une fois par enfant »,
   au plus un encart par écran, file de priorité (réassurance d'abord) : `FINANCIAL_EDUCATION.md` §5.
   Aujourd'hui, seuls quelques encarts sont écrits en dur dans les écrans.
2. **Vérifications de compréhension** (Q01…, dont Q04 « Ton placement école a baissé. Et tes pièces ? »
   à l'étape 6 de l'onboarding) : §9.
3. **Fiche support** (E8) : page par support avec sa part, son évolution, son risque, la durée
   recommandée (sablier), les frais (10-12), « dans la vraie vie ».
4. **Fin de partie complète** (E16) : frise des décisions, « Et avec d'autres choix ? »
   (`alternativeOutcomes`, 10-12, phrase obligatoire « Personne ne pouvait savoir à l'avance »),
   archive « Mes parties » consultable, jamais de comparaison de valeur entre parties.
5. **Versements programmés dans l'observatoire** (E11, 10-12) avec plafond parent ; aujourd'hui
   seulement dans le verger.
6. **Vue parent des placements** (P2) : l'observatoire en lecture seule dans l'espace parent (l'API
   `GET /household/children/:id/invest` existe) + la note au parent sur l'assurance-vie (bénéficiaires,
   décision D6-A : jamais évoqué côté enfant).
7. **Pauses parentales** (vacances) : le moteur les gère (`clockState({ pauses })`), à stocker et à
   exposer dans les réglages parent.
8. **« Tout ce que je possède »** (patrimoine, 10-12) et le volet « Mon mois en pièces » dans les bilans.
9. **Niveau pédagogique** réglable par le parent (Découverte / Approfondi), prioritaire sur l'âge.
10. **Argent régulier et cadeaux** : types de transaction dédiés (et versement hebdomadaire
    automatique optionnel) ; aujourd'hui le parent passe par « + Pièces ».
11. **Objectifs** : relier un objectif à une récompense de la boutique (`rewardId` existe déjà),
    réordonner les objectifs.
12. **Notifications** « Ton bilan est prêt. » (au plus une par jour en Rapide, jamais la nuit, jamais la
    valeur dans le texte) ; aujourd'hui seulement la pastille dans l'app.

### P3 : direction artistique

1. **Booster** : voir §2 (produire la version 3D, montrer les deux, faire trancher).
2. **Boutique** : asset 3D de l'échoppe (auvent, comptoir, marchandises) et en-tête de page.
3. **Tableau de bord parent** : habillage sobre (bandeau vallée discret, pas de chrome de jeu).
4. **États vides illustrés** : faire accepter une image 3D au composant `EmptyState`
   (`apps/web/src/components/EmptyState.tsx`) et l'utiliser partout.
5. **`docs/ASSET_PLAN.md`** : plan des assets restants (échoppe, observatoire 3D, verger, booster,
   décors par lieu) et leur statut.
6. **Motion** : récompense de quête validée (pièces + XP), ouverture des lanternes de l'observatoire,
   toujours coupé par `prefers-reduced-motion`.
7. **Revue DA** de tous les écrans (skill `design-review`, sans son ping de télémétrie) à 375, 768, 1024
   et 1440 px.

---

## 5. Studio 3D : mémo

- Scènes : `apps/web/scripts/art/studio/scenes/*.js` (coin, chest, props, board, valley). Plateau
  commun et matières : `lib/stage.js`, `lib/textures.js`, `lib/coins.js`.
- Construire : `npm run art:studio --workspace apps/web -- <filtre>` (liste dans `studio/build.mjs`).
- Revue : `node apps/web/scripts/art/studio/sheet.mjs <scène> <sortie.png> '<[params]>'`.
- Chromium requis : sur Mac, `npx playwright install chromium`, ou `CHROMIUM_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Chaque nouvel asset : ajouter une ligne dans `docs/ASSET_REGISTRY.md`.

## 6. Points de vigilance

- Les unités école ne sont **jamais** additionnées, converties ni comparées aux pièces (ni en code, ni
  en texte).
- Toute valeur financière affichée vient du serveur ; ne jamais envoyer `seed`, `scenario` ou
  `marketPath` au client avant la fin d'une partie (test : `invest.e2e.test.ts`).
- Toute écriture au ledger passe par `recordWalletTransaction` (verrou `FOR UPDATE` + clé d'idempotence).
- Suivi de progression : indiquer l'avancement tous les ~25 % avec les minutes restantes (`CLAUDE.md`).
