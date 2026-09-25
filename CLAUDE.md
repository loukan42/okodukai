# Okodukai (anciennement MoneyPocket / Family Wallet)

Les agents doivent aussi suivre `AGENTS.md`, qui liste tous les skills installés dans le repo et leurs déclencheurs d'utilisation autonome.

**Claude Code** : les mêmes skills sont exposés dans `.claude/skills/<nom>` par des liens symboliques vers
`.agents/skills/<nom>` (source unique, ne pas dupliquer). Les invoquer de soi-même selon les déclencheurs
d'`AGENTS.md`. Deux réserves : ne jamais exécuter le ping de télémétrie de l'étape 0 de `design-review` ;
les palettes/polices proposées par `ui-ux-pro-max` restent subordonnées à `docs/ART_BIBLE.md` (on n'en
garde que les checklists et les règles d'accessibilité). Après ajout d'un skill dans `.agents/skills/`,
créer le lien correspondant : `ln -s ../../.agents/skills/<nom> .claude/skills/<nom>`.

Portefeuille éducatif familial pour enfants de 8-12 ans (cœur 8-10), piloté par les parents.
Boucle produit : **gagner → choisir → dépenser → économiser → attendre → comprendre l'investissement.**

Le nom de produit "Okodukai" a remplacé "MoneyPocket" / "Family Wallet" en cours de projet — le repo
GitHub reste `loukan42/moneypocket` (le renommage du repo/dossier local est une action séparée, pas
encore faite ; ne pas la faire sans confirmation explicite). Dans le code, les identifiants techniques
(packages npm, DB, cookies) utilisent `okodukai`.

Spec produit complète fournie par l'utilisateur en début de projet (document "1. DOCUMENT PRODUIT" à
"144. NORTH STAR", + pasted_content design a5e1). Ce fichier n'en est qu'un résumé opérationnel : en cas
de doute sur une règle produit non résumée ici, redemander à l'utilisateur plutôt que d'inventer.

## Ce que ce n'est jamais

Pas une banque, pas un moyen de paiement, pas de produit financier réel. Les pièces virtuelles ne
s'achètent pas, ne se convertissent pas en euros, ne se transfèrent pas entre foyers. Aucune mécanique
pay-to-win. Aucun classement entre enfants (même frères et sœurs). Pas de streak punitive, pas de
notification culpabilisante ("tu ne t'es pas connecté !").

## Invariants techniques non négociables

- **Le serveur est l'autorité absolue** sur soldes, XP, boosters, cartes, validations, récompenses,
  permissions. Le client ne calcule jamais un gain, un résultat de booster ou un solde.
- **Wallet = ledger transactionnel**, jamais un simple `balance` stocké. Chaque mouvement est une
  `WalletTransaction` immuable (montant, signe, type, source, auteur, timestamp, raison, clé
  d'idempotence). Une correction crée une nouvelle transaction compensatoire, ne réécrit jamais l'ancienne.
- **Idempotence obligatoire** sur toute distribution de récompense (validation de quête, achat, ouverture
  de booster) pour empêcher double-clic / double validation / requête rejouée.
- **Isolation stricte par household** : un utilisateur du foyer A ne doit jamais pouvoir lire une
  ressource du foyer B. Vérifier l'appartenance au foyer sur chaque endpoint enfant/parent.
- **Deux monnaies séparées** : les "pièces" familiales (réelles dans l'économie du foyer) et les "unités
  école" du simulateur pédagogique (fictives, jamais convertibles entre elles, jamais liées à un
  vrai résultat financier).
- Ouverture de booster : transaction atomique côté serveur (vérifier propriété + non-ouvert, tirer les
  cartes via RNG serveur versionné, enregistrer, créditer les cartes, marquer ouvert). Deuxième appel
  sur un booster déjà ouvert = sans effet.
- Rôles : `parent` (et `parent_admin`), `child`. L'enfant ne peut jamais valider ses propres quêtes,
  créer des pièces, modifier des récompenses, ou voir les données d'un autre enfant/foyer.

## Ton et wording

Enfant : phrases courtes, jamais infantilisant, jamais culpabilisant. Préférer "Il te manque 20 pièces."
à toute formulation dramatisée. Ne jamais afficher d'équivalence pièces ↔ euros.
Parent : clair, précis, sans jargon gaming.
Copywriting général : jamais de ton "startup IA générique" (pas de "Embarquez dans une aventure unique").

## Direction artistique (résumé — voir pasted_content a5e1 pour le détail complet)

RPG familial moderne : émotion du RPG (quêtes, niveaux, coffre, raretés) modernisée avec une UX mobile
propre (grands espaces, grosses zones tactiles, typo lisible) — jamais une interface desktop 2004.
Deux expressions d'un même design system : enfant = RPG éducatif chaleureux ; parent = app familiale
premium sobre (jamais un dashboard SaaS générique). Interdiction du "AI slop" visuel et rédactionnel
(pas de dégradés violet/bleu génériques, pas de blobs, pas de mascotte 3D plastique, pas de copywriting
IA générique). Raretés cartes : ⚪ Commune, 🔵 Peu commune, 🟣 Rare, 🟡 Épique, 🌈 Légendaire — exprimées
par la matière/texture, pas seulement la couleur.

## Stack

Monorepo npm workspaces :
- `apps/api` — Node/TypeScript/Express/Prisma/PostgreSQL (docker-compose fournit `db`).
- `apps/web` — React/TypeScript/Vite, PWA mobile-first, français (i18n dès le départ, ne pas
  hardcoder les strings dans les composants).
- `packages/shared` — types/contrats partagés front/back.

Racine : `npm run db:up` (postgres via docker), `npm run db:migrate`, `npm run db:seed`,
`npm run dev:api`, `npm run dev:web`.

## Système de cartes : repris de "Heros de la classe" (github.com/loukan42/kidsgamebook)

Le design, l'UX et les animations du système de boosters/collection sont repris fidèlement de
`github.com/loukan42/kidsgamebook` (produit `herosdelaclasse.com`, même propriétaire) :
- `apps/web/src/components/BoosterOpenOverlay.tsx` — animation zoom/secousse/éclat/révélation,
  reprise de `CardOpenAnimation.tsx` de kidsgamebook.
- `apps/web/src/components/AlbumCard.tsx` — carte d'album avec flip 3D en plein écran au clic,
  reprise de `CollectionCard.tsx`.
- Style visuel "cadre doré ornemental" dans `app.css` (`.gilded-*`, `.album-card-*`,
  `.booster-*`), classes `gilded-frame`/`gilded-inner`/`gilded-shine` etc.
- Le tirage RNG côté serveur, les raretés et l'anti-frustration restent propres à Okodukai
  (spec §42-43, §95-96) — **ne pas reproduire le pattern client de kidsgamebook** qui tire la
  carte côté client et écrit directement en base.

**Le contenu réel** (14 univers, 105 cartes) vient de la base Supabase de production de
kidsgamebook, pas du repo Git (les données n'y sont pas commitées) :
- `apps/api/prisma/data/kidsgamebook-{themes,cards}.csv` — export des tables
  `collection_themes`/`collection_cards`, commité (petit, texte).
- `apps/api/src/lib/kidsgamebookImport.ts` — importe ces CSV et les associe aux images locales
  par titre normalisé (accents/casse tolérés ; un titre "X, épique" fixe la rareté de la carte
  au lieu du cycle déterministe par défaut).
- **Les images** (~330 Mo, `apps/web/public/cards/<thème>/<carte>.png` et
  `apps/web/public/avatars/*.png`) sont copiées localement depuis les dossiers de l'utilisateur
  et **gitignorées** — elles doivent être re-copiées sur toute nouvelle machine avant de lancer
  `npm run db:seed`. Avant la mise en production il faudra un vrai stockage (S3, Supabase
  storage propre à Okodukai, ou Git LFS) : le hotlink direct vers le bucket Supabase de
  kidsgamebook a été écarté au profit de fichiers locaux propres à Okodukai.
- Les avatars enfant (`apps/web/src/components/Avatar.tsx`, `AVAILABLE_AVATARS`) viennent du
  même dossier utilisateur (fille/garçon/ninja/pirate/chevalier/etc., pas des emoji).

**Modèle économique non repris** : kidsgamebook vend les boosters avec des points (1pt/carte,
10pts/booster). Okodukai garde sa propre règle — **les boosters se gagnent uniquement via les
quêtes/paliers, jamais achetés** (spec §90) — confirmé explicitement par l'utilisateur.

## MVP (définition complète en §119 de la spec)

Household/parent/enfant → quêtes (créer/accepter/déclarer/valider) → wallet + historique →
boutique + achat/validation → objectif + coffre → XP/niveaux/badges → 3 univers de cartes +
boosters + album + doublons/maîtrise → sélection d'univers par le parent → premiers modules
éducatifs + simulateur simple → dashboard parent → notifications → responsive + PWA installable.

## Suivi de progression pendant le codage

Quand un LLM code une tâche demandée par l'utilisateur sur ce projet, il doit indiquer régulièrement
où il en est par rapport à la demande initiale — environ tous les 25% d'avancement (25%, 50%, 75%,
100%) — avec à chaque fois une estimation du temps restant en minutes.
