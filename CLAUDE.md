# Okodukai (anciennement MoneyPocket / Family Wallet)

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

## Référence réutilisée

`github.com/loukan42/kidsgamebook` contient un premier prototype de système de cartes/boosters
(React + Supabase). Utile comme référence d'animation d'ouverture de booster
(`src/components/CardOpenAnimation.tsx`, framer-motion) mais son modèle de données est naïf (le
client tire la carte au hasard et écrit directement en base) — **ne pas reproduire ce pattern**,
le tirage doit être recalculé côté serveur MoneyPocket avec raretés, anti-frustration et garanties
versionnées (voir spec §42-43, §95-96).

## MVP (définition complète en §119 de la spec)

Household/parent/enfant → quêtes (créer/accepter/déclarer/valider) → wallet + historique →
boutique + achat/validation → objectif + coffre → XP/niveaux/badges → 3 univers de cartes +
boosters + album + doublons/maîtrise → sélection d'univers par le parent → premiers modules
éducatifs + simulateur simple → dashboard parent → notifications → responsive + PWA installable.
