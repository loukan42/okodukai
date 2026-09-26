# Design system — Okodukai

Source de vérité exécutable : `apps/web/src/styles/tokens.css` et `apps/web/src/styles/app.css`.

## Fondations

`--ink`, `--ink-soft` et `--ink-faint` portent le texte ; `--parchment`, `--surface` et `--surface-raised` portent les plans. `--gold`, `--forest`, `--coral` et `--sky` n'expriment pas seuls un état : ajouter un mot, une icône ou un motif. Les cinq raretés ont des tokens et des styles de bordure. Espacements sur une grille 4/8/12/16/24/32/48 ; arrondis 10/16/24 ; trois ombres neutres ; durées 120/220/400 ms. Z-index réservés : navigation 40, dialogue 80, booster 100, carte 110.

Fraunces : titre de scène et de chapitre. Manrope : lecture, boutons, chiffres et formulaires. Éviter les capitales espacées pour les textes courants. Taille minimale de texte fonctionnel 13 px, cible 15–16 px.

## Composants

- `.game-panel` : panneau structurant à filet intérieur ; `.card` : formulaire ou contenu parent simple.
- `.wallet-hero` : solde et coffre avec chiffre lisible ; `CoinPill` : la vraie pièce Okodukai (rendu 3D `CoinArt`) et la quantité, avec un nom accessible.
- `.quest-entry` : journal, état en texte, récompenses et CTA explicite.
- `.goal-panel` / `.progress-track` : progression numérique et graphique.
- `.reward-item` : boutique ; prix puis action d'achat.
- `.album-card`, `.gilded-*`, `.booster-*` : conserver l'ossature des cartes/booster existants et appliquer la rareté comme matière, jamais comme seul signal.
- `.btn-primary` (bleu nuit), `.btn-gold` et `.btn-quest` (or frappé, reflet qui balaie une fois au survol), `.btn-ghost` (papier), `.btn-danger` : des matières en pilule, avec biseau intérieur et ombres teintées en couches. Jamais d'ombre pleine décalée « tranche » ni de bordure seule. Focus visible, état pressé (`scale(0.97)`), désactivé, et 44 px de haut au minimum ; `.btn-sm` est réservé aux groupes denses côté parent. Une seule définition : `app.css`.
- `GameIcon` : pictogrammes Phosphor (`@phosphor-icons/react`), en duotone pour les objets et en gras pour les signes (flèche, validation, fermeture). Aucun pictogramme n'est dessiné à la main.
- `.nav-pill` : pastille active qui glisse d'un onglet à l'autre (framer-motion `layoutId`), dans la navigation enfant et les onglets de « Mon argent ».
- `.empty-state` : titre, raison et prochaine action possible.

## États et accessibilité

Chaque requête doit distinguer chargement, vide et erreur lorsqu'elle peut bloquer un parcours. Les actions ne changent pas seulement de couleur. Tout dialogue a un titre, un bouton de fermeture et un rôle. Le clavier peut ouvrir et quitter une carte ; le focus reste visible. Le mouvement respecte `prefers-reduced-motion`. Les soldes viennent du serveur ; l'UI ne simule jamais un gain.

## Règles de composition

La home enfant commence par identité + argent, puis objectif, quête active et booster. La home parent commence par une vue familiale, puis les validations. La navigation enfant garde cinq destinations avec pictogrammes et texte ; « Apprendre » est accessible depuis la home et le coffre. Les grilles deviennent une colonne sur écran étroit ; le contenu reste dans une largeur de lecture limitée sur desktop.
