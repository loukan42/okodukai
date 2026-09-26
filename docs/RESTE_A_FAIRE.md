# Reste à faire : passation (26 septembre 2026)

Point de reprise pour la prochaine session (locale ou cloud). Tout ce qui est listé comme **fait** est
sur `main`. Lire aussi `CLAUDE.md` (règles produit) et `AGENTS.md` (skills).

---

## 0. Reprendre en local

```bash
git pull origin main
npm install                 # dépendances ajoutées : three, express-async-errors, web-push
npm run db:up               # Postgres Docker (si pas déjà lancé)
npm run db:migrate          # applique les migrations (onboarding, coffre, placements, verger)
npm run db:seed             # recrée le foyer de démo « Famille Martin » (Emma 8-9, Lucas 10-12)
npm run dev:api             # API : http://localhost:4000 (santé : /health)
npm run dev:web             # site : http://localhost:5173
```

- En dev, le bouton **Démo** (en bas à droite) connecte en un clic un parent ou un enfant de démo.
- Tests API : `cd apps/api && set -a && . ./.env && set +a && npx vitest run` (68 tests, tous verts
  au 26/09). Types : `npx tsc --noEmit -p apps/api` et `npm run build --workspace apps/web`.
- Pour voir des relevés de placements sans attendre : reculer `startedAt` de la partie en base, par
  exemple `UPDATE "SimulationRun" SET "startedAt" = now() - interval '4 days' WHERE "childId" = '…';`.

## Où en est-on (26/09, fin de journée)

P1, P2 et P3 sont faits (détail dans chaque section). Ce qui reste demande le propriétaire :
- **Mise en production** de la branche `feat/p1-securite-solidite` (pas encore poussée) : `migrate deploy`
  appliquera les nouvelles migrations, dont le `DROP TABLE` des tables `Simulation{Scenario,Portfolio,Transaction}`
  (inutilisées). Vérifier aussi qu'un déploiement de prévisualisation de l'API ne vise pas la base de production.
- **Variables Vercel** : `PROXY_SECRET` (projets web et API), `CRON_SECRET`, `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (projet API). Voir §P1 et §P2 ci-dessous.
- ~~Stockage des images de cartes~~ : tranché le 26/09, WebP optimisés versionnés et servis par le site (voir
  `CLAUDE.md`), contenu importé à chaque déploiement de production.

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

Tranché le 26/09 : **visuel du booster** (on garde l'illustration dorée, habillée Okodukai : logo + ruban
d'univers) ; **boosters par univers** : le ruban porte le nom de l'univers (variante de couleur possible,
voir `ASSET_PLAN.md`).

Règle projet : pour tout choix entre deux éléments, **montrer les propositions** (images) et laisser
le propriétaire trancher. Le 26/09, le propriétaire a demandé d'avancer en autonomie et de trancher seul.

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

Suites faites le 26/09 :

1. **Limite par adresse** : le relais `apps/web/api/proxy.js` transmet l'adresse du visiteur signée
   (HMAC, `PROXY_SECRET`) ; l'API limite à 30 essais par 15 min et par adresse (connexion, sortie du mode
   enfant, PIN). **À faire par le propriétaire** : définir la même variable `PROXY_SECRET` (chaîne
   aléatoire) sur les projets Vercel web **et** API ; sans elle, pas de limite par adresse.
2. **Appareil familial** : la liste des profils et la connexion par PIN exigent un cookie signé posé quand
   un parent se connecte sur l'appareil (et rafraîchi par `/auth/me` : rien à refaire pour un parent déjà
   connecté). Un appareil jamais connecté en parent voit « Connectez-vous d'abord en tant que parent ».
3. L'XP de première répartition est donnée à la validation ; quand Q04 existera (P2.2), la donner
   après Q04 comme le prévoit `FINANCIAL_EDUCATION.md` §7.1.

### P2 : mission financière (compléments)

**Tout P2 est fait (26/09)** : 1 encarts T01-T46 (journal serveur, file de priorité) · 2 questions Q01-Q16
corrigées par le serveur, Q04 à l'onboarding, « Mon carnet » · 3 fiche support · 4 bilan final complet et « Mes
parties » · 5 versements programmés sous plafond parent · 6 vue parent (« Ce que {prénom} sait expliquer »,
dernier bilan, prochain échange, note assurance-vie) · 7 pause parentale · 8 « Tout ce que je possède » et « Mon mois
en pièces » · 9 niveau pédagogique · 10 argent de poche automatique (rattrapage idempotent) et cadeaux · 11 objectifs
reliés à la boutique (vérifié côté serveur) et réordonnables · 12 « Ton relevé est prêt. » (voir mise en service
ci-dessous). La liste d'origine est gardée pour mémoire.

**Mise en service des notifications (à faire par le propriétaire, projet API Vercel)** :
1. `npx web-push generate-vapid-keys`, puis variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et
   `VAPID_SUBJECT` (une URL ou un `mailto:` de contact). Sans ces clés, rien n'est envoyé (la pastille
   « Ton bilan est prêt » de l'app reste).
2. Variable `CRON_SECRET` (chaîne aléatoire) : Vercel Cron appelle `/internal/cron/statements` avec ce secret.
3. `apps/api/vercel.json` programme la tâche une fois par jour à 16 h 30 UTC (après le relevé de 17 h, avant
   20 h, heure de Paris). Sur l'offre gratuite Vercel, une tâche par jour au plus ; le rythme Rapide
   (4 relevés par jour) reste prévenu au plus une fois par jour, comme le demande la spec.

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

### P3 : direction artistique (fait le 26/09)

- **Ouverture de booster** refaite au niveau de la référence « summon » demandée par le propriétaire :
  ciel animé (canvas), cercle d'invocation, cristal à briser (3 touches ou appui long), annonce Épique /
  Légendaire avec bandeau, retournement carte par carte (rayons, onde, reflet holo, pluie d'étoiles),
  « Nouvelle ! » décidé par le serveur, récapitulatif, enchaînement des boosters, sons synthétisés
  coupables, vibrations. `components/booster/*`, `styles/booster.css`. Aperçu par rareté dans la barre
  Démo (rien n'est crédité).
- **Sachet de booster** : décision du propriétaire, on garde l'illustration dorée, habillée du logo et
  d'un ruban au nom de l'univers (`BoosterPack.tsx`). Pile de boosters dans la collection.
- **Boutique** : échoppe 3D (`scenes/shop.js`) en en-tête ; deux colonnes sur téléphone.
- **Parent** : bandeau vallée discret sur le tableau de bord. **États vides** illustrés (enfant).
- **Motion** : fête des quêtes validées (pièces qui volent, XP, booster), lanternes de l'observatoire.
- **Revue** à 375, 768 et 1280 px (captures Playwright) : collection en deux colonnes sur téléphone,
  cases à cocher des univers, libellés trop longs. `docs/ASSET_PLAN.md` liste les assets restants.

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
