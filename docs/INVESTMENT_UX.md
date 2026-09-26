# Investissement — expérience écran par écran

> Flux « Mes placements école » d'Okodukai : de l'accueil jusqu'à l'assurance-vie simulée, avec les paramètres parent.
>
> - Règles pédagogiques, déclencheurs `T..`, questions `Q..`, notions et XP : `FINANCIAL_EDUCATION.md`.
> - Moteur : `apps/api/src/lib/financeSim/` (`finsim-1.0.0`), `FINANCIAL_SIMULATION_ENGINE.md`, `INSURANCE_LIFE_SIMULATION.md`. **Pour tout chiffre ou toute mécanique, le moteur fait foi.**
> - Lieux et matières : `ART_BIBLE.md` (Investir = l'observatoire, variante crépuscule ; assurance-vie = le verger du temps long ; Apprendre = la bibliothèque de l'observatoire). Composants : `DESIGN_SYSTEM.md`.
>
> Ce document ne décrit aucune interface existante : il décrit un **but**, un **contenu** et des **mots**.

---

## Décisions ouvertes (à trancher par l'utilisateur)

Chaque décision est un choix A/B. **La recommandation est en gras.** Le reste du document suppose la recommandation.

| # | Sujet | A | B | Recommandation |
|---|---|---|---|---|
| D1 | Rythme RAPIDE | 1 rendez-vous par jour à 17 h révélant 12 mois (même vitesse : 1 an simulé par jour) | 4 rendez-vous par jour (8 h, 12 h, 16 h, 20 h), 3 mois chacun, comme dans le moteur actuel | **A** : 4 rendez-vous par jour, dont 2 pendant l'école et 1 le soir, invitent à vérifier en continu. |
| D2 | Navigation enfant | Remplacer l'onglet « Coffre » par « Mon argent » : Mon compte · Mon coffre · Mes placements. L'écran « Mon coffre » garde son nom. | Garder l'onglet « Coffre » ; les placements ne sont accessibles que depuis l'accueil et Mon coffre. | **A** : les trois lieux restent côte à côte, comme les comptes d'une banque. Cinq onglets au total. |
| D3 | Supports pour les 8-9 ans | Découverte progressive : Sécurisé et Entreprises d'abord, puis Prêter et Panier Monde après le premier bilan | Les 4 supports dès l'onboarding | **A** : le contraste « calme / bouge beaucoup » se comprend mieux à deux. |
| D4 | Capital de départ | Toujours 100 unités école (1 unité = 1 %) | Montant libre choisi par le parent | **A** : 100 fait le pont entre « unités » (8-9) et « % » (10-12). Le parent règle le plafond des versements. |
| D5 | Mon coffre | Aucun intérêt automatique. Seul existe le bonus d'épargne parental ponctuel, nommé comme tel. | Intérêts automatiques en pièces | **A** : sinon, des pièces réelles grandissent toutes seules et se confondent avec les placements école. |
| D6 | Assurance-vie côté enfant | Ne pas évoquer le décès ni le bénéficiaire. Une note au parent explique le vrai rôle. | Une fiche « Pourquoi « assurance » ? » à 12 ans, à lire avec un parent | **A** : sujet sensible à cet âge, et inutile pour comprendre le placement long. |
| D7 | Moment d'application d'un arbitrage | Au prochain relevé, à la valeur de ce relevé : l'opération est enregistrée à l'étape que révélera le prochain rendez-vous | Immédiatement, à la dernière valeur révélée | **A** : on apprend qu'on ne connaît pas le prix d'exécution, et on ne peut pas « réagir » dans la minute. Le moteur accepte les deux. |

---

## 0. Conventions

### 0.1 Tranches

« 8-9 » = niveau **Découverte**, « 10-12 » = niveau **Approfondi**. Le réglage parent « Niveau pédagogique » prime sur l'âge.

### 0.2 Nombres et unités

| Règle | 8-9 | 10-12 |
|---|---|---|
| Pièces | Entiers | Entiers |
| Unités école | Arrondies à l'unité : « 104 » (`formatUnitsFr(v, 0)`) | 2 décimales : « 104,30 » |
| Pourcentages | **Jamais** | 1 décimale, signe explicite : « +4,2 % » (`toPercent`) |
| Signe | Mots (« de plus », « de moins ») et flèches | « + » et « − » (U+2212). `formatUnitsFr` renvoie un tiret « - » : l'UI le remplace par « − » et ajoute « + ». |
| Nom de l'unité | « unités école » à la première mention sur un écran, ensuite « unités ». Jamais d'abréviation, jamais de symbole qui ressemble à une monnaie. | idem |
| Typographie | Espace insécable avant « : ; ? ! % » et entre le nombre et l'unité. Pluriel via `Intl.PluralRules('fr')` : « 1,50 unité », « 2 unités ». | idem |
| Interdit | « € », « euros » suivi d'un montant, toute conversion ou toute somme avec des pièces | idem |

**Toutes les valeurs, variations, frais, intérêts et comparaisons viennent du serveur**, qui les calcule avec le moteur. Le client formate et arrondit à l'affichage, mais ne recalcule jamais une différence.

### 0.3 Deux horloges

| Monnaie | Horloge | Exemples d'affichage |
|---|---|---|
| Pièces | Calendrier réel | « Aujourd'hui », « Hier », « mardi 14 octobre » |
| Unités école | Temps simulé (étapes mensuelles du moteur, `simulatedElapsed`) | 8-9 : « Année 2 de ta partie ». 10-12 : « Année 2 · mois 7 à 12 ». Jamais de nom de mois pour le temps simulé, pour éviter la confusion avec le calendrier. |
| Lien entre les deux | La date réelle du prochain rendez-vous (`clockState.nextRendezVousAt`) | « Prochain relevé : jeudi. » On affiche le jour, pas l'heure, sauf si le relevé tombe aujourd'hui (« Prochain relevé : aujourd'hui à 17 h »). |

Durée d'une partie (bornes du moteur : 24 à 120 mois) : **60 mois par défaut en 8-9, 120 mois en 10-12**. Le parent peut choisir « 5 ans » ou « 10 ans ».

### 0.4 Seuils de variation (pour choisir le wording)

Ils s'appliquent à la **performance de la période hors versements** (`PeriodSummary.performance`) :

| Catégorie | Seuil |
|---|---|
| stable | moins de 0,5 % en valeur absolue, ou variation arrondie de 0 unité en 8-9 |
| légère | de 0,5 % à 3 % |
| marquée | de 3 % à 10 % |
| forte | 10 % ou plus |

### 0.5 Hausse, baisse, stable : signaux et graphiques

- **Trois signaux redondants** : glyphe (▲ hausse, ▼ baisse, = stable), mot (« a monté », « a baissé », « presque pas bougé ») et nombre. La couleur est facultative et peu saturée. **La baisse n'est jamais en rouge** : le rouge est réservé aux erreurs. Hausse et baisse ont la même taille, la même graisse et la même place.
- **Aucune mise en scène** : pas de son, pas de particules, pas de chiffre qui défile, pas de « Touche pour découvrir ». Le nombre apparaît directement, avec un fondu de 220 ms au plus, supprimé si `prefers-reduced-motion`.
- **Échelle honnête** :
  - l'axe vertical inclut toujours la valeur de départ (ou le total versé), tracée en ligne de référence ;
  - l'amplitude affichée n'est jamais inférieure à ±10 % autour de cette référence, pour qu'une variation de 0,5 % ne ressemble pas à une chute ;
  - les points correspondent aux relevés, sans lissage qui cacherait une baisse ;
  - les étiquettes sont posées directement sur les courbes, sans légende séparée.
- **Alternative textuelle** : chaque graphique est accompagné d'une phrase-résumé et d'un tableau des relevés, accessible au lecteur d'écran.

### 0.6 Encart pédagogique (composant)

C'est le « feuillet de la bibliothèque », un encart dans la page. Il contient :
- une icône de livre et un titre, qui est le mot introduit s'il y en a un ;
- 1 à 3 phrases ;
- une ligne facultative « Dans la vraie vie… » ;
- deux actions : « J'ai compris » et « Plus tard ».

Il a le rôle `note`. Au plus un par écran, jamais bloquant. Les règles d'affichage et de file d'attente sont dans `FINANCIAL_EDUCATION.md` §5.1.

### 0.7 Métaphore visuelle générale

| Élément | Représentation | Règle |
|---|---|---|
| L'observatoire | Tour d'observation avec lunette, en **variante crépuscule** (`ART_BIBLE.md` §4). Depuis la tour, l'enfant regarde **quatre lieux de la vallée**, un par support. À l'intérieur, chaque support a son **instrument enregistreur** : un tambour où une plume trace la valeur. | Le tracé est un vrai graphique lisible. L'ornement reste autour du graphique, jamais dedans. |
| Le relevé | Une feuille tamponnée posée sur le pupitre de la tour. | Elle est déjà là quand l'enfant arrive. On ne la « révèle » pas. |
| L'atelier de l'observatoire | Un établi avec 4 casiers et une règle graduée de 0 à 100. | C'est le lieu des décisions (répartition, arbitrage). Matière chaude (papier, bois), contrairement à la nuit de la tour. |
| Les jetons d'étude | Jetons de verre ou de porcelaine bleu ciel (`#9fc3c8`), gravés d'une étoile. | **Jamais d'or ni de trou carré** : ils sont réservés à la pièce Okodukai. |
| Les quatre lieux | Sécurisé = la tour de garde en pierre · Prêter = le pont en construction · Panier Monde = le marché aux mille échoppes · Entreprises = trois ateliers d'artisans | Emblèmes SVG monolignes dans le style de `GameIcon`, lisibles à 32 px. |
| Le risque | Une aiguille qui balance, avec 5 crans. Plus le niveau monte, plus l'arc est large, avec un remplissage texturé cran par cran. | Jamais de tête de mort, d'éclair, de flamme ou de rouge. |
| Le verger du temps long | Jeunes arbres qui grandissent lentement, avec des saisons (`ART_BIBLE.md` §1). | Une mauvaise année est un **hiver**, pas un arbre mort. Le verger ne doit pas faire croire que tout pousse à coup sûr. |
| La bibliothèque | Livres et cartes du ciel. Le carnet de l'enfant y est rangé. | Les encarts lus y sont archivés. |
| Le décor | Il reste calme quelle que soit la valeur. | Pas de ciel qui s'assombrit quand ça baisse, pas de soleil qui brille quand ça monte. |

### 0.8 Les quatre supports

Les codes sont ceux du moteur (`supports.ts`). Le risque 1-5 est le `riskLevel` du moteur.

| Code | Nom affiché | Vrai mot (10-12) | Lieu | Risque | Phrase 8-9 | Phrase 10-12 | Dans la vraie vie (10-12) |
|---|---|---|---|---|---|---|---|
| `SECURISE` | Sécurisé | épargne sécurisée | La tour de garde | 1 | « Ta part est gardée à l'abri. Elle grandit tout doucement et ne baisse pas. » | « Ta part grandit lentement et régulièrement. Dans ce jeu, elle ne baisse pas avec les marchés : seuls les frais peuvent la faire très légèrement reculer. » | « Cela ressemble à un livret d'épargne, ou au « fonds en euros » d'une assurance-vie. » |
| `PRETER` | Prêter | obligations | Le pont en construction | 2 | « Tu prêtes tes unités à une ville imaginaire. Elle te les rend plus tard, avec un petit supplément. » | « Tu prêtes à des villes et à des entreprises imaginaires. Elles te remboursent avec des intérêts. Sa valeur bouge un peu. » | « Un prêt qu'on peut acheter et revendre s'appelle une obligation. » |
| `MONDE` | Panier Monde | fonds | Le marché aux mille échoppes | 4 | « Un panier avec un tout petit morceau de très nombreuses entreprises. » | « Un panier qui contient une petite part de très nombreuses entreprises du monde entier. Quand certaines baissent, d'autres peuvent monter. » | « Cela ressemble à un fonds qui suit un indice mondial. » |
| `ENTREPRISES` | Entreprises | actions | Trois ateliers d'artisans | 5 | « Tu as un morceau de quelques entreprises imaginaires. Leur valeur peut beaucoup bouger. » | « Tu possèdes une petite part de quelques entreprises imaginaires. Si elles réussissent, ta part peut monter ; si elles ont des difficultés, elle peut baisser fortement. » | « Une petite part d'une entreprise s'appelle une action. » |

Les entreprises sont toujours **imaginaires**, issues de la vallée : la Forge, la Verrerie, le Moulin. Aucune vraie marque, aucun vrai code boursier.

### 0.9 Échelle de risque

| Niveau | Mot 8-9 | Phrase 10-12 | Libellé accessible |
|---|---|---|---|
| 1 | Très calme | « Niveau 1 sur 5 : la valeur varie très peu. » | « Niveau de risque 1 sur 5 » + phrase |
| 2 | Calme | « Niveau 2 sur 5 : la valeur varie un peu. » | idem |
| 3 | Ça bouge | « Niveau 3 sur 5 : la valeur peut varier. » | idem |
| 4 | Ça bouge beaucoup | « Niveau 4 sur 5 : la valeur peut varier fortement. » | idem |
| 5 | Ça bouge très fort | « Niveau 5 sur 5 : la valeur peut varier très fortement, vers le haut comme vers le bas. » | idem |

- Phrase d'explication commune, affichée sous l'échelle : « Plus le niveau est élevé, plus la valeur peut varier fortement. Cela ne dit pas si elle va monter ou baisser. »
- **Jamais** : « meilleur rendement », « rapporte plus », « dangereux », « risqué ! ».
- Le niveau de risque **d'une répartition** (`portfolioRiskLevel`) s'affiche dans l'atelier : un mélange peut tomber à un niveau qu'aucun support n'a seul. C'est la diversification rendue visible.

---

## 1. Carte des écrans

| ID | Écran | Accès | Tranche | Condition (palier, voir `FINANCIAL_EDUCATION.md` §4.3) |
|---|---|---|---|---|
| E1 | Accueil (l'argent d'abord) | Onglet Accueil | toutes | — |
| E2 | Mon argent et « Tout ce que je possède » | Onglet « Mon argent » (D2) | toutes (« Tout ce que je possède » en 10-12) | — |
| E3 | Porte de l'observatoire | Mon argent → Mes placements | toutes | Placements désactivés ou pas encore débloqués |
| E4 | Onboarding du capital école | Première entrée dans l'observatoire | toutes | F3 |
| E5 | Découverte des supports | Onboarding, bibliothèque | toutes | F3 |
| E6 | Atelier de répartition | Onboarding, bilan (8-9, F4), arbitrage (10-12) | toutes | F3 |
| E7 | Observatoire « Mes placements » | Accueil, Mon argent | toutes | Onboarding validé |
| E8 | Fiche support | E7, E5 | toutes | F3 |
| E9 | Mon bilan | Pastille « Ton bilan est prêt », E7 | toutes | Un relevé non lu |
| E10 | Arbitrage | E7, E8, E9 | 10-12 | F6 |
| E11 | Versements programmés | E7 | 10-12 | F8 |
| E12 | Ce que coûtent les frais | E7, bilan annuel | 10-12 | F7 |
| E13 | La liste du marché (inflation) | Bilan annuel, E7 | 10-12 | F7 |
| E14 | L'effet boule de neige (capitalisation) | Bilan annuel, E8 (Sécurisé, Prêter) | 10-12 | F7 |
| E15 | Horizon | E8, T41 | toutes (sans le mot en 8-9) | F3 |
| E16 | Fin de partie | Dernier relevé de la partie | toutes | Horizon atteint |
| E17 | Le verger du temps long (assurance-vie) | E7 | 10-12 | F9 |
| P1 | Paramètres parent « Épargne et placements » | Espace parent → profil enfant | parent | — |
| P2 | Vue parent des placements | Espace parent → profil enfant | parent | Placements activés |

---

## 2. E1 — Accueil : l'argent d'abord

**But.** En 2 secondes, l'enfant sait combien il a, où c'est, ce qui a bougé récemment et ce qu'il peut faire. Les quêtes, le niveau et les boosters viennent **après** l'argent.

**Ordre des blocs.**
1. Mon compte : le chiffre le plus grand de l'écran.
2. Trois actions.
3. Mon coffre et l'objectif actif.
4. Mes placements école (si débloqués).
5. Derniers mouvements (pièces seulement).
6. Puis l'existant : niveau et XP, journal de quêtes, inventaire de boosters.

**Microcopies.**

| Élément | 8-9 | 10-12 |
|---|---|---|
| Titre du bloc compte | « Mon compte » | « Mon compte » |
| Solde | « J'ai {n} pièces » | « {n} pièces », sous-titre « Solde disponible » |
| Sous-ligne | Dernier mouvement : « Hier : +15 · Quête « Mettre la table » » | « Cette semaine : Entrées +{e} · Sorties −{s} » (transferts exclus) |
| Actions | « Gagner » · « Mettre de côté » · « Découvrir » | « Gagner » · « Mettre de côté » · « Mes placements » |
| Coffre | « Dans Mon coffre : {n} pièces » | « Mon coffre : {n} pièces » |
| Objectif en cours | « {titre} : il te manque {m} pièces. » | « {titre} : {présent} sur {cible} · il te manque {m} » |
| Objectif atteint | « {titre} : objectif atteint. » | idem |
| Placements | « Mes placements école : {v} unités école » | « Mes placements école : {v} unités école » |
| Variation | « ▲ Plus qu'au départ ({départ}) » · « ▼ Moins qu'au départ ({départ}) » · « = Comme au départ » | « Depuis le départ : {±gain} » (+ « ({±perf}) » si pas de versement) · « Dernier relevé : {±d} ({±p}) » |
| Temps | « Prochain relevé : {jour} » | idem |
| Bilan non lu | « Ton bilan est prêt. » (seule pastille autorisée) | idem |
| Lien patrimoine | — | « Tout ce que je possède » |
| Derniers mouvements | « Récemment », 3 lignes | « Derniers mouvements », 5 lignes |

En 10-12, le bloc placements montre aussi un mini-tracé (échelle honnête, §0.5) et une barre de répartition en 4 segments texturés.

**Destination de « Découvrir » (8-9).**

| Situation | Va vers |
|---|---|
| Placements désactivés par le parent | La bibliothèque (modules et carnet) |
| Observatoire pas encore débloqué | E3, avec la condition de déblocage |
| Onboarding pas fait | E4 |
| Bilan non lu | E9 |
| Sinon | E7 |

**États.**

| État | Texte |
|---|---|
| Chargement | « Ton espace se prépare… » |
| Erreur | « Impossible d'afficher ton argent pour l'instant. Il n'a pas bougé. » + « Réessayer » |
| Compte à 0 | « J'ai 0 pièce » + « Les quêtes te permettent de gagner des pièces. » |
| Coffre vide | « Mon coffre est vide pour l'instant. » + action « Mettre de côté » |
| Pas d'objectif | « Choisis un objectif pour ton coffre. » |
| Placements désactivés | Bloc absent. Pas de teaser, pas de cadenas. |
| Placements verrouillés | « Mes placements école — s'ouvrent quand tu auras mis des pièces dans Mon coffre. » (une ligne, sans animation) |
| Onboarding à faire | « Tu as 100 unités école à répartir. » + « Commencer » |
| Avant le premier relevé | « Premier relevé : {jour}. » |
| Observatoire en pause | « L'observatoire est en pause. » |

**Métaphore visuelle.** Le campement (`ART_BIBLE.md`) avec la zone calme réservée derrière le solde. La bourse de cuir illustre Mon compte, le coffre du campement Mon coffre, et une petite vignette crépuscule de la tour les placements.

---

## 3. E2 — Mon argent et « Tout ce que je possède »

**But.** Réunir les trois lieux comme les comptes d'une banque, et montrer le patrimoine en 10-12 sans jamais additionner les deux monnaies.

**Structure (recommandation D2-A).** Trois onglets : « Mon compte » · « Mon coffre » · « Mes placements ». Le troisième n'apparaît que si les placements sont activés. Mon compte et Mon coffre suivent les recommandations de `FINANCIAL_EDUCATION.md` §11 (historique, transferts, règles, objectifs). Une vue « Tout mon argent » combine l'historique en pièces des deux premiers lieux : les transferts y apparaissent sur une ligne sans signe.

**Tout ce que je possède (10-12 uniquement).**

```
Tout ce que je possède

En pièces — pour utiliser en famille
  Mon compte                         82
  Mon coffre                        120
  Total en pièces                   202

En unités école — pour apprendre
  Mes placements                 104,30
  Le verger (assurance-vie)       58,10
  Capital école pas encore placé  40,00
  Total en unités école          202,40
```

| Élément | Texte |
|---|---|
| Titre | « Tout ce que je possède » |
| Groupe 1 | « En pièces — pour utiliser en famille » |
| Groupe 2 | « En unités école — pour apprendre » |
| Note fixe, toujours visible | « Ces deux totaux ne s'additionnent pas : ce ne sont pas les mêmes unités. Les unités école ne deviennent jamais des pièces. » |
| Encart | T44 (patrimoine) |

**Interdit.** Un total général, un camembert qui mélange les deux groupes, un mot comme « fortune ».

---

## 4. E3 — Porte de l'observatoire

**But.** Dire clairement pourquoi l'observatoire est fermé et comment il s'ouvre, sans frustration ni teasing.

| État | 8-9 | 10-12 |
|---|---|---|
| Désactivé par le parent | « Mes placements école ne sont pas ouverts pour l'instant. Tes parents peuvent les activer. » | idem |
| Verrouillé (F3) | « L'observatoire s'ouvre quand tu as mis des pièces dans Mon coffre au moins une fois. » + « 0 sur 1 » + action « Mettre de côté » | idem |
| Q02 pas encore réussie | Q02 posée ici | idem |
| Déblocage | « L'observatoire est ouvert. Tu vas y apprendre à placer des unités école. » + « Entrer » | « L'observatoire est ouvert. Tu vas y apprendre à placer et à répartir. » + « Entrer » |
| En pause (parent) | « L'observatoire est en pause. Rien ne bouge jusqu'à sa réouverture. » | idem |

**Visuel.** Au déblocage, les lanternes de la tour s'allument (400 ms au plus, supprimé si mouvement réduit). Pas de coffre au trésor qui s'ouvre, pas d'éclat.

---

## 5. E4 — Onboarding du capital école

**But.** En moins de 3 minutes, faire vivre dans l'ordre : « Tu as 100 unités à répartir » → « il existe plusieurs types de supports » → répartir → valider. Et ancrer l'idée que **les unités école ne sont pas des pièces**.

**Règles.**
- 6 étapes, indicateur « Étape {n} sur 6 ». Retour possible. On peut quitter et reprendre au même endroit.
- **Rien n'est pré-rempli.** Aucun support n'est « conseillé ».
- La validation est idempotente (clé fournie par le client). Elle crée le versement initial (`VERSEMENT` à l'étape 0 avec la répartition).

| Étape | 8-9 | 10-12 |
|---|---|---|
| O1 · Titre | « Tu as 100 unités école à répartir. » | « Tu as 100 unités école à répartir. » |
| O1 · Texte | « Ce ne sont pas tes pièces. Elles servent à apprendre. Si elles baissent, tes pièces ne bougent pas. » | « Les unités école servent à apprendre à placer. Elles ne s'achètent pas, ne se dépensent pas et ne deviennent jamais des pièces. » |
| O1 · Visuel | 10 jetons d'étude sur l'établi : « 10 jetons de 10 unités » | idem, avec la règle graduée 0-100 : « 100 unités = 100 % » |
| O1 · Bouton | « D'accord » | « D'accord » |
| O2 · Titre | « Il existe plusieurs types de supports. » | « Il existe plusieurs types de supports. » |
| O2 · Texte | « Un support, c'est un endroit où tu places tes unités. Chacun bouge à sa façon : certains très peu, d'autres beaucoup. » (D3-A : « Tu en découvres deux pour commencer. ») | « Un support, c'est un type de placement. Chacun a sa façon d'évoluer et son niveau de risque. » |
| O2 · Bouton | « Voir les supports » | « Voir les supports » |
| O3 | E5 intégré : cartes des supports. L'enfant peut en ouvrir une ; rien n'est obligatoire. Bouton « Répartir mes unités ». | idem |
| O4 | E6 : l'atelier. | E6 |
| O5 · Titre | « Ta répartition » | « Ta répartition » |
| O5 · Contenu | Liste « Sécurisé : 40 unités · Entreprises : 60 unités » + risque de la répartition (mot) | Liste avec % et unités + « Niveau de risque de ta répartition : {n} sur 5 » + T43 (allocation) |
| O5 · Rappel | « Rien ne bouge avant le premier relevé, {jour}. Tu pourras changer ta répartition lors d'un bilan. » | « Rien ne bouge avant le premier relevé, {jour}. Tu pourras la changer plus tard : cela s'appellera un arbitrage. » |
| O5 · Boutons | « Valider ma répartition » · « Modifier » (même poids) | idem |
| O6 · Vérification | Q04 (« Ton placement école a baissé. Et tes pièces ? ») | Q04 |
| O6 · Fin | « Ta répartition est enregistrée. Premier relevé : {jour}. D'ici là, rien ne bouge. » + « +20 XP · Première répartition » | idem |
| O6 · Boutons | « Voir l'observatoire » · « Retour à l'accueil » | idem |

**États.**

| État | Texte |
|---|---|
| Échec de validation | « Ta répartition n'a pas été enregistrée. Rien n'a changé. Réessaie. » |
| Reprise après une interruption | « On reprend là où tu t'étais arrêté. » |
| Placements désactivés pendant l'onboarding | Retour à E3 (désactivé). La répartition n'est pas enregistrée. |

---

## 6. E5 — Découverte des supports

**But.** Donner une image, une phrase et un niveau de risque à chaque support avant d'y placer quoi que ce soit.

**Carte d'un support.**
- Emblème du lieu (§0.7) et nom.
- Phrase de la tranche (§0.8).
- Risque : crans et mot (8-9) ou phrase (10-12).
- 10-12 : vrai mot (« Prêter · obligations ») et « Durée de placement recommandée » (§E15).

**Détail d'une carte, avant tout placement.**

| Bloc | 8-9 | 10-12 |
|---|---|---|
| Comment il bouge | Aiguille de risque animée avec l'amplitude du niveau (supprimée si mouvement réduit) | idem + tracé schématique étiqueté « Illustration, pas des vraies valeurs » |
| Dans la vraie vie | « Dans la vraie vie, on peut aussi prêter de l'argent, ou acheter un petit morceau d'une entreprise. » (sans vrai mot) | La ligne « Dans la vraie vie » du support (§0.8) + T42 |
| Action | « Retour » | « Retour » |

**Découverte progressive (D3-A, 8-9).** Après le premier bilan lu, un encart annonce : « Deux nouveaux lieux sont visibles depuis l'observatoire : Prêter et Panier Monde. Tu pourras y placer des unités au prochain bilan. »

**Ordre d'affichage.** Toujours Sécurisé, Prêter, Panier Monde, Entreprises, c'est-à-dire par risque croissant. Cet ordre est neutre : il ne recommande rien.

---

## 7. E6 — Atelier de répartition

**But.** Répartir 100 % sans pouvoir faire d'erreur de total, voir le risque de sa répartition, et rencontrer la notion de diversification si l'on met tout au même endroit.

**Mécanique.**

| | 8-9 | 10-12 |
|---|---|---|
| Unité de manipulation | 1 jeton = 10 unités (moteur : entier multiple de 10) | Pas de 5 % (moteur : entiers de 0 à 100) |
| Contrôle par support | Boutons « − » / « + » de 44 px, compteur « {n} jetons · {n×10} unités » | Boutons « − » / « + » et curseur ; affichage « {p} % · {u} unités » |
| Ce qui reste à placer | Plateau « À placer : {n} unités » | Segment hachuré « À placer » dans la jauge |
| Jauge du total | Règle graduée : « Total : {placé} sur 100 » | Barre empilée texturée par support + « Placé : {a} % · À placer : {b} % · Total : 100 % » |
| Risque de la répartition | Aiguille + mot (« Ta répartition : ça bouge ») | « Niveau de risque de ta répartition : {n} sur 5 » (`portfolioRiskLevel`) |

**Microcopies.**

| Élément | 8-9 | 10-12 |
|---|---|---|
| Titre | « Répartis tes 100 unités. » | « Répartis ton capital. » |
| Libellé accessible des boutons | « Ajouter 10 unités à Prêter », « Retirer 10 unités de Prêter » | « Ajouter 5 % à Prêter », « Retirer 5 % de Prêter » |
| Bouton désactivé | « Place encore {n} unités » | « Il reste {b} % à placer » |
| Bouton actif | « Continuer » | « Continuer » |
| Maximum atteint | « Tout est déjà placé. Retire d'abord des unités d'un autre support. » | « Tout est placé. Retire d'abord une part d'un autre support. » |
| Tout sur un support autre que Sécurisé | T20, au-dessus du bouton, qui **reste actif** | T20 |
| Tout sur Sécurisé | T21 | T21 |
| Forte baisse pendant la période (arbitrage) | T28 en haut | T28 |

**Interdits.** Répartition par défaut, bouton « Répartir à parts égales » pendant l'onboarding, badge « conseillé », mise en avant d'un support, validation bloquée par un choix concentré.

**Métaphore.** L'établi. Les jetons glissent dans les casiers (120 ms, supprimé si mouvement réduit). La règle graduée se remplit par textures, pas seulement par couleur.

---

## 8. E7 — Observatoire « Mes placements »

**But.** Savoir en un regard ce que vaut son portefeuille, comment il a évolué depuis le départ et depuis le dernier relevé, comment il est réparti et quand aura lieu le prochain relevé.

**Contenu 8-9.**

| Bloc | Contenu |
|---|---|
| En-tête | « Mes placements école » · « Année {n} de ta partie · Prochain relevé : {jour}. Rien ne bouge d'ici là. » |
| Valeur | « {v} unités école » (grand chiffre) |
| Depuis le départ | « Au départ : 100 · Maintenant : {v} » + « ▲ {d} de plus » / « ▼ {d} de moins » / « = Pareil » |
| Dernier relevé | « Depuis le dernier relevé : ▲ {d} de plus » (ou ▼ / =) |
| Supports | Une ligne par support placé : emblème, nom, « {u} unités », ▲▼= et mot depuis le dernier relevé, crans de risque |
| Les 5 derniers relevés | Suite de valeurs fléchées : « 100 → 103 ▲ → 101 ▼ → 104 ▲ → 104 = ». C'est un premier pas vers le graphique. |
| Actions | « Mon dernier bilan » · « La bibliothèque » · « Changer ma répartition » (seulement dans un bilan, F4) |

**Contenu 10-12.**

| Bloc | Contenu |
|---|---|
| En-tête | « Mes placements école » · « Année {n} sur {N} · Prochain relevé : {jour} » |
| Valeur | « {v} unités école » |
| Depuis le départ, sans versement | « Depuis le départ : {±gain} ({±perf}) » |
| Depuis le départ, avec versements | « Versé : {versé} · Valeur : {v} · Différence : {±gain} » + « Performance du placement : {±perf} » (indice de performance du moteur, hors versements) |
| Dernier relevé | « Dernier relevé : {±d} ({±p}) » |
| Tracé | Plages « Depuis le départ » et « 12 derniers mois simulés ». Marques ◆ versement et ⇄ arbitrage. Ligne de référence « Versé ». Échelle honnête (§0.5). |
| Répartition | Barre empilée texturée + tableau : support · part actuelle (%) · part choisie (%) · valeur · dernier relevé · risque |
| Frais | « Frais depuis le départ : −{f} » → E12 |
| Pouvoir d'achat | « En pouvoir d'achat du départ : {realValue} » → E13 (après T35) |
| Changement prévu | « Changement prévu au relevé de {jour} : … » + « Modifier » · « Annuler » |
| Capital école pas encore placé | « Capital école pas encore placé : {r} » → E11 (si versements activés) |
| Actions | « Changer ma répartition » (F6) · « Versements » (F8) · « Mes bilans » · « Le verger » (F9) · « La bibliothèque » |

**États.**

| État | 8-9 | 10-12 |
|---|---|---|
| Avant le premier relevé | « Ta répartition est prête. Le premier relevé aura lieu {jour}. D'ici là, rien ne bouge. » | idem |
| Relevé en préparation (le rendez-vous est passé mais le calcul n'est pas prêt) | « Le relevé de {jour} est en préparation. Reviens un peu plus tard. » | idem |
| Erreur de chargement | « Impossible d'afficher tes placements pour l'instant. Tes unités école n'ont pas bougé. » + « Réessayer » | idem |
| Visites répétées | T29 en haut | T29 |
| Pause | « L'observatoire est en pause. Rien ne bouge jusqu'à sa réouverture. » | idem |
| Partie terminée | « Ta partie est terminée. » + « Voir mon bilan final » | idem |

**Interdits.** Rafraîchissement par glissement, horodatage à la seconde, compteur « il y a 3 min », bouton « Actualiser ».

---

## 9. E8 — Fiche support

**But.** Comprendre un support à partir de sa propre part : ce qu'elle vaut, comment elle a bougé, quel est son risque, et comment ça s'appelle dans la vraie vie.

| Bloc | 8-9 | 10-12 |
|---|---|---|
| En-tête | Emblème, nom, lieu (« La tour de garde ») | Nom · vrai mot (« Entreprises · actions ») |
| Ta part | « Tu as {u} unités école ici. » | « Ta part : {u} unités école · {p_act} % de ton portefeuille (choisi : {p_cible} %) » |
| Évolution | « Depuis le dernier relevé : ▲ {d} de plus » + 5 derniers relevés | « Depuis le départ : {±d} ({±p}) · Dernier relevé : {±d2} ({±p2}) » + tracé du support |
| Risque | Crans + mot + phrase commune (§0.9) | Crans + phrase 10-12 |
| Explication | Phrase 8-9 (§0.8) | Phrase 10-12 (§0.8) |
| Pour attendre combien de temps | Sablier : « Pour attendre : un peu / longtemps » | « Durée de placement recommandée : {durée} (dans ce jeu) » → E15 |
| Frais | — | « Frais de gestion : {taux} % par an, retirés un peu chaque mois. » |
| Dans la vraie vie | Phrase simple, sans vrai mot | Ligne du support (§0.8) + T42 |
| Historique du support | — | Versements, arbitrages et frais de ce support, par année simulée |
| Actions | « Retour » | « Changer ma répartition » (F6) · « Retour » |

**Durées recommandées dans ce jeu** (à aligner avec le moteur) :

| Support | Durée |
|---|---|
| Sécurisé | à tout moment |
| Prêter | 2 ans ou plus |
| Panier Monde | 5 ans ou plus |
| Entreprises | 5 ans ou plus |

**États.**

| État | Texte |
|---|---|
| Support non détenu | « Tu n'as pas d'unités ici pour l'instant. » + le reste de la fiche |
| Aucune baisse vécue après 6 relevés (`FINANCIAL_EDUCATION.md` §4.5) | Bloc « Dans l'histoire de la vallée » avec une baisse passée, étiquetée comme telle |

---

## 10. E9 — Relevé et « Mon bilan »

**But.** Le rendez-vous : voir ce qui a changé, comprendre une chose, éventuellement décider, puis refermer, avec le sentiment que rien ne presse.

**Entrée.** La pastille « Ton bilan est prêt. » sur l'accueil et sur l'observatoire, ou la notification facultative « Ton relevé est prêt. ».

**Structure (8-9 : blocs 1 à 4 et 7 à 9 ; 10-12 : tous).**

| # | Bloc | 8-9 | 10-12 |
|---|---|---|---|
| 1 | Titre | « Ton bilan · Année {n} » + « Relevé du {jour réel} » | « Ton bilan · Année {n}, mois {a} à {b} » + date réelle |
| 1b | Après une absence | « Depuis ta dernière visite : {k} relevés. Voici ce qui a changé en tout. » | idem |
| 2 | Phrase principale | Wording §21.1, choisi selon le seuil (§0.4), à partir de `valueAtReveal` | idem |
| 3 | Par support | Wording §21.3, une ligne par support | Valeur, ▲▼= et variation absolue et % |
| 4 | Ce qui s'est passé | 1 encart contextuel (file de `FINANCIAL_EDUCATION.md` §5.1), ou un récit de la vallée s'il est fourni : « Dans la vallée, les ateliers ont eu moins de commandes cette saison. » Le récit explique le passé, il n'annonce jamais la suite. | idem |
| 5 | Mon année en chiffres (bilan annuel) | — | « Rendement de l'année : {±p} · Frais de l'année : −{f} · Intérêts reçus : +{i} · La liste du marché : {a} → {b} » avec liens vers E12, E13, E14 |
| 6 | Opérations appliquées | — | « Ton changement de répartition a été appliqué à ce relevé. » · « Versements de la période : +{v} » |
| 7 | Question d'observation (facultative) | « Quel support a le plus bougé cette fois ? » (réponse lisible sur l'écran) ou la vérification d'une notion en attente | idem |
| 8 | Décision (facultative) | Après F4 : « Veux-tu changer quelque chose ? Tu n'es pas obligé. » + « Garder ma répartition » · « Changer ma répartition » (**même poids visuel**) | idem (vers E10) |
| 9 | Clôture | « Prochain relevé : {jour}. Rien ne bouge d'ici là. » + « Fermer le bilan » | idem |

**Volet « Mon mois en pièces ».** Il s'affiche au premier bilan qui suit un changement de mois réel. C'est une carte séparée, à l'horloge réelle : « En {mois} : {e} pièces sont entrées, {s} sont sorties, {c} sont allées dans Mon coffre. » + la progression de l'objectif. Aucun jugement.

**À raconter (rendez-vous familial).** Au bilan annuel, ou tous les 4 relevés en 8-9 : « À raconter à tes parents : {question} ». Facultatif, sans XP.

**Liste « Mes bilans ».** Classée par année simulée. Chaque bilan est relisible. Les bilans non lus ne sont jamais présentés comme des « tâches en retard ».

**États.**

| État | Texte |
|---|---|
| Relevé en préparation | « Le relevé de {jour} est en préparation. Reviens un peu plus tard. » |
| Erreur | « Impossible d'afficher ce bilan pour l'instant. Rien n'a changé dans tes placements. » + « Réessayer » |
| Aucun bilan encore | « Ton premier bilan arrivera après le relevé de {jour}. » |

**Métaphore.** La feuille tamponnée sur le pupitre de la tour. En fermant le bilan, le tampon « Lu » se pose (220 ms au plus). Le ciel reste identique, que les valeurs montent ou baissent.

---

## 11. E10 — Arbitrage (10-12)

**But.** Changer sa répartition de façon réfléchie, en voyant son effet et ses frais, sans pouvoir réagir dans la minute (D7).

| Élément | Texte / contenu |
|---|---|
| Titre | « Changer ma répartition » · sous-titre « Arbitrage » (après T37 : le mot seul) |
| Colonnes | « Aujourd'hui » (part actuelle, qui dérive avec le marché) · « Après le changement » (nouvelle cible, pas de 5 %) · jauge « Total : 100 % » |
| Raccourci (après T38) | « Revenir à ma répartition choisie ({cible}) » : c'est le rééquilibrage. Il pré-remplit les cibles, l'enfant valide. |
| Risque | « Niveau de risque : {avant} sur 5 → {après} sur 5 » |
| Montant | « Le montant exact sera calculé au relevé de {jour}. » (le client ne calcule pas les montants) |
| Frais (si actifs) | « Frais d'arbitrage : {taux} % du montant déplacé, retirés au relevé. » (+ « {k} arbitrages gratuits par année simulée » si le moteur en prévoit) |
| Bouton | « Prévoir ce changement » |
| Confirmation | « Ton changement sera appliqué au prochain relevé, {jour}. Tu peux le modifier ou l'annuler d'ici là. » + T37 la première fois |
| Changement déjà prévu | « Un changement est déjà prévu pour {jour}. Tu peux le modifier ou l'annuler. » |
| Annulation | « Changement annulé. Ta répartition reste la même. » |
| Arbitrage désactivé par le parent | « Les changements de répartition se font lors des bilans. » |
| Forte baisse récente | T28 en haut, neutre, sans bloquer |
| Erreur | « Ton changement n'a pas été enregistré. Ta répartition n'a pas bougé. Réessaie. » |

**Interdits.** Bouton « Tout vendre », bouton « Tout sur Sécurisé » mis en avant, suggestion après une baisse (« Profite de la baisse »), compteur d'arbitrages, XP pour un arbitrage.

**Implémentation (D7-A).** L'opération `ARBITRAGE` est enregistrée à l'étape révélée par le prochain rendez-vous. Le moteur l'applique après le mouvement de marché de cette étape : `valueAtReveal` montre la valeur avant l'arbitrage, et `value` la valeur après.

---

## 12. E11 — Versements programmés (10-12)

**But.** Comprendre qu'ajouter un peu à intervalles réguliers fait grandir le **total versé**, et ne pas confondre ce qu'on a versé avec ce que le placement a produit.

**Source.** Le parent fixe un **plafond de capital école**, départ compris (moteur : `contributionCap` ; un versement au-delà est refusé avant d'être enregistré). « Capital école pas encore placé » = plafond − versé + retiré. L'enfant choisit un montant mensuel dans une liste courte (0, 5, 10 ou 20 unités) et une répartition. Opération moteur : `VERSEMENTS_PROGRAMMES`, appliquée à partir de l'étape suivante.

| Élément | Texte |
|---|---|
| Titre | « Versements programmés » |
| Explication | « Chaque mois simulé, tu peux ajouter des unités école de ton capital. Tu choisis combien et où elles vont. » |
| Capital restant | « Capital école pas encore placé : {r} unités » |
| Choix du montant | « Chaque mois : 0 · 5 · 10 · 20 unités » |
| Répartition | Atelier E6, avec le raccourci « Comme ma répartition actuelle » (qui ne sélectionne rien par défaut) |
| Confirmation | « À partir du prochain relevé, {n} unités seront ajoutées chaque mois simulé, selon cette répartition. » |
| Arrêt | « Arrêter les versements » → « Les versements s'arrêteront au prochain relevé. Tes placements continuent d'évoluer. » |
| Plafond atteint | « Tu as placé tout ton capital école : {p} unités. Les versements s'arrêtent. Tes placements continuent d'évoluer. » |
| Versements désactivés par le parent | Écran absent. Dans l'observatoire : aucun lien. |
| Ligne d'historique | « Versement programmé · +{n} unités · Année {a}, mois {m} » |
| Encarts | T39, T40 |

**Distinction obligatoire.** Partout où des versements existent, on affiche « Versé » et « Valeur » séparément. Le pourcentage affiché est la **performance hors versements** (indice du moteur), jamais « valeur / 100 ».

---

## 13. E12 — Ce que coûtent les frais (10-12)

**But.** Voir sur **sa propre histoire** ce que les frais ont coûté, en comparant son portefeuille à un jumeau sans frais (`compareWithAndWithoutFees`).

| Élément | Texte |
|---|---|
| Titre | « Ce que coûtent les frais » |
| Comparaison | « Avec frais (ton portefeuille) : {avec} » · « Sans frais (même histoire, sans frais) : {sans} » |
| Écart | « Les frais ont coûté {écart} unités école depuis le départ. » |
| Graphique | Deux courbes étiquetées directement, la courbe « sans frais » en pointillé. Même échelle honnête (§0.5). |
| Détail | « Frais de gestion : {g} · Frais sur versement : {e} · Frais d'arbitrage : {a} » (`FeesBreakdown`) |
| Explication | « Les frais de gestion paient ceux qui s'occupent du placement. Ils sont retirés un peu chaque mois, même quand le placement baisse. Petits chaque année, ils comptent sur la durée. » |
| Exemple (étiqueté) | « Exemple de calcul, pas une prévision. 100 unités qui grandiraient de 4 % chaque année pendant 10 ans : sans frais 148,02 ; avec 1 % de frais par an 133,87. » (`feeDragTable(100, 0.04, 0.01, 10)`) |
| Dans la vraie vie | « Les placements ont presque toujours des frais. Ils sont écrits dans des documents qu'on peut lire avant de choisir. » |
| Frais désactivés par le parent | « Dans ta partie, il n'y a pas de frais. Dans la vraie vie, il y en a presque toujours. » + l'exemple seul |
| Encart / question | T34 · Q09 |

---

## 14. E13 — La liste du marché : inflation et pouvoir d'achat (10-12)

**But.** Voir que les prix montent avec le temps et que ce qu'on peut acheter avec une somme dépend aussi des prix. Cet écran utilise l'indice des prix de la trajectoire (`priceIndex`, `priceAfterInflation`, `purchasingPower`, `realValue`).

**La liste du marché** : 5 objets imaginaires de la vallée, dont le total vaut 100 unités école au départ. Une miche de pain (8), un panier de pommes (12), une corde (20), une lanterne (30), un carnet relié (30). Le nom « panier » est interdit ici, pour ne pas confondre avec Panier Monde.

| Élément | Texte |
|---|---|
| Titre | « La liste du marché » |
| Prix | « Au début de ta partie, la liste coûtait 100 unités école. Aujourd'hui, elle coûte {b}. » + le prix d'avant et d'aujourd'hui pour chaque objet |
| Mot | T35 : « Quand la plupart des prix montent avec le temps, on parle d'inflation. » |
| Pouvoir d'achat | « Avec ton portefeuille, tu aurais pu acheter la liste {x} fois au départ. Aujourd'hui : {y} fois. » |
| Si le portefeuille grandit plus vite que les prix | « Ton portefeuille a grandi plus vite que les prix : ton pouvoir d'achat a augmenté. » |
| Si le portefeuille grandit moins vite que les prix | « Ton portefeuille a grandi moins vite que les prix : ton pouvoir d'achat a baissé. » |
| Sécurisé | « Ta part Sécurisé a grandi de {p1}. Les prix, de {p2}. » (T36) |
| Visuel | Les 5 objets sur un étal. Quand le pouvoir d'achat baisse, **l'objet qui ne rentre plus** apparaît en contour pointillé, avec la mention « Il manquerait {n} unités pour la lanterne ». |
| Garde-fou (toujours visible) | « Cela se passe dans la vallée de l'école. Les prix de la boutique familiale ne changent que si tes parents le décident. » |
| Question | Q10 |

Les 8-9 ans ne voient pas cet écran (limite d'âge).

---

## 15. E14 — L'effet boule de neige : capitalisation (10-12)

**But.** Voir, **dans le passé** de sa part Sécurisé ou Prêter, des intérêts qui rapportent à leur tour. Puis voir un exemple étiqueté, jamais appliqué à son propre portefeuille.

| Bloc | Texte / contenu |
|---|---|
| Titre | « L'effet boule de neige » |
| Mon histoire | Barres par année simulée, en trois couches : « Placé », « Intérêts », « Intérêts sur les intérêts » (ces valeurs doivent être fournies par le serveur) |
| Phrase | « Année 1 : ta part Sécurisé a reçu {i1} d'intérêts. Année 2 : elle a reçu des intérêts sur ce que tu avais placé **et** sur les {i1} de l'an dernier. Ces intérêts sur les intérêts : {ii}. C'est petit au début, puis ça grossit avec les années : c'est la capitalisation. » |
| Exemple (étiqueté) | « Exemple, pas une prévision : 100 unités à 4 % par an, exactement pareil chaque année (ce qui n'arrive jamais aussi régulièrement). » |
| Tableau d'exemple | Après 1 an : avec capitalisation 104,00 / sans 104 · 5 ans : 121,67 / 120 · 10 ans : 148,02 / 140 · 20 ans : 219,11 / 180 (`compoundInterestTable`, `simpleInterestTable`) |
| Question | Q11 |

**Interdit.** Tout curseur « Et si je laisse mon portefeuille 20 ans ? », toute projection de la valeur de l'enfant.

---

## 16. E15 — Horizon

**But.** Comprendre que la durée d'attente change ce que le risque veut dire, **sans promettre** qu'attendre fait monter.

| Élément | 8-9 | 10-12 |
|---|---|---|
| Frise de la partie | « Année {n} sur {N} » | idem |
| Mots | « attendre un peu / longtemps » | « horizon court (moins de 2 ans), moyen (2 à 5 ans), long (plus de 5 ans), dans ce jeu » |
| Explication | T41 (8-9) | T41 (10-12) |
| Mon histoire (si le serveur fournit les fenêtres) | — | « Dans ta partie, sur des périodes d'1 an, Entreprises a fini plus bas qu'au début {a} fois sur {b}. Sur des périodes de 5 ans : {c} fois sur {d}. » + « C'est ce qui s'est passé dans ta partie. Une autre partie pourrait être différente. » |
| Garde-fou (toujours) | « Attendre longtemps ne garantit rien. » | idem |
| Question | — | Q12 |

---

## 17. E16 — Fin de partie

**But.** Clore une histoire, relire ses décisions et ce qu'on a appris, sans note, sans regret, puis choisir d'en commencer une autre.

| Bloc | 8-9 | 10-12 |
|---|---|---|
| Titre | « Ta partie est terminée : {N} années dans la vallée. » | idem |
| Résumé | « Au départ : 100 · À la fin : {v} » + ▲▼= | « Versé : {versé} · Valeur finale : {v} · Différence : {±gain} · Performance : {±perf} · Frais payés : {f} · Prix de la liste du marché : 100 → {b} » |
| Mes décisions | Frise des répartitions choisies (dates simulées) | idem, avec arbitrages et versements |
| Le type d'histoire | « Ta partie ressemblait à : {nom lisible du scénario} » (par exemple « une crise puis une reprise »), révélé **seulement à la fin** | idem |
| Et avec d'autres choix ? | — | Les 4 résultats « tout sur un seul support » (`alternativeOutcomes`), rangés par risque, sans mise en avant, avec ta valeur finale sur la même échelle. Phrase obligatoire : « Personne ne pouvait savoir à l'avance comment l'histoire allait tourner. Une autre partie aurait pu donner l'inverse. » |
| Ce que tu as appris | Mots vérifiés pendant la partie (carnet) | idem |
| Clôture | T46 + « +20 XP · Partie terminée » (quel que soit le résultat) | idem |
| Suite | « Commencer une nouvelle partie » · « Plus tard » | idem |

**Nouvelle partie.** Elle repart de 100 unités école, avec un nouveau scénario choisi par le moteur (`pickScenario`, rotation, jamais le même deux fois de suite). L'ancienne partie est archivée dans « Mes parties » et reste consultable. **Jamais de comparaison entre parties par valeur finale** : les histoires de marché sont différentes.

**Interdits.** Étoiles, note, « Tu as battu ta partie précédente », mise en avant du meilleur support, calcul d'un « meilleur mélange ».

---

## 18. E17 — Le verger du temps long : assurance-vie simulée (10-12)

Les mécaniques (source du capital, versements, frais sur versement, frais de gestion, fonds en euros / unités de compte, retraits, ancienneté) sont définies par `INSURANCE_LIFE_SIMULATION.md` et le moteur. Cette section fixe les écrans et les mots.

| Écran | Contenu et microcopies |
|---|---|
| AV0 · Ouverture | « Un nouveau lieu est ouvert : le verger du temps long. » + « Entrer » |
| AV1 · C'est quoi ? | « Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, tu choisis des supports, comme dans l'observatoire. » (T45) |
| AV1 · Dans la vraie vie | « C'est un contrat, souvent gardé de nombreuses années. Il peut contenir un « fonds en euros » (qui ressemble à Sécurisé) et des supports qui bougent, appelés « unités de compte ». Rien à voir avec tes unités école ! » |
| AV2 · Versement | « Combien veux-tu placer dans l'enveloppe ? » + « Frais sur versement : {taux} %. Sur {montant} unités, {frais} vont aux frais et {net} sont placées. » (valeurs du serveur) |
| AV3 · Répartition | Atelier E6. Sécurisé est libellé « Sécurisé (fonds en euros) », les autres supports « … (unité de compte) ». Total : 100 %. |
| AV4 · Tableau de bord | « Valeur de l'enveloppe : {v} · Versé : {versé} · Différence : {±gain} » · « Ton enveloppe a {n} ans » (ancienneté) · frais (sur versement, gestion) · répartition · tracé |
| AV4 · Ancienneté | « Dans la vraie vie, l'âge d'un contrat compte : certaines règles changent après plusieurs années. » (pas de fiscalité détaillée) |
| AV5 · Bilan annuel | Structure de E9. Métaphore : saisons. Une bonne année = « belle récolte », une année en baisse = « un hiver ». Le texte reste chiffré et sobre (wording §21). |
| Retrait (si le moteur le prévoit) | « Retirer de l'enveloppe » → « Tu peux retirer une partie. Ce qui reste continue d'être placé. » + effet affiché par le serveur. Les unités retirées restent des unités école. |
| Questions | Q15 |

**D6-A.** Côté enfant, pas de mention du décès ni du bénéficiaire. P2 contient une note au parent : « Dans la réalité, l'assurance-vie sert aussi à transmettre un capital à des bénéficiaires en cas de décès. Nous ne l'abordons pas avec l'enfant ; vous pouvez en parler si vous le souhaitez. »

**Interdits.** Appeler l'enveloppe un « coffre », dire que le verger « pousse toujours », afficher un arbre mort, parler de fiscalité chiffrée.

---

## 19. P1 — Paramètres parent « Épargne et placements »

**Ton.** Clair, précis, sans jargon de jeu. Pour le parent, le « cycle » remplace la « partie ».

**Mon coffre**

| Réglage | Libellé et aide | Par défaut |
|---|---|---|
| Mon coffre | « Mon coffre » — « {prénom} peut mettre des pièces de côté dans son coffre. » | Activé |
| Reprendre des pièces du coffre | « Libre » — « {prénom} reprend ses pièces quand il le souhaite. » · « Avec votre validation » — « Chaque retrait vous est demandé. Vous acceptez ou refusez. » · « Après une durée minimale » + « {n} jours » — « Les pièces déposées restent au coffre au moins {n} jours. » · « Seulement quand l'objectif est atteint » — « Sans objectif en cours, un retrait vous est demandé. » | Libre |
| Note sous le réglage | « Une règle plus stricte ne s'applique qu'aux pièces déposées après le changement. {prénom} voit la règle avant chaque dépôt. » | — |
| Bonus d'épargne | Action existante « Donner un bonus d'épargne ». Aide : « Il apparaît comme « Bonus d'épargne de {vous} », jamais comme des intérêts. » | — |

**Placements école**

| Réglage | Libellé et aide | Par défaut |
|---|---|---|
| Placements école | « Placements école » — « Un simulateur avec des unités fictives, les unités école. Aucune pièce n'y entre ni n'en sort. Une baisse simulée ne touche jamais les pièces de {prénom}. » | **Désactivé**. Une carte d'invitation apparaît sur votre tableau de bord quand {prénom} a terminé le chapitre « Mon coffre ». |
| Niveau pédagogique | « Automatique selon l'âge (recommandé) » · « Découverte — conseillé 8-9 ans : compte, coffre, hausse et baisse, risque simple » · « Approfondi — conseillé 10-12 ans : pourcentages, diversification, frais, inflation, capitalisation, assurance-vie simulée » | Automatique |
| Rythme des relevés | « Rapide — environ 1 année simulée par jour » · « Standard — environ 1 année simulée tous les 2 jours » · « Long — environ 1 année simulée par semaine ». Aide : « Les valeurs ne changent qu'aux relevés. » Valeurs selon le moteur et D1. | Standard |
| Heure des relevés | « Les valeurs changent uniquement à ce moment. Choisissez un moment où {prénom} a le temps de regarder, par exemple après l'école. » | 17 h |
| Durée d'un cycle | « 5 ans simulés » · « 10 ans simulés » | 5 ans (Découverte), 10 ans (Approfondi) |
| Capital de départ | Information, non modifiable (D4) : « 100 unités école. 100 unités = 100 % : cela aide à comprendre les pourcentages. » | 100 |
| Versements école (Approfondi) | « Autoriser les versements programmés » + « Plafond du capital école, départ compris : {p} unités » — « {prénom} choisit combien ajouter chaque mois simulé. Au total, il ne peut pas verser plus que ce plafond. » (moteur : `contributionCap`) | Désactivé · 300 |
| Frais simulés (Approfondi) | « Des frais de gestion, sur versement et d'arbitrage sont appliqués, comme dans la réalité. Appliqué à partir du prochain cycle. » | Activé |
| Inflation visible (Approfondi) | « Afficher l'évolution des prix de la liste du marché de l'école. N'affecte jamais votre boutique familiale. » | Activé |
| Changements de répartition (Approfondi) | « {prénom} peut modifier sa répartition entre deux bilans. Le changement est appliqué au relevé suivant, un seul à la fois. » | Activé |
| Enveloppe long terme (Approfondi) | « Assurance-vie simulée : une enveloppe pour placer sur de longues années. » | Désactivé |

**Notifications et contrôle**

| Réglage | Libellé et aide | Par défaut |
|---|---|---|
| Notifier {prénom} | « Prévenir {prénom} quand un relevé est prêt. Le message ne contient jamais de chiffre ni de sens de variation. » | Désactivé |
| Idée d'échange | « Recevoir chaque mois une idée de question à poser à {prénom}. » | Activé |
| Pause | « Mettre l'observatoire en pause » — « Les relevés s'arrêtent. Rien ne bouge jusqu'à la reprise. Les relevés prévus pendant la pause ne sont pas rattrapés. » | — |
| Nouveau cycle | « Recommencer un cycle » → confirmation : « Un nouveau cycle repart de 100 unités école avec une nouvelle histoire de marché. L'ancien est archivé et reste consultable. Les pièces ne sont pas concernées. » · « Recommencer » / « Annuler » | — |

**Message à l'enfant après un changement de réglage** (encart au prochain passage) :
- rythme : « Le rythme des relevés a changé : désormais {jours} à {heure}. »
- règle du coffre : « Nouvelle règle pour les prochaines pièces mises dans Mon coffre : {règle}. »

**Erreurs.** « Le réglage n'a pas été enregistré. Réessayez. »

---

## 20. P2 — Vue parent des placements

**But.** Suivre ce que l'enfant **comprend**, pas sa performance, et préparer une discussion.

| Bloc | Contenu |
|---|---|
| Titre | « Placements école de {prénom} » |
| Ce que {prénom} sait expliquer | Les 8 phrases du test (`FINANCIAL_EDUCATION.md` §2.1) avec leur état : « Pas encore rencontré » · « Découvert » · « Sait l'expliquer ». Pas de pourcentage ni de score. |
| Dernier bilan | En lecture seule, avec les mêmes chiffres et les mêmes mots que l'enfant |
| Pour votre prochain échange | Une question générée à partir du dernier bilan. Exemples : « Demandez à {prénom} pourquoi Entreprises a baissé alors que Sécurisé a monté. » · « Demandez-lui ce qu'il ferait s'il avait besoin de ses unités l'an prochain. » · « Demandez-lui ce que les frais ont changé depuis le départ. » |
| Note assurance-vie | D6-A (voir E17) |
| Réglages | Lien vers P1 |
| Placements désactivés | « Les placements école ne sont pas activés pour {prénom}. » + « Activer » |

**Règles.**
- Cette vue est **par enfant**, jamais une grille comparative.
- Pas de valeur des placements dans la vue familiale qui montre tous les enfants.
- Pas de notification au parent en cas de baisse.

---

## 21. Bibliothèque de wording

Variables fournies par le serveur :
- `{v}` : valeur ;
- `{avant}` : valeur au relevé précédent ;
- `{départ}` : valeur de départ ;
- `{d}` : écart absolu, sans signe dans une phrase ;
- `{p}` : pourcentage signé ;
- `{support}` : nom affiché.

Clés i18n suggérées : `invest.var.<portée>.<sens>.<intensité>.<tranche>`.

Pour éviter la répétition, deux variantes par cas alternent de façon déterministe (index du relevé). Chaque variante a **la même structure en hausse et en baisse**.

### 21.1 Portefeuille : depuis le dernier relevé

| Cas | 8-9 | 10-12 |
|---|---|---|
| stable | « Ton placement n'a presque pas bougé : {v} unités école. » | « Ton portefeuille est resté presque stable : {v} unités école ({p}). » |
| hausse légère | « Ton placement vaut maintenant {v} unités école. Il a augmenté de {d} depuis le dernier relevé. » | « Ton portefeuille vaut {v} unités école. Il a augmenté de {d} ({p}) pendant cette période. » |
| hausse légère (variante) | « Ça a monté : {v} unités école. C'était {avant} au relevé d'avant. » | « Depuis le dernier relevé : {v} unités école, soit {d} de plus ({p}). » |
| hausse marquée | « Ton placement a monté : il vaut {v} unités école, {d} de plus qu'au dernier relevé. » | « Ton portefeuille vaut maintenant {v}. Il a augmenté de {d} unités ({p}) pendant cette période. » |
| hausse forte | « Ton placement a beaucoup monté : {v} unités école. Il peut aussi redescendre plus tard. » | « Ton portefeuille a fortement augmenté : {v} unités école ({p}). Une forte hausse peut être suivie de baisses. » |
| baisse légère | « Ton placement vaut maintenant {v} unités école. Il a baissé de {d} depuis le dernier relevé. » | « Ton portefeuille vaut {v} unités école. Il a baissé de {d} ({p}) pendant cette période. » |
| baisse légère (variante) | « Ça a baissé : {v} unités école. C'était {avant} au relevé d'avant. » | « Depuis le dernier relevé : {v} unités école, soit {d} de moins ({p}). » |
| baisse marquée | « Sa valeur a baissé : {v} unités école. Certains placements montent et descendent avec le temps. » | « Ton portefeuille vaut maintenant {v}. Sa valeur a baissé de {d} unités ({p}). Certains placements montent et descendent avec le temps. » |
| baisse forte | « Ton placement a beaucoup baissé : {v} unités école. Ça arrive avec certains placements. Tes pièces, elles, n'ont pas bougé. » | « Ton portefeuille a fortement baissé : {v} unités école ({p}). Ce genre de baisse arrive. Tu n'as rien à décider tout de suite. » |

### 21.2 Depuis le départ

| Cas | 8-9 | 10-12 |
|---|---|---|
| hausse | « Depuis le départ : {départ} → {v}. {d} de plus. » | Sans versement : « Depuis le départ : +{d} ({p}) ». Avec versements : « Versé : {versé} · Valeur : {v} · Différence : +{d} » |
| baisse | « Depuis le départ : {départ} → {v}. {d} de moins. » | « Depuis le départ : −{d} ({p}) » ou « … Différence : −{d} » |
| stable | « Depuis le départ : {départ} → {v}. Presque pareil. » | « Depuis le départ : presque inchangé ({p}) » |

### 21.3 Par support

| Cas | 8-9 | 10-12 (ligne de bilan) |
|---|---|---|
| hausse | « {support} a monté de {d}. » | « {support} : ▲ +{d} ({p}) » |
| baisse | « {support} a baissé de {d}. » | « {support} : ▼ −{d} ({p}) » |
| stable | « {support} n'a presque pas bougé. » | « {support} : = {d} ({p}) » |
| Sécurisé, hausse habituelle | « Sécurisé a grandi tout doucement : {d} de plus. » | « Sécurisé : ▲ +{d} ({p}), comme d'habitude » |

### 21.4 Situations particulières

| Situation | 8-9 | 10-12 |
|---|---|---|
| Premier relevé | T22 | T22 |
| Supports dans des sens opposés, total calme | T27 | T27 |
| De nouveau au-dessus du départ | « Ton placement est de nouveau au-dessus de {départ}. » | « Ton portefeuille vaut de nouveau plus que ce que tu as versé. » |
| Sous le départ pour la première fois | T26 | T26 |
| Après une absence | « Depuis ta dernière visite : {k} relevés. Voici ce qui a changé en tout. » | idem |
| Entre deux relevés | « Prochain relevé : {jour}. Rien ne bouge d'ici là. » | idem |
| Relevé en préparation | « Le relevé de {jour} est en préparation. Reviens un peu plus tard. » | idem |
| Pause | « L'observatoire est en pause. Rien ne bouge jusqu'à sa réouverture. » | idem |
| Partie terminée | « Ta partie est terminée. » | idem |
| Notification (si activée) | « Ton relevé est prêt. » | idem |

### 21.5 Mots interdits et remplacements

| Interdit | À la place |
|---|---|
| « Bravo », « Super ! », « Génial », « Jackpot », « Tu as gagné » (à propos d'un placement) | La phrase de hausse, sans félicitation. Les félicitations sont réservées aux actions d'apprentissage : « Première répartition », « Mot ajouté à ton carnet ». |
| « Tu as perdu », « Oh non », « Dommage », « Attention ! », « Aïe » | « Sa valeur a baissé. » |
| « Crash », « s'effondre », « explose », « flambe », « s'envole » | « a fortement baissé », « a fortement augmenté » |
| « Miser », « parier », « chance », « tenter », « gros lot » | « placer », « répartir » |
| « Garanti », « sans risque », « sûr », « à coup sûr » | « varie très peu », « ne baisse pas avec les marchés, dans ce jeu » |
| « Meilleur rendement », « rapporte plus », « le plus rentable » | « peut varier plus fortement » |
| « Vite », « maintenant ou jamais », « dernière chance », « ne rate pas » | Rien : aucune urgence. |
| « Tu aurais dû », « Si tu avais… » | « Personne ne pouvait savoir à l'avance. » (fin de partie uniquement) |
| « Argent », « euros », « € » à propos des unités école | « unités école » |
| « Coffre » pour Sécurisé ou pour l'enveloppe | « Sécurisé », « l'enveloppe », « le verger » |
| « Panier » pour l'inflation | « la liste du marché » |
| « Investir », « trader », « trading » (dans l'interface) | « placer ». « Investir » seulement dans « Dans la vraie vie ». |

---

## 22. Contrat de données attendu du serveur (proposition, à aligner avec le moteur)

Le client n'appelle jamais le moteur. Le serveur valorise avec `valuePortfolio` jusqu'à l'étape révélée (`clockState.revealedSteps`), puis renvoie des valeurs prêtes à afficher.

| Besoin UX | Source moteur | Écrans |
|---|---|---|
| Statut : désactivé · verrouillé (+ condition et progression) · onboarding · actif · pause · terminé | Serveur (paliers et réglages) | E1, E3, E7 |
| Niveau Découverte / Approfondi | Réglage parent + âge | Tous |
| Étape révélée, année et mois simulés, horizon | `clockState`, `simulatedElapsed` | E7, E9, E16 |
| Date réelle du prochain relevé | `clockState.nextRendezVousAt` | E1, E7, E9 |
| Valeur avant et après décisions | `ValuationPoint.valueAtReveal`, `value` | E7, E9 |
| Valeur par support, part actuelle, part cible | `bySupport`, `actualAllocation`, dernière cible | E7, E8, E10 |
| Versé, retiré, gain | `contributed`, `withdrawn`, `gain` | E7, E11, E16 |
| Performance hors versements | `ValuationPoint.performanceIndex` (base 100) ; `PeriodSummary.performance` pour une période | E7, E9 |
| Bilan d'une période, avec catégorie de seuil (§0.4) déjà calculée | `summarizePeriod` | E9 |
| Frais cumulés et détaillés | `fees: FeesBreakdown` | E7, E12 |
| Avec / sans frais | `compareWithAndWithoutFees` | E12 |
| Indice des prix, valeur en pouvoir d'achat, prix de la liste du marché | `priceIndex`, `realValue`, `priceAfterInflation`, `purchasingPower` | E13 |
| Intérêts par année et intérêts sur intérêts (Sécurisé, Prêter) | **À ajouter** (non exposé dans `finsim-1.0.0`) | E14 |
| Fenêtres d'horizon dans la partie | **À ajouter** (facultatif) | E15 |
| Niveau de risque d'une répartition | `portfolioRiskLevel` | E6, E10 |
| Résultats « tout sur un seul support » | `alternativeOutcomes` (fin de partie seulement) | E16 |
| Nom lisible du scénario (fin de partie seulement) | `ScenarioCode` → i18n | E16 |
| Récit de la période (facultatif) | **À ajouter** : clé de récit par régime de marché | E9 |
| Encart à afficher (T-id) et question (Q-id) | Serveur (file pédagogique) | E9 et autres |
| Changement prévu (arbitrage ou versement) | Opérations en attente | E7, E10, E11 |

**Écritures** (toutes avec une clé d'idempotence fournie par le client) :
- `POST` répartition initiale ;
- `POST` / `PUT` / `DELETE` arbitrage prévu ;
- `PUT` versements programmés ;
- `POST` réponse à une vérification `{ questionId, optionId }` → `{ correct, explanation, xpAwarded }` ;
- `POST` encart lu `{ triggerId }`.

La validation de répartition utilise `checkAllocation` côté serveur. Les codes d'erreur `ALLOCATION_SUM` et `ALLOCATION_INVALID` sont traduits par : « Ta répartition doit faire exactement 100. » (8-9) et « Le total doit faire 100 %. » (10-12).

---

## 23. Ce qui remplace l'existant

| Existant | Devient |
|---|---|
| `SimulationPortfolio` avec profils `PRUDENT` / `EQUILIBRE` / `DYNAMIQUE` | Une répartition libre sur 4 supports. « Prudent / équilibré / dynamique » ne revient que comme **vocabulaire** 10-12 (notion `profil_risque`, bibliothèque) : « Dans la vraie vie, une banque te demande ton profil : prudent, équilibré ou dynamique. » |
| `POST /child/simulation/portfolios/:id/advance` (l'enfant fait avancer le temps) | Supprimé. Le temps avance uniquement par `clockState` côté serveur. |
| `SimulationScenario.returnSeries` (5 rendements fixes) | Les trajectoires du moteur (`generateMarketPath`, `pickScenario`). |
| Page « Apprendre » (`Learn.tsx`) | « La bibliothèque de l'observatoire » : modules existants, carnet de mots, encarts relisibles, « À découvrir » (encarts en attente). Les modules « budget » et « épargne » sont conservés. Le module « inflation » est réécrit (liste du marché, unités école) et déclenché par T35. Vérifications conformes à `FINANCIAL_EDUCATION.md` §9. |
| Données existantes du simulateur | Archivées, non affichées. |
# Mise à jour produit — septembre 2026

Les nouvelles parties « Mes placements » utilisent des pièces virtuelles réellement transférées du
solde disponible de l'enfant. Le montant initial est choisi par l'enfant ; les 100 parts de l'atelier
représentent la répartition de ce montant, pas une seconde monnaie. Les versements programmés débitent
le solde disponible au mois simulé correspondant ; un mois sans solde est sauté. Les passages ci-dessous
sur les 100 unités école séparées des pièces décrivent les anciennes parties et le verger du temps long.
