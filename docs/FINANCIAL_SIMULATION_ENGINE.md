# Moteur de simulation financière — `finsim-1.0.0`

Spécification du moteur qui fait évoluer les **unités école** du simulateur d'investissement
d'Okodukai. Code : `apps/api/src/lib/financeSim/` (TypeScript pur, sans dépendance, sans accès
base ni Express). Document compagnon : `docs/INSURANCE_LIFE_SIMULATION.md`.

Tous les chiffres « mesurés » de ce document viennent du moteur lui-même (Monte-Carlo à seeds
fixes, version `finsim-1.0.0`). Ils décrivent le simulateur, pas les marchés réels, et ne
constituent en aucun cas une prévision.

---

## 0. En une page

- **Modèle** : régimes de marché (7 régimes : expansion, hausse, marché agité, crise, reprise,
  stagnation, inflation) enchaînés par des **scénarios scriptés** ou par une **chaîne de Markov**
  (mode « réaliste »). Dans chaque régime, les rendements mensuels des 4 supports sont tirés
  d'un **modèle à facteurs corrélés** (facteur actions mondial, facteur taux, risque propre des
  entreprises, choc d'inflation).
- **Temps compressé** : le moteur calcule toujours des **mois simulés** avec des rendements
  mensuels réalistes. Le rythme choisi par le parent ne change que la vitesse à laquelle ces
  mois sont **révélés**, par paquets, à des **rendez-vous** fixes (ex. Standard : chaque jour
  à 17 h, 6 mois révélés, donc 5 ans en 10 jours). On compresse le temps, jamais les rendements.
- **Trajectoire pré-calculée et figée** à la création, **révélée progressivement** par le
  serveur. La valorisation du portefeuille est recalculée à la volée à partir de la trajectoire
  et du journal immuable des décisions de l'enfant.
- **Honnêteté** : sur les 7 scénarios pédagogiques, les supports risqués finissent derrière le
  support Sécurisé environ une fois sur deux (5 ans). En mode réaliste, le Panier Monde fait
  ≈ 7,5 %/an en moyenne avec ≈ 15 % de volatilité, et finit derrière Sécurisé ≈ 1 fois sur 4
  sur 10 ans. La diversification réduit réellement la dispersion (mesuré et testé).
- **Reproductible au bit près** : seed + version ⇒ même trajectoire. Les trajectoires n'utilisent
  que +, −, ×, ÷ et √, exactement arrondis par IEEE 754, donc identiques sur toute machine.
  L'empreinte de tous les paramètres est épinglée dans les tests.
- **Jamais** : de conversion unités école ↔ pièces, d'effet sur le ledger `WalletTransaction`,
  d'XP, de booster ou de carte liés à la performance d'un placement.

---

## 1. Périmètre et invariants

| Invariant | Comment le moteur le garantit |
|---|---|
| Deux monnaies séparées | Le module ne connaît que des « unités école ». Un test vérifie qu'il n'importe rien hors de son dossier (ni Prisma, ni ledger, ni Express). |
| Une perte simulée ne touche jamais les pièces | Aucune fonction ne produit de mouvement de pièces. En « simulation miroir », l'API peut **lire** le solde de pièces pour borner le montant simulé, mais n'écrit jamais dans le wallet. |
| Serveur = autorité | Les valeurs sont calculées côté API ; le client ne reçoit que la partie révélée (`revealMarket`), jamais la seed, le scénario ni les mois futurs. |
| Pas de récompense de la chance | Aucune sortie du moteur n'est un « gain » attribuable en XP. Règle d'intégration : l'XP ne peut récompenser qu'une action pédagogique (faire un bilan, expliquer un choix), jamais un résultat. |
| Pas de produit réel | Supports génériques et fictifs, sans nom d'indice, d'entreprise, d'assureur ou de fonds. |
| Pas de conseil | Le moteur ne recommande aucune répartition. `portfolioRiskLevel` décrit une amplitude de variation, pas un rendement. |

---

## 2. Modèle retenu et pourquoi

### 2.1 Options considérées

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| `value += random(-10, +15)` | Trivial | Biais haussier caché, aucune corrélation, aucune cohérence temporelle, variations absurdes | **Interdit** |
| Mouvement brownien géométrique par support | Standard, simple | Pas de crises, pas de reprises, pas de corrélations qui changent. Les « scénarios » ne sont pas pilotables | Insuffisant |
| Rejeu de séries historiques réelles | Réaliste | Lié à de vrais indices (interdit), le futur est connu des adultes, droits sur les données | Écarté |
| **Régimes de marché + facteurs corrélés** | Crises, reprises, stagnations et inflation explicites ; corrélations qui changent selon le régime (ex. 2022 : actions et obligations baissent ensemble) ; scénarios pilotables ; queues épaisses obtenues naturellement par le mélange de régimes | Paramètres à documenter (ce fichier) | **Retenu** |

### 2.2 Régimes (paramètres annuels)

Le moteur convertit les paramètres annuels en mensuels : moyenne μ/12, écart type σ/√12
(`regimes.ts`). Les 4 aléas mensuels (facteur actions, facteur taux, risque propre, inflation)
sont tirés dans un ordre fixe à chaque mois.

| Régime | Sécurisé (taux cible) | Prêter μ / σ / ρ(actions) | Panier Monde μ / σ | Entreprises μ / β / σ propre | Inflation cible |
|---|---|---|---|---|---|
| EXPANSION (croissance calme) | 2,2 % | 3,5 % / 3,5 % / 0,2 | 10 % / 12 % | 10 % / 1,1 / 16 % | 2,0 % |
| HAUSSE (marché favorable) | 2,2 % | 3,5 % / 3,5 % / 0,2 | 16 % / 11 % | 17 % / 1,15 / 17 % | 2,0 % |
| VOLATIL (marché agité) | 2,0 % | 2 % / 5 % / 0 | 3 % / 22 % | 3 % / 1,15 / 20 % | 2,2 % |
| CRISE (forte baisse) | 1,5 % | 1 % / 6 % / −0,2 | −35 % / 28 % | −40 % / 1,2 / 24 % | 1,0 % |
| REPRISE (rebond) | 1,5 % | 4 % / 4,5 % / 0,2 | 22 % / 18 % | 24 % / 1,15 / 20 % | 1,5 % |
| STAGNATION (plat, taux bas) | 1,0 % | 1 % / 3 % / 0,1 | 1 % / 13 % | 1 % / 1,1 / 17 % | 0,8 % |
| INFLATION (prix et taux montent) | 3,0 % | −6 % / 7 % / 0,5 | −3 % / 18 % | −4 % / 1,1 / 19 % | 7,0 % |

Ordres de grandeur : actions mondiales ≈ 7 %/an sur longue période avec ≈ 15 % de volatilité ;
obligations ≈ 2-4 % avec ≈ 4-5 % de volatilité ; fonds en euros ≈ 1-3 % ces dernières années ;
inflation cible 2 %. Une crise type fait perdre ≈ 25-40 % en 8-14 mois (2000-2003 et 2008 ont été
plus profondes, 2020 plus brève). Tout est arrondi et simplifié : ce ne sont pas des estimations
de marché.

### 2.3 Équations mensuelles

Avec `zA` (actions), `zT` (taux), `zP` (propre) et `zI` (inflation), quatre tirages normaux
indépendants :

```
Monde        r = μM/12 + σM/√12 · zA
Entreprises  r = μE/12 + β · σM/√12 · zA + σpropre/√12 · zP
Prêter       r = μP/12 + σP/√12 · (ρ · zA + √(1−ρ²) · zT)
Sécurisé     s ← max(0, s + (s* − s)/12)        r = s/12
Inflation    π ← max(−1 %, π + 0,15 · (π* − π) + 0,3 % · zI)   indice × (1 + π/12)
Valeur de part : P(t) = P(t−1) × (1 + max(−95 %, r))
```

- **Panier Monde** = beaucoup d'entreprises de nombreux pays : le risque propre de chacune
  s'annule, il ne reste que le facteur commun.
- **Entreprises** = quelques entreprises : même facteur (β ≈ 1,1-1,2) **plus** un risque propre
  qui ne se diversifie pas. Son rendement moyen est proche du Panier Monde : le risque propre
  n'est pas rémunéré (constat empirique standard). Résultat : Entreprises a une dispersion
  beaucoup plus grande et une médiane plus basse (traînée de volatilité), mais parfois les
  meilleurs résultats. C'est le cœur de la leçon « risque plus élevé ≠ rendement garanti ».
- **Prêter** : corrélation avec les actions qui dépend du régime (−0,2 en crise : les
  obligations amortissent ; +0,5 en inflation : tout baisse ensemble).
- **Sécurisé** : taux lissé qui rejoint lentement la cible du régime (demi-vie ≈ 8 mois), jamais négatif
  avant frais. C'est un choix de modélisation (lissage type fonds en euros), **pas** une
  promesse : voir `INSURANCE_LIFE_SIMULATION.md` §3 pour la formulation exacte.
- **Inflation** : processus persistant (retour vers la cible, demi-vie ≈ 4 mois) ; légère déflation
  possible.
- **Garde-fou** : un rendement mensuel ne peut pas descendre sous −95 %. Avec les paramètres
  actuels, ce plancher n'est jamais atteint (bruit borné à ±6σ) ; il protège contre une
  erreur de paramétrage future.

### 2.4 Statistiques mesurées en mode réaliste (5 000 trajectoires de 10 ans)

| Support | Rendement annuel moyen | Volatilité | Années négatives | Rendement annualisé sur 10 ans (P10 / médiane / P90) |
|---|---|---|---|---|
| Sécurisé | 2,1 % | 0,1 % | 0 % | 1,8 / 2,1 / 2,2 % |
| Prêter | 2,6 % | 4,1 % | 26 % | 0,3 / 2,7 / 4,5 % |
| Panier Monde | 7,5 % | 15,1 % | 32 % | −1,9 / 6,4 / 13,8 % |
| Entreprises | 7,4 % | 24,3 % | 41 % | −7,3 / 4,4 / 15,6 % |

Inflation moyenne 2,1 %/an (écart type 1,1). Corrélations des rendements mensuels :
Prêter-Monde 0,15, Prêter-Entreprises 0,10, Monde-Entreprises 0,70, Sécurisé ≈ 0.
Temps passé par régime : expansion 57 %, stagnation 12 %, marché agité 11 %, hausse 8 %,
inflation 5 %, reprise 4 %, crise 3,5 %.

---

## 3. Les supports et l'échelle de risque

| Code | Nom enfant | Idée | Niveau | Famille assurance-vie |
|---|---|---|---|---|
| `SECURISE` | Sécurisé | Valeur qui bouge très peu et monte lentement | 1 | Proche du fonds en euros |
| `PRETER` | Prêter | On prête à des États ou entreprises fictifs qui paient des intérêts | 2 | Unité de compte (obligations) |
| `MONDE` | Panier Monde | Un petit morceau de très nombreuses entreprises du monde entier | 4 | Unité de compte (actions diversifiées) |
| `ENTREPRISES` | Entreprises | Quelques entreprises seulement | 5 | Unité de compte (actions concentrées) |

**Niveau de risque d'une répartition** (`portfolioRiskLevel`) : volatilité de référence
√(wᵀΣw) calculée avec les volatilités et corrélations du §2.4, puis seuils 1 % / 5 % / 10 % /
18 %. Exemples : 50 % Prêter + 50 % Monde → 8,1 % → **niveau 3** (qu'aucun support n'a seul :
c'est la diversification) ; 70 % Sécurisé + 30 % Prêter → niveau 2 ; 25 % partout → niveau 3.

Message associé, toujours affiché avec le niveau : « Le niveau de risque dit à quel point la
valeur peut bouger, vers le haut comme vers le bas. Il ne dit pas ce que tu vas gagner. »
Jamais de code couleur « vert = bien / rouge = mal » sur l'échelle.

---

## 4. Scénarios

Un scénario = une suite de phases (régime fixe ou mini-chaîne de Markov) dont les durées sont
tirées au hasard en proportion de l'horizon, avec des bornes en mois. On valide ensuite la
trajectoire avec un **critère d'acceptation** qui garantit qu'elle ressemble à son nom (tirage
par rejet seedé : tentative 0, 1, 2… jusqu'à 400 ; en pratique 1 à 14 tentatives en moyenne).
Les critères portent **uniquement sur la forme du marché** (Panier Monde, inflation, Prêter),
jamais sur « qui gagne », pour ne pas fabriquer de biais.

Critères de rendement annualisé **composé** calculés sans racine : CAGR ≥ x ⟺ ratio¹² ≥ (1+x)^mois
(`metrics.ts`, puissances entières, exact).

| Scénario | Phases | Critère d'acceptation | Tonalité |
|---|---|---|---|
| `CROISSANCE_REGULIERE` | Expansion, courts épisodes agités | Monde +4 à +11 %/an, jamais −18 % depuis un sommet | Favorable |
| `MARCHE_VOLATIL` | Marché agité, mini-crises et rebonds | Volatilité ≥ 17 %, Monde entre −4 et +4 %/an, au moins une baisse de 12 % | Mitigée |
| `FORTE_BAISSE` | Expansion courte → crise (8-14 mois) → stagnation avec rebonds partiels | Baisse max 25 à 55 %, fin sous 90 % du départ | Défavorable |
| `CRISE_PUIS_REPRISE` | Expansion → crise (6-14 mois) → reprise → expansion | Baisse max 20 à 50 %, fin au-dessus du départ | Favorable |
| `STAGNATION` | Stagnation, épisodes agités | Monde entre −1,5 et +1,5 %/an | Défavorable |
| `INFLATION_IMPORTANTE` | Expansion → inflation (12-40 mois) → normalisation | Prix +3 %/an minimum en moyenne, Prêter finit en baisse | Défavorable |
| `MARCHE_FAVORABLE` | Hausse et expansion | Monde +9 à +15 %/an, jamais −15 % | Favorable |
| `REALISTE` (mode à part) | Chaîne de Markov libre (§2.4) | Aucun | — |

### 4.1 Résultats mesurés (100 unités placées, 5 ans, 400 trajectoires par scénario)

Valeur finale P10 / médiane / P90, part des trajectoires où le support finit derrière Sécurisé.

| Scénario | Sécurisé | Prêter | Panier Monde | Entreprises | Prix | Monde < Sécurisé | Entreprises < Sécurisé |
|---|---|---|---|---|---|---|---|
| Croissance régulière | 111 / 112 / 112 | 105 / 117 / 131 | 130 / 148 / 164 | 82 / 137 / 230 | +11 % | 0 % | 30 % |
| Marché volatil | 110 / 110 / 111 | 98 / 113 / 129 | 85 / 101 / 117 | 48 / 86 / 155 | +10 % | 77 % | 71 % |
| Forte baisse | 108 / 108 / 109 | 96 / 107 / 122 | 58 / 73 / 86 | 32 / 59 / 115 | +7 % | 100 % | 88 % |
| Crise puis reprise | 110 / 110 / 110 | 105 / 117 / 133 | 107 / 141 / 204 | 70 / 129 / 231 | +9 % | 15 % | 37 % |
| Stagnation | 107 / 107 / 108 | 96 / 107 / 119 | 94 / 100 / 106 | 60 / 92 / 148 | +6 % | 97 % | 65 % |
| Inflation importante | 112 / 113 / 113 | 78 / 89 / 97 | 62 / 98 / 149 | 40 / 85 / 165 | +23 % | 66 % | 70 % |
| Marché favorable | 112 / 112 / 112 | 107 / 119 / 131 | 159 / 179 / 196 | 103 / 170 / 268 | +11 % | 0 % | 15 % |
| *Réaliste* | 109 / 111 / 112 | 100 / 115 / 128 | 82 / 135 / 212 | 56 / 125 / 251 | +10 % | 32 % | 40 % |

Sur les 7 scénarios pédagogiques : Panier Monde derrière Sécurisé **51 %** du temps,
Entreprises **53 %**. Entreprises finit derrière le Panier Monde dans 55 à 66 % des trajectoires
de chaque scénario. Même dans « Forte baisse », Entreprises peut finir au-dessus de son départ
(P90 = 115) : quelques entreprises s'en sortent, mais on ne sait pas lesquelles à l'avance.

### 4.2 Diversification (mode réaliste, 5 ans, 2 000 trajectoires)

| Répartition | Écart type du résultat | P10 / médiane / P90 |
|---|---|---|
| 100 % Entreprises | 85,7 | 59 / 127 / 251 |
| 100 % Panier Monde | 55,1 | 80 / 139 / 215 |
| 100 % Prêter | 12,0 | 99 / 114 / 128 |
| 100 % Sécurisé | 1,2 | 109 / 111 / 112 |
| 50 % Prêter + 50 % Monde | 29,7 (moyenne des deux : 33,6) | 93 / 127 / 167 |
| 25 % sur chaque support | 33,5 | 91 / 124 / 169 |

Les tests vérifient : écart type Monde < 0,8 × Entreprises ; mélange 50/50 < moyenne des
écarts types de ses composants ; 25 % partout < Monde et < Entreprises.

---

## 5. Attribution des scénarios

`pickScenario({ seed, history, pool })` :

1. **Première simulation** : tirée parmi 3 scénarios d'ouverture équilibrés (Croissance
   régulière, Marché volatil, Crise puis reprise). Pas d'euphorie qui ferait croire que « ça
   monte toujours », pas de catastrophe décourageante.
2. **Ensuite, sac sans remise** : on tire parmi les scénarios les moins vécus. Sur 7
   simulations, l'enfant vit chacune des 7 expériences exactement une fois (testé sur 3 cycles).
3. **Jamais deux fois le même d'affilée**, y compris d'un cycle au suivant.
4. **Jeu équilibré obligatoire** : un `pool` restreint par le parent doit contenir au moins un
   scénario favorable et un défavorable aux supports risqués (`assertBalancedPool`), sinon
   `ScenarioPoolError`. Le mode `REALISTE` est toujours accepté.
5. **Nom du scénario caché** jusqu'au bilan final (côté enfant). Au bilan : « Tu viens de vivre :
   une crise puis une reprise. »
6. **Mode leçon** (parent) : le parent peut imposer un scénario précis. Il est alors ajouté à
   l'historique, et l'équilibrage reprend automatiquement autour de lui.

**Honnêteté sur les fréquences** : le sac pédagogique surreprésente les périodes difficiles par
rapport à l'histoire. Sur 5 ans, les supports risqués finissent derrière Sécurisé ≈ 1 fois sur 2
dans le sac, contre ≈ 1 fois sur 3 en mode réaliste. C'est voulu : l'enfant doit vivre tous les
types de marché. Il faut le dire au parent (« les scénarios sont choisis pour faire vivre toutes
les situations, pas pour imiter leur fréquence réelle »). Le mode `REALISTE` est proposé aux
11-13 ans (cf. décision D2).

---

## 6. Temps financier compressé

### 6.1 Principe

- **1 étape du moteur = 1 mois simulé**, avec un rendement mensuel réaliste.
- Un **rendez-vous** révèle un paquet de mois à une heure locale fixe. Entre deux rendez-vous, la
  valeur affichée **ne change pas**. Consulter l'app toutes les 5 minutes n'apporte donc rien
  de nouveau : l'anti-compulsion vient de la structure, pas d'une interdiction.
- Le **rythme** (choix du parent) ne modifie que la cadence de révélation. Un test vérifie que la
  trajectoire révélée après 12 mois est identique en Rapide et en Long.

### 6.2 Table de correspondance (`RHYTHMS`, `clock.ts`)

| Rythme | Rendez-vous (heure du foyer) | Révélé par rendez-vous | 1 an simulé | 5 ans | 10 ans | Facteur de compression |
|---|---|---|---|---|---|---|
| Rapide | 4 par jour : 8 h, 12 h, 16 h, 20 h | 3 mois (un trimestre) | 1 jour | 5 jours | 10 jours | × 365 |
| Standard | 1 par jour : 17 h | 6 mois (un semestre) | 2 jours | 10 jours | 20 jours | × 183 |
| Long | 2 par semaine : mercredi et samedi, 17 h | 6 mois | 1 semaine | 5 semaines | 10 semaines | × 52 |

Facteur = mois par rendez-vous × 30,44 jours × rendez-vous par semaine ÷ 7.

Exemple : 7 %/an reste 7 % par **année simulée** ; en Standard, cette année se découvre en
2 jours réels (2 rendez-vous de 6 mois, chacun montrant ses 6 rendements mensuels). Jamais 7 %
par jour.

### 6.3 Règles d'horloge

- **Fuseau du foyer** (IANA, ex. `Europe/Paris`) via `Intl` : les rendez-vous restent à 17 h
  locale aux changements d'heure (testé sur le passage à l'heure d'été du 29 mars 2026).
- **Délai minimal** de 60 min entre le démarrage et le premier rendez-vous.
- **Rattrapage** : si l'enfant ne vient pas, les rendez-vous passés s'accumulent (le marché
  n'attend pas). Au retour : « Depuis ta dernière visite : 3 rendez-vous, 1 an et demi
  simulé », avec la courbe mensuelle. Jamais « tu as raté ».
- **Pauses parentales** (vacances) : les rendez-vous tombant dans une pause sont sautés, pas
  rattrapés. La simulation reprend là où elle en était.
- **Fin** : quand l'horizon est révélé, `finished = true` → bilan final.
- **Notifications** (côté API) : au plus une par rendez-vous et au plus une par jour en Rapide
  (regroupée), jamais la nuit, texte neutre (« Ton bilan est prêt. »), jamais la valeur ni le
  sens de la variation dans la notification.

### 6.4 Exemple de parcours (Standard, `CRISE_PUIS_REPRISE`, seed `exemple-19`)

Valeur de part de chaque support (base 100) à chaque rendez-vous quotidien :

| Jour | Temps simulé | Sécurisé | Prêter | Panier Monde | Entreprises | Prix d'un panier à 100 |
|---|---|---|---|---|---|---|
| 0 | départ | 100,00 | 100,00 | 100,00 | 100,00 | 100,00 |
| 1 | 6 mois | 101,11 | 105,26 | 103,64 | 94,34 | 100,85 |
| 2 | 1 an | 102,13 | 99,67 | 100,51 | 88,98 | 101,38 |
| 3 | 1 an 6 mois | 103,06 | 106,45 | 95,35 | 79,43 | 102,05 |
| 4 | 2 ans | 103,93 | 106,10 | 91,27 | 92,64 | 102,94 |
| 5 | 2 ans 6 mois | 104,77 | 106,88 | 99,69 | 81,76 | 103,69 |
| 6 | 3 ans | 105,59 | 105,51 | 91,23 | 82,64 | 104,35 |
| 7 | 3 ans 6 mois | 106,50 | 105,87 | 97,87 | 70,20 | 105,08 |
| 8 | 4 ans | 107,52 | 109,16 | 110,91 | 89,31 | 105,84 |
| 9 | 4 ans 6 mois | 108,62 | 112,48 | 106,73 | 81,30 | 107,18 |
| 10 | 5 ans | 109,76 | 118,01 | 135,25 | 111,78 | 108,45 |

Ce qu'on y voit : une crise, une reprise cahoteuse (une « reprise » n'est pas une ligne droite),
Entreprises qui plonge à 70 avant de finir au-dessus de 100, Sécurisé qui avance lentement
mais à peu près au rythme des prix.

---

## 7. Trajectoire pré-calculée ou calcul à la volée ?

**Retenu : pré-calcul du marché à la création + révélation progressive + valorisation du
portefeuille à la volée.**

| Critère | Pré-calcul (retenu) | Tirage à chaque rendez-vous |
|---|---|---|
| Forme du scénario garantie | Oui : le critère d'acceptation porte sur toute la trajectoire | Impossible sans connaître la suite |
| Reproductibilité / audit | 1 seed → 1 trajectoire, figée en base (≈ 10 Ko JSON pour 10 ans) | Chaque tirage doit être stocké et protégé contre le double tirage |
| Dépendance à un job planifié | Aucune : valeur = f(trajectoire, décisions, étape révélée) | Un job ou la première requête déclenche le tirage : risques de course et d'idempotence |
| Changement de paramètres | N'affecte pas les simulations en cours (cohérence) | Change le futur d'une simulation en cours |
| Risque | « Le futur existe déjà » : il ne doit JAMAIS sortir du serveur | — |

Le marché ne dépend pas des décisions de l'enfant (il ne peut pas « faire bouger » le marché),
donc la trajectoire peut être pré-générée sans perte de réalisme. Les décisions sont appliquées
à la volée, avec l'information disponible à l'étape révélée uniquement.

Règles anti-fuite :

- la seed, le code scénario, `metrics` et les étapes au-delà de `revealedSteps` ne sont jamais
  sérialisés vers le client, ni pour l'enfant ni pour le parent ;
- la seule vue exposable est `revealMarket(path, revealedSteps)` ;
- les régimes (« marché agité », « crise ») ne sont nommés qu'**après** leur révélation.

---

## 8. Portefeuille

### 8.1 Parts

Le portefeuille détient des **parts** de chaque support, comme une unité de compte :
`valeur = Σ parts × valeur de part`. Tout est recalculé depuis la trajectoire et le journal des
opérations (`valuePortfolio`), rien n'est stocké comme solde.

### 8.2 Ordre des événements à l'étape t (fin du mois t)

1. le marché bouge (valeurs de part t−1 → t) ;
2. frais de gestion du mois prélevés en parts (1/12 du taux annuel) ;
3. versement programmé du mois investi selon la répartition cible ;
   → **`valueAtReveal`** : ce que l'enfant découvre au rendez-vous ;
4. décisions prises à cette étape, dans l'ordre d'enregistrement → **`value`**.

### 8.3 Opérations (`SimOperation`)

| Type | Effet | Détails |
|---|---|---|
| `VERSEMENT` | Investit un montant selon sa répartition, ou la répartition cible | Le premier versement doit porter une répartition, qui devient la cible |
| `VERSEMENTS_PROGRAMMES` | Versement mensuel automatique à partir du mois **suivant** ; 0 = arrêt | Suit la cible courante (ou sa propre répartition) |
| `ARBITRAGE` | Réorganise **tout** le portefeuille selon une nouvelle répartition, qui devient la cible | Frais sur le montant **déplacé** (Σ des ventes) |
| `RETRAIT` | Retire au prorata de chaque support, plafonné à la valeur | Aucun frais ni impôt simulé |

Répartitions : entiers de 0 à 100, somme 100 (`checkAllocation` → `ALLOCATION_INVALID` /
`ALLOCATION_SUM`). Pas de rééquilibrage automatique : la répartition réelle dérive avec le
marché (`actualAllocation`), et c'est à l'enfant de décider d'arbitrer.

**Prix d'exécution** : une décision s'exécute à la valeur affichée (dernière étape révélée).
Il n'y a pas de fuite : le futur est inconnu de tous. Dans un vrai contrat, un arbitrage
s'exécute sur une prochaine valeur de part, inconnue au moment de la demande (cf. D3).

**Plafond parental** (`contributionCap`) : versements − retraits ≤ plafond. Un versement
programmé qui dépasserait est réduit, et la part refusée est comptée (`refusedByCap`). L'API
doit refuser en amont un versement ponctuel qui dépasse.

### 8.4 Frais (`FeeSchedule`)

| Frais | Paramètre | Calcul |
|---|---|---|
| Sur versement | `entryRate` (ex. 2 %) | montant × taux, prélevé avant investissement |
| De gestion | `managementRateAnnual` (ex. 0,8 %/an), global ou par support | chaque mois, parts × taux/12 (méthode prorata courante dans les contrats) |
| D'arbitrage | `arbitrageRate` (ex. 0,5 %), `freeArbitragesPerYear` | montant déplacé × taux, sauf arbitrages gratuits de l'année simulée |

Présets : `NO_FEES`, `EXAMPLE_CONTRACT_FEES` (2 % / 0,8 % / 0,5 %, ordres de grandeur d'un
contrat « classique », pas une moyenne officielle). Les frais internes des fonds ne sont pas
distingués des frais de gestion du contrat (simplification).

**Comparer avec / sans frais** (`compareWithAndWithoutFees`) : même trajectoire, mêmes
décisions. Mesuré (mode réaliste, 10 ans, 100 + 10/mois, 50 % Sécurisé et 50 % Monde,
1 300 versés) : médiane sans frais 1 676, écart médian **107 unités (≈ 6 %)**, pour 89 de frais
payés. Les frais coûtent plus que leur montant, parce que l'argent prélevé ne rapporte plus.
Version sans hasard (`feeDragTable`) : 100 à 4 %/an pendant 10 ans → 148,02 sans frais,
133,87 avec 1 %/an de frais.

### 8.5 Mesures fournies par point (`ValuationPoint`)

- `value`, `valueAtReveal`, `bySupport`, `actualAllocation` ;
- `contributed`, `withdrawn`, `refusedByCap`, `fees` (sur versement / gestion / arbitrage / total) ;
- `gain` = valeur + retraits − versements (net de frais) ;
- `performanceIndex` : indice base 100 « valeur de part du portefeuille » (méthode
  time-weighted). C'est ce que le placement a fait **sans compter les versements**. Un versement
  ne doit jamais apparaître comme un gain ;
- `priceIndex`, `realValue` = valeur × 100 / indice des prix (pouvoir d'achat du départ).

`summarizePeriod(points, from, to)` produit le bilan de rendez-vous : valeur au dernier bilan,
valeur aujourd'hui, versements nets, effet du marché (hors versements), performance, variation du
pouvoir d'achat. Exemple : « Au dernier bilan : 100. Aujourd'hui : 96. Tu n'as rien versé ; le
marché a fait −4 %. Pendant ce temps, les prix ont monté de 1 %. »

`alternativeOutcomes` (« Et avec d'autres choix ? ») : mêmes versements aux mêmes dates, 100 %
sur chaque support, sans arbitrage. À montrer **uniquement au bilan final**, avec « personne ne
pouvait savoir à l'avance », jamais pendant la simulation, jamais pour culpabiliser.

### 8.6 Inflation et intérêts composés (sans marché)

`compoundInterestTable(100, 0.04, 3)` → 100 ; 104 ; 108,16 ; 112,49 (et `simpleInterestTable`
pour comparer : 100 ; 104 ; 108 ; 112). `inflationTable`, `priceAfterInflation`,
`purchasingPower` : « Tes 100 unités restent 100. Mais le goûter qui coûtait 10 coûte
maintenant 11. » Ces tableaux sont toujours présentés comme « si ça montait de 4 % chaque année »,
jamais comme une prévision.

---

## 9. Arrondis et affichage

- **Calcul** : flottants double précision non arrondis (parts, valeurs de part, valeurs).
  Aucun arrondi intermédiaire, sinon les écarts s'accumulent.
- **Stockage des snapshots** : valeurs brutes (colonne `Float`/double). L'arrondi est une affaire
  d'affichage.
- **Affichage** : `roundUnits` (2 décimales, « moitié vers l'extérieur », sans l'erreur binaire
  1,005 → 1,00) et `formatUnitsFr` : `108,40`, `1 234,50` (espace fine insécable). Pour les
  8-9 ans : entiers (`formatUnitsFr(x, 0)` → `108`). Pourcentages : `toPercent` à 1 décimale
  (« +4,1 % »), toujours avec le signe.
- **Cohérence** : une somme affichée (ex. répartition en %) peut ne pas faire exactement 100 %
  après arrondi. Afficher « ≈ » ou ajuster le plus gros poste (méthode du plus grand reste),
  jamais le calcul.
- Unité toujours nommée : « unités école », jamais « € », « euros » ou « pièces ».

---

## 10. Intégration : stockage et snapshots (proposition pour l'API)

Tables suggérées (remplacent `SimulationScenario` / `SimulationPortfolio` / `SimulationTransaction`) :

- **`SimulationRun`** : `id`, `childId`, `householdId`, `mode` (`MIROIR` | `ASSURANCE_VIE`),
  `engineVersion`, `parametersFingerprint`, `seed` (serveur uniquement), `scenario` (caché
  jusqu'à la fin), `horizonMonths`, `rhythm`, `timeZone`, `startedAt`, `pauses` (Json),
  `fees` (Json), `contributionCap`, `marketPath` (Json, **figé**), `status`
  (`EN_COURS` | `TERMINEE` | `ARRETEE`), `finishedAt`, `createdById`.
- **`SimulationOperation`** (journal immuable, même philosophie que le ledger, mais **table
  distincte**) : `id`, `runId`, `step`, `type`, `amount`, `amountPerMonth`, `allocation` (Json),
  `actorId`, `idempotencyKey` (unique), `createdAt`. Jamais modifiée ni supprimée.
- **`SimulationSnapshot`** : `runId`, `rendezVousIndex`, `step`, `scheduledAt`,
  `valueAtReveal`, `bySupport` (Json), `contributed`, `withdrawn`, `fees` (Json),
  `performanceIndex`, `priceIndex`, `realValue`, `engineVersion`, `computedAt` ;
  unique `(runId, rendezVousIndex)`.

**Création** : `seed = randomBytes(16)`, `scenario = pickScenario({ seed: `${childId}:${n}`,
history })`, `marketPath = generateMarketPath(...)` (journaliser si `accepted === false`),
persister le tout dans une transaction avec le versement initial.

**Quand persister un snapshot** : en rattrapage paresseux, à chaque lecture ou écriture sur la
simulation. Dans la transaction :

1. `state = clockState({ rhythm, startAt, now, horizonMonths, timeZone, pauses })` ;
2. pour chaque rendez-vous `k` de (dernier snapshot, `state.rendezVousCount`] :
   `step = stepAtRendezVous(rhythm, k, horizon)`, valoriser avec les opérations d'étape ≤ step,
   insérer `points[step].valueAtReveal` et les autres champs. Idempotent grâce à la contrainte
   unique ;
3. optionnellement, un job planifié fait la même chose aux heures de rendez-vous pour envoyer
   les notifications.

Le snapshot est la **preuve** de ce que l'enfant a vu. Il n'est jamais recalculé ni réécrit.

**Enregistrer une décision** : dans une transaction, recalculer `state`, fixer
`step = state.revealedSteps` côté serveur (jamais fourni par le client), valider en rejouant
`valuePortfolio` avec l'opération ajoutée (erreurs `FinanceSimError`), vérifier le plafond, puis
insérer avec la clé d'idempotence. Refuser toute décision si `finished` ou si le statut n'est
pas `EN_COURS`.

**Réponses API** : `revealMarket(path, state.revealedSteps)`, les `points` jusqu'à
`revealedSteps`, le résumé depuis le dernier bilan vu, `nextRendezVousAt`. Pour le parent :
les mêmes données (le parent ne voit pas le futur non plus). Isolation par foyer vérifiée sur
chaque endpoint.

**Version** : une simulation reste sur la version et la trajectoire de sa création. Un
changement de version ne s'applique qu'aux nouvelles simulations. Pas de migration des
trajectoires.

---

## 11. Reproductibilité et versionnage

- **PRNG** : hachage cyrb128 de la seed texte, puis générateur sfc32 (entiers 32 bits). Flux
  dérivés : `market|seed|scénario|horizon|tentative`, `scenario-pick|seed`.
- **Loi normale** : somme de 12 uniformes moins 6 (Irwin-Hall). Variance exactement 1, bornée à
  ±6σ, kurtosis 2,9 (au lieu de 3) : négligeable ici, car les queues épaisses viennent des
  régimes. Avantage décisif : **aucune** fonction transcendante (`Math.log`, `Math.cos`,
  `Math.exp`, `Math.pow`) dans la génération. Les implémentations de ces fonctions peuvent
  varier d'un moteur JavaScript à l'autre, alors que +, −, ×, ÷ et √ sont exactement arrondis
  par IEEE 754.
- **Valeurs épinglées** : un test fige 3 nombres d'une trajectoire de référence au bit près.
- **Empreinte des paramètres** (`PARAMETERS_FINGERPRINT`) : hachage d'un JSON à clés triées de
  tous les paramètres (régimes, constantes, chaînes, phases des scénarios, échelle de risque,
  rythmes). Un test l'épingle avec `ENGINE_VERSION`. Modifier un paramètre sans changer de
  version fait échouer la suite.
- **Règle de version** `finsim-MAJEUR.MINEUR.CORRECTIF` : MAJEUR = modèle changé ; MINEUR =
  paramètres recalibrés, critère d'acceptation modifié ou scénario ajouté ; CORRECTIF = sans
  effet sur les nombres. Les critères d'acceptation sont du code, non couvert par l'empreinte :
  toute modification impose aussi un changement de version (relecture de code).
- **Audit** : `(seed, scenario, horizonMonths, engineVersion)` suffit à régénérer la
  trajectoire, et la trajectoire figée en base permet de vérifier l'égalité.

---

## 12. API du module (`financeSim/index.ts`)

```ts
generateMarketPath({ seed, scenario, horizonMonths /* 24..120 */, maxAttempts? }): MarketPath
revealMarket(path, revealedSteps): RevealedMarket                     // seule vue exposable
valuePortfolio({ market, operations, fees, untilStep?, contributionCap? }): PortfolioValuation
summarizePeriod(points, fromStep, toStep): PeriodSummary
compareWithAndWithoutFees(input): { withFees, withoutFees, gap }
alternativeOutcomes(input): Record<SupportCode, number>
checkAllocation(allocation): FinanceSimErrorCode | null
portfolioRiskLevel(allocation): 1..5          referenceVolatility(allocation): number
pickScenario({ seed, history, pool? }): ScenarioCode      assertBalancedPool(pool)
clockState({ rhythm, startAt, now, horizonMonths, timeZone, pauses? }): ClockState
listRendezVous(rhythm, startAt, count, { timeZone, pauses? }): Date[]
projectedEndDate(rhythm, startAt, horizonMonths, opts)   stepAtRendezVous(rhythm, k, horizon)
compressionFactor(rhythm)   realDaysForHorizon(rhythm, months)   simulatedElapsed(step)
compoundInterestTable / simpleInterestTable / feeDragTable / inflationTable
priceAfterInflation / purchasingPower / roundUnits / roundTo / toPercent / formatUnitsFr
ENGINE_VERSION, PARAMETERS_FINGERPRINT, SUPPORTS, REGIME_PARAMS, SCENARIOS, RHYTHMS
```

Erreurs : `FinanceSimError` (`code` : `ALLOCATION_INVALID`, `ALLOCATION_SUM`,
`AMOUNT_INVALID`, `STEP_INVALID`, `NO_TARGET_ALLOCATION`, `FEES_INVALID`), `MarketPathError`,
`ClockError`, `ScenarioPoolError`. À traduire en 400 avec un message i18n.

---

## 13. Plan de tests

Existant (`npx vitest run src/lib/financeSim`, 46 tests, < 2 s) :

| Fichier | Couvre |
|---|---|
| `market.test.ts` | PRNG déterministe, loi normale ; trajectoire déterministe ; valeurs épinglées au bit près ; empreinte des paramètres ; aucune valeur NaN, nulle ou négative (8 scénarios × 3 horizons) ; acceptation rapide ; Sécurisé jamais en baisse avant frais ; échelle annuelle des rendements (compression du temps, pas des rendements) ; horizon invalide ; aucune fuite du futur ; pureté du module (aucun import hors dossier) |
| `portfolio.test.ts` | Frais sur versement, de gestion (exacts), d'arbitrage, arbitrages gratuits ; avec frais < sans frais à chaque étape ; indice de performance insensible aux versements ; versements programmés (début, arrêt) ; plafond parental ; retrait plafonné et retrait total ; fuzz de décisions aléatoires sans NaN ni négatif ; pouvoir d'achat ; « et avec d'autres choix » ; codes d'erreur |
| `clock.test.ts` | Facteurs de compression ; même marché quel que soit le rythme ; heure locale au changement d'heure ; mercredi et samedi ; délai minimal ; pauses ; étapes révélées, fin, prochain rendez-vous ; fuseau inconnu |
| `balance.test.ts` | Risqué derrière Sécurisé 35-65 % du temps sur le sac ; scénarios nettement favorables et défavorables ; mode réaliste entre 15 et 45 % ; diversification (3 assertions) ; sac équilibré, ouverture, pas de répétition ; pool déséquilibré refusé |
| `pedagogy.test.ts` | 100 → 104 → 108,16 → 112,49 ; frais 148,02 / 133,87 ; inflation ; arrondis et format FR ; niveau de risque de chaque support et d'un mélange |

À ajouter côté API (intégration) :

- isolation par foyer : un enfant ou parent du foyer A ne peut ni lire ni modifier une simulation
  du foyer B (404) ;
- aucune réponse ne contient `seed`, `scenario` (avant la fin), `marketPath` ou une étape
  > `revealedSteps` (test de sérialisation) ;
- idempotence : une même `idempotencyKey` rejouée → aucun effet ;
- l'étape d'une décision est fixée par le serveur (un `step` envoyé par le client est ignoré) ;
- snapshots : rattrapage idempotent sous requêtes concurrentes ; jamais réécrits ;
- aucune `WalletTransaction` créée par un endpoint de simulation (compter avant/après) ;
- aucune `XpTransaction` liée à une valeur ou une performance ;
- plafond parental respecté, simulation terminée non modifiable.

---

## 14. Limites assumées

- **Modèle stylisé** : 7 régimes et 4 facteurs ne reproduisent ni les dividendes, ni les devises,
  ni le crédit, ni les secteurs. Les chiffres sont des ordres de grandeur arrondis, pas une
  calibration statistique sur données réelles.
- **Normalité conditionnelle** : pas de krach d'un jour ; les queues épaisses viennent du
  mélange de régimes. Au pas mensuel, c'est acceptable.
- **Fréquences pédagogiques** : le sac surreprésente crises et stagnations (§5). C'est assumé
  et doit être dit au parent.
- **Sécurisé lissé** : aucune baisse de marché modélisée. Dans la réalité, les garanties d'un
  fonds en euros dépendent du contrat et de l'assureur (voir l'autre document).
- **Frais simplifiés** : un seul taux de gestion (pas de distinction contrat / fonds), pas de
  frais de rachat, pas de fiscalité ni de prélèvements sociaux.
- **Exécution au prix affiché**, pas à la prochaine valeur de part.
- **Pas de rééquilibrage automatique**, pas de gestion pilotée, pas de versements hebdomadaires.
- **Le nom d'un régime décrit une tendance moyenne** : à l'échelle d'un semestre, le bruit peut
  dominer (une « reprise » peut avoir un semestre négatif, cf. §6.4).
- **Horizon 2 à 10 ans** : en dessous, les scénarios n'ont pas la place de se déployer ; au-dessus,
  la durée réelle devient trop longue pour un enfant.
- **Horloge** : pas de jours fériés ni de vacances scolaires automatiques (pauses manuelles du
  parent) ; jours et heures identiques pour tous les jours d'un rythme.

---

## 15. Décisions ouvertes (à trancher par l'utilisateur)

- **D1. Sens de « Panier Monde » / « Entreprises ».** A : Monde = très nombreuses entreprises du
  monde entier, Entreprises = quelques entreprises (leçon de concentration, implémenté).
  B : Monde = mélange actions + obligations, Entreprises = actions en général.
  *Recommandation : A* (B ferait doublon avec la répartition que l'enfant construit lui-même).
- **D2. Fréquence des scénarios.** A : sac pédagogique équilibré par défaut (tous les marchés
  vécus, risqué derrière ≈ 1 fois sur 2), mode réaliste proposé aux 11-13 ans. B : fréquences
  réalistes pour tous (risqué derrière ≈ 1 fois sur 3 sur 5 ans). *Recommandation : A*, avec la
  mention au parent.
- **D3. Prix d'exécution d'une décision.** A : valeur affichée (simple). B : valeur du prochain
  rendez-vous (comme une vraie valeur liquidative). *Recommandation : A* pour les 8-10 ans ;
  B peut devenir une leçon « assurance-vie » plus tard.
- **D4. Frais par défaut en simulation miroir.** A : sans frais par défaut, frais introduits
  dans une leçon dédiée et en mode assurance-vie. B : frais « exemple » toujours actifs.
  *Recommandation : A.*
- **D5. Scénario visible par le parent avant la fin.** A : non, il le découvre au bilan comme
  l'enfant (sauf en mode leçon, où il l'a choisi). B : oui, dès le départ. *Recommandation : A.*
