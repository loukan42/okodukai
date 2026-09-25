# Design system — Okodukai

Source de vérité exécutable : `apps/web/src/styles/tokens.css` et `apps/web/src/styles/app.css`.

## Fondations

`--ink`, `--ink-soft` et `--ink-faint` portent le texte ; `--parchment`, `--surface` et `--surface-raised` portent les plans. `--gold`, `--forest`, `--coral` et `--sky` n'expriment pas seuls un état : ajouter un mot, une icône ou un motif. Les cinq raretés ont des tokens et des styles de bordure. Espacements sur une grille 4/8/12/16/24/32/48 ; arrondis 10/16/24 ; trois ombres neutres ; durées 120/220/400 ms. Z-index réservés : navigation 40, dialogue 80, booster 100, carte 110.

Fraunces : titre de scène et de chapitre. Manrope : lecture, boutons, chiffres et formulaires. Éviter les capitales espacées pour les textes courants. Taille minimale de texte fonctionnel 13 px, cible 15–16 px.

## Composants

- `.game-panel` : panneau structurant à filet intérieur ; `.card` : formulaire ou contenu parent simple.
- `.wallet-hero` : solde et coffre avec chiffre lisible ; `CoinPill` : pièce custom et quantité avec nom accessible.
- `.quest-entry` : journal, état en texte, récompenses et CTA explicite.
- `.goal-panel` / `.progress-track` : progression numérique et graphique.
- `.reward-item` : boutique ; prix puis action d'achat.
- `.album-card`, `.gilded-*`, `.booster-*` : conserver l'ossature des cartes/booster existants et appliquer la rareté comme matière, jamais comme seul signal.
- `.btn-primary`, `.btn-gold`, `.btn-ghost`, `.btn-danger` : focus visible, état pressé, désactivé et tailles tactiles de 44 px ; `.btn-sm` réservé aux groupes denses côté parent.
- `.empty-state` : titre, raison et prochaine action possible.

## États et accessibilité

Chaque requête doit distinguer chargement, vide et erreur lorsqu'elle peut bloquer un parcours. Les actions ne changent pas seulement de couleur. Tout dialogue a un titre, un bouton de fermeture et un rôle. Le clavier peut ouvrir et quitter une carte ; le focus reste visible. Le mouvement respecte `prefers-reduced-motion`. Les soldes viennent du serveur ; l'UI ne simule jamais un gain.

## Règles de composition

La home enfant commence par identité + argent, puis objectif, quête active et booster. La home parent commence par une vue familiale, puis les validations. La navigation enfant garde cinq destinations avec pictogrammes SVG et texte ; « Apprendre » est accessible depuis la home et le coffre. Les grilles deviennent une colonne sur écran étroit ; le contenu reste dans une largeur de lecture limitée sur desktop.
