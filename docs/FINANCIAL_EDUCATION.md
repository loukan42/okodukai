# Éducation financière — Okodukai

> Pédagogie de « Mon argent », le premier faux compte bancaire de l'enfant.
>
> Ce document fixe **quoi apprendre, dans quel ordre, à quel moment, avec quels mots et comment le récompenser**.
> - Écrans, microcopies détaillées, bibliothèque de wording : `INVESTMENT_UX.md`.
> - Mécaniques chiffrées (rendements, frais, inflation, rythmes, capital) : `FINANCIAL_SIMULATION_ENGINE.md` et `INSURANCE_LIFE_SIMULATION.md`. Pour un **chiffre**, ils font foi. Pour un **mot montré à l'enfant**, ce document fait foi.
> - Lieux et objets illustrés : `ART_BIBLE.md` (bourse, registre, coffre du campement, observatoire, verger du temps long, bibliothèque de l'observatoire).
>
> Public : 8-12 ans (cœur 8-10). Tranches produit `AGE_8_9` → niveau **Découverte**, `AGE_10_12` → niveau **Approfondi**. Le parent peut changer le niveau (voir §4.1).
>
> Supports du moteur (`apps/api/src/lib/financeSim/supports.ts`) : `SECURISE` Sécurisé (risque 1), `PRETER` Prêter / obligations (2), `MONDE` Panier Monde / fonds (4), `ENTREPRISES` Entreprises / actions (5). Rythmes : `RAPIDE`, `STANDARD`, `LONG` (`clock.ts`).

---

## 1. Principes directeurs

1. **On apprend en faisant, on explique quand ça arrive.** Aucun cours avant l'action. Une notion est expliquée au moment où l'enfant la rencontre dans son propre argent (sa première baisse, ses premiers frais), en 1 à 3 phrases. Ensuite, elle est rangée dans la bibliothèque, où l'enfant peut la relire.
2. **Trois lieux, trois verbes.** *Mon compte* sert à **utiliser**, *Mon coffre* à **mettre de côté**, *Mes placements école* à **répartir et observer**. Chaque écran et chaque ligne d'historique appartiennent à un seul de ces lieux.
3. **Deux monnaies et deux horloges, jamais additionnées.** Les pièces sont réelles dans l'économie familiale et suivent le calendrier réel (« mardi 14 octobre »). Les unités école sont fictives et suivent le temps simulé (« Année 3 »). Aucun écran ne les additionne, ne les convertit ou ne les met dans la même liste.
4. **Le temps avance seul.** La valeur des placements change uniquement lors de **relevés** que le serveur déclenche au rythme choisi par le parent. L'enfant ne peut ni accélérer le temps ni « relancer ». Entre deux relevés, rien ne bouge, et l'interface le dit.
5. **On récompense la compréhension, jamais la chance.** XP, badges et progression récompensent ce que l'enfant découvre, explique ou explore. Une hausse de marché ne rapporte rien. Une baisse ne coûte rien.
6. **Même traitement pour la hausse et la baisse.** Elles ont le même poids visuel et des phrases de même longueur. Il n'y a ni son, ni animation de fête, ni alarme.
7. **Le vrai mot finit toujours par arriver.** La métaphore de la vallée ouvre la porte. Le mot simple fait comprendre. Le vrai mot, celui de la banque, est ensuite appris et réutilisé.
8. **Regarder en arrière, jamais prédire.** On explique ce qui s'est passé dans l'histoire simulée de l'enfant. On ne projette jamais **son** portefeuille dans le futur. Tout calcul d'exemple porte l'étiquette « Exemple, pas une prévision ».
9. **Le parent règle le cadre, l'enfant décide dedans.** Le parent choisit les modules actifs, le rythme et les règles du coffre. L'enfant choisit ses répartitions, ses transferts et quand il lit ses bilans.
10. **Le serveur décide.** Soldes, valeurs, variations, frais, intérêts, bonnes réponses aux vérifications et XP sont calculés côté serveur. Le client ne fait que formater et afficher.

---

## 2. Objectifs d'apprentissage

### 2.1 Résultats observables (le test final)

Après plusieurs semaines d'usage, un enfant de 10 ans doit pouvoir dire les huit phrases ci-dessous avec ses propres mots. Chaque phrase est reliée :
- à un **comportement observable** dans l'app ;
- à une **vérification légère** (banque de questions, §9).

Aucune phrase n'est notée. Le parent voit seulement un état : *Pas encore rencontré* / *Découvert* / *Sait l'expliquer*.

| # | Phrase | Ce qu'on observe dans l'usage | Vérification | Tranche |
|---|---|---|---|---|
| P1 | « Mon compte, c'est ce que je peux utiliser. » | Quand il manque des pièces pour une récompense, l'enfant reprend d'abord des pièces de Mon coffre au lieu d'essayer d'acheter directement. | Q01 | toutes |
| P2 | « Mon coffre, c'est ce que j'ai décidé de mettre de côté. » | Au moins un transfert volontaire vers Mon coffre et un objectif créé. | Q02 | toutes |
| P3 | « Mes placements peuvent monter ou descendre. » | A vu au moins une hausse et une baisse et a ouvert leur explication. | Q04, Q05 | toutes |
| P4 | « Je peux répartir mon argent. » | A validé une répartition sur au moins 2 supports, ou l'a modifiée lors d'un bilan. | Q08b (8-9) / Q08 (10-12) | toutes |
| P5 | « Mettre tout au même endroit peut augmenter certains risques. » | A vu l'encart « tout au même endroit » (T20) ou l'effet de répartition (T27). | Q07 | 8-9 sans le mot, 10-12 avec « diversification » |
| P6 | « Un placement peut avoir des frais. » | A vu une ligne de frais et ouvert la comparaison avec / sans frais. | Q09 | 10-12 |
| P7 | « Les prix peuvent augmenter avec le temps. » | A lu un bilan annuel avec la liste du marché. | Q10 | 10-12 |
| P8 | « Je n'ai pas besoin de regarder mes placements toutes les cinq minutes. » | Ses visites de l'observatoire se concentrent autour des relevés. C'est un indicateur agrégé, jamais montré à l'enfant comme un score. | Q13 | toutes |

Pour les 8-9 ans, le test porte sur P1 à P5 et P8. Pour les 10-12 ans, il porte sur les huit phrases.

### 2.2 Idées fausses à empêcher

| Idée fausse | Contre-mesure de design |
|---|---|
| « Mes placements école peuvent me rapporter des pièces. » | Aucune conversion possible. Rappel à l'onboarding. Q04. Deux totaux séparés dans « Tout ce que je possède ». |
| « Mettre au coffre, c'est dépenser. » | Un transfert est affiché comme un changement de place, pas comme une sortie (§11.4). Q02. |
| « Si ça baisse, c'est que je me suis trompé. » | T25 : « Ce n'est pas une erreur de ta part. » Aucun jugement du choix. |
| « Le niveau de risque le plus haut rapporte le plus. » | L'échelle de risque ne parle jamais de rendement. Q06. |
| « Si j'attends assez longtemps, ça remonte toujours. » | Les textes sur l'horizon ne promettent rien (T41). |
| « Plus je regarde, plus ça bouge. » | Valeurs figées entre deux relevés, T29, Q13. |
| « Les versements, c'est ce que mon placement a rapporté. » | Pour les 10-12 ans, « Versé » et « Valeur » sont toujours séparés (T40, Q16). |
| « Sécurisé ne sert à rien parce qu'il monte peu. » | Stabilité et pouvoir d'achat sont expliqués tous les deux, sans jugement de valeur. |
| « Mon frère a plus que moi, donc il a mieux joué. » | Aucun écran de comparaison, ni côté enfant ni côté parent. |

---

## 3. Catalogue des notions

Chaque notion a un code stable, qui sert pour la progression, l'XP, le carnet et la vue parent. « Âge » indique l'âge minimal auquel le **mot** est montré. Une notion peut être vécue plus tôt, sans son mot.

| Code | Notion | Mot appris par l'enfant | Âge | Chapitre | Déclencheur principal |
|---|---|---|---|---|---|
| `compte` | Compte disponible | « Mon compte » | 8 | 1 | Première ouverture |
| `solde` | Solde | « solde » | 8 | 1 | T01 |
| `entree` | Entrée | « entrée » | 8 | 1 | T01 |
| `sortie` | Sortie | « sortie » | 8 | 1 | T02 |
| `historique` | Historique | « historique » (10-12 : « relevé de compte ») | 8 | 1 | T08 |
| `transfert` | Transfert entre ses propres lieux | « transfert » | 8 | 2 | T03 |
| `epargne` | Épargne | « épargner », « épargne » | 8 | 2 | T05 |
| `objectif` | Objectif d'épargne | « objectif » | 8 | 2 | T04 |
| `unites_ecole` | Monnaie de simulation séparée | « unités école » | 8 | 3 | Onboarding |
| `placement` | Placement | « placement » | 8 | 3 | Onboarding |
| `support` | Support | « support » | 8 | 3 | Onboarding |
| `repartition` | Répartition | « répartir » | 8 | 3 | Onboarding |
| `releve` | Relevé (moment de valorisation) | « relevé » | 8 | 3 | T22 |
| `hausse_baisse` | Variation | « monter », « baisser » | 8 | 3 | T23, T24 |
| `risque` | Risque = amplitude des variations | « risque », niveau 1 à 5 | 8 | 3 | Fiche support |
| `concentration` | Tout au même endroit | 8-9 : phrase sans mot | 8 | 3 | T20, T27 |
| `patience` | Pas besoin de regarder souvent | — | 8 | 4 | T29 |
| `temps_long` | Attendre longtemps | « attendre longtemps » | 8 | 4 | T41 |
| `pourcentage` | Pourcentage | « pour cent », « % » | 10 | 5 | T30 |
| `rendement` | Rendement | « rendement » | 10 | 5 | T31 |
| `volatilite` | Volatilité | « volatilité » | 10 | 5 | T24 |
| `obligation` | Obligation | « obligation » | 10 | 5 | T42 |
| `action` | Action | « action » | 10 | 5 | T42 |
| `fonds` | Fonds | « fonds » | 10 | 5 | T42 |
| `diversification` | Diversification | « diversification » | 10 | 5 | T20, T27 |
| `allocation` | Allocation | « allocation » | 10 | 5 | T43 |
| `profil_risque` | Profil prudent / équilibré / dynamique | « profil » | 10 | 5 | Bibliothèque, après `allocation` |
| `latent` | Plus- ou moins-value latente ou réalisée | « plus-value », « moins-value », « latente » | 10 | 5 | T26 |
| `patrimoine` | Patrimoine | « patrimoine » | 10 | 5 | T44 |
| `interets` | Intérêts | « intérêts » | 10 | 6 | T32 |
| `capitalisation` | Intérêts composés | « capitalisation », « intérêts composés » | 10 | 6 | T33 |
| `frais` | Frais | « frais de gestion » | 10 | 6 | T34 |
| `inflation` | Inflation | « inflation » | 10 | 6 | T35 |
| `pouvoir_achat` | Pouvoir d'achat | « pouvoir d'achat » | 10 | 6 | T36 |
| `arbitrage` | Arbitrage | « arbitrage » | 10 | 7 | T37 |
| `reequilibrage` | Rééquilibrage | « rééquilibrer » | 10 | 7 | T38 |
| `versement_regulier` | Versements programmés | « versement programmé » | 10 | 7 | T39 |
| `verse_vs_valeur` | Versé ≠ valeur | « versé », « valeur » | 10 | 7 | T40 |
| `horizon` | Horizon | « horizon », « durée de placement recommandée » | 10 | 7 | T41 |
| `assurance_vie` | Assurance-vie | « assurance-vie », « contrat », « enveloppe » | 10 | 8 | T45 |
| `fonds_euros_uc` | Fonds en euros et unités de compte | idem | 10 | 8 | Enveloppe : 1re répartition |

---

## 4. Progression par âge et par usage

### 4.1 Trois règles

1. **L'âge fixe un plafond.** Le niveau Découverte (8-9) ne montre jamais de pourcentage, de graphique en courbe, de frais, d'inflation, d'arbitrage, de versement ni d'assurance-vie. Le niveau Approfondi (10-12) débloque tout, **au fil de l'usage**.
2. **L'usage débloque.** Une fonctionnalité apparaît quand l'enfant a fait ce qui la rend compréhensible. Une notion s'explique quand l'événement correspondant arrive dans son propre argent.
3. **Le parent ajuste.** Le réglage « Niveau pédagogique » vaut par défaut « Automatique selon l'âge ». Le parent peut choisir « Découverte » pour un enfant de 10 ans ou « Approfondi » pour un enfant de 9 ans prêt. Il peut aussi débloquer manuellement l'observatoire.

**Conditions interdites :** « après 7 jours », « le lundi », « après 3 connexions », « au niveau 5 ». Le calendrier et l'assiduité ne débloquent rien. Seul le **rythme des relevés**, choisi par le parent, cadence le temps simulé.

### 4.2 États d'une notion (stockés côté serveur)

```
inconnue ──(événement vécu)──▶ rencontrée ──(encart lu ou fiche ouverte)──▶ expliquée ──(vérification réussie)──▶ vérifiée
```

- **Rencontrée** : l'événement a eu lieu (par exemple, le premier frais a été prélevé). L'encart est en file d'attente.
- **Expliquée** : l'enfant a lu l'encart (« J'ai compris ») ou la fiche de la bibliothèque. Le mot entre dans son carnet.
- **Vérifiée** : l'enfant a répondu juste à la vérification de la notion, quel que soit le nombre d'essais. Seule cette étape donne de l'XP (§7).

Suggestion de modèle : `FinanceNotionProgress { childId, notionCode, state, encounteredAt, explainedAt, verifiedAt, anchor }`. `anchor` garde le souvenir personnel (« Relevé de l'année 2 : Entreprises −6 % ») affiché dans le carnet.

### 4.3 Paliers de fonctionnalités (le vrai verrou)

| Palier | Ce qui apparaît | Tranche | Se débloque quand… |
|---|---|---|---|
| F1 | Mon compte, historique | toutes | Dès le premier jour |
| F2 | Mon coffre, objectifs, transferts | toutes | Dès le premier jour, si le parent a activé le coffre |
| F3 | Observatoire (Mes placements école) | toutes | Placements activés par le parent **et** au moins 1 transfert vers Mon coffre **et** Q02 réussie. Le parent peut aussi forcer le déblocage. |
| F3b | Supports Prêter et Panier Monde (si l'option « découverte progressive » est retenue, voir la décision D3 d'`INVESTMENT_UX.md`) | 8-9 | Premier bilan lu |
| F4 | « Changer ma répartition » dans un bilan | 8-9 | 2 bilans lus |
| F5 | Pourcentages, courbe, « Tout ce que je possède » | 10-12 | Dès F3 |
| F6 | Arbitrage à tout moment (appliqué au relevé suivant) | 10-12 | 3 bilans lus **et** les 4 fiches support ouvertes |
| F7 | Comparateur de frais, liste du marché, effet boule de neige | 10-12 | Premier bilan annuel (fin de l'année simulée 1) |
| F8 | Versements programmés | 10-12 | Versements activés par le parent **et** notion `arbitrage` ou `allocation` vérifiée |
| F9 | Verger du temps long (assurance-vie simulée) | 10-12 | Activé par le parent **et** notions `diversification`, `frais` et `horizon` vérifiées **et** au moins 2 années simulées |

### 4.4 Chapitres du carnet (regroupement, pas verrou)

Les chapitres regroupent les notions dans la bibliothèque et dans la vue parent. Un chapitre est **terminé** quand toutes ses notions de la tranche sont vérifiées. L'enfant reçoit alors un tampon dans son carnet et de l'XP (§7).

| Ch. | Titre enfant | Tranche | Notions |
|---|---|---|---|
| 1 | Mon compte | toutes | compte, solde, entree, sortie, historique |
| 2 | Mon coffre | toutes | transfert, epargne, objectif |
| 3 | L'observatoire | toutes | unites_ecole, placement, support, repartition, releve, hausse_baisse, risque, concentration |
| 4 | Le temps | toutes | patience, temps_long |
| 5 | Les vrais mots | 10-12 | pourcentage, rendement, volatilite, obligation, action, fonds, diversification, allocation, profil_risque, latent, patrimoine |
| 6 | Ce qui grignote, ce qui fait grandir | 10-12 | interets, capitalisation, frais, inflation, pouvoir_achat |
| 7 | Décider dans la durée | 10-12 | arbitrage, reequilibrage, versement_regulier, verse_vs_valeur, horizon |
| 8 | Le verger du temps long | 10-12 | assurance_vie, fonds_euros_uc |

### 4.5 Quand l'événement attendu n'arrive pas

Certaines notions dépendent d'un événement de marché, comme une baisse. Si l'événement n'est pas arrivé après **6 relevés lus**, la notion peut être rencontrée **dans l'histoire** d'un support : la fiche support montre une baisse passée de l'histoire simulée partagée (« Dans l'histoire de la vallée, Entreprises a déjà baissé ainsi »). On ne fabrique jamais un faux événement dans le portefeuille de l'enfant pour « faire la leçon ».

### 4.6 Passage de 8-9 à 10-12

Quand le profil passe en `AGE_10_12`, ou quand le parent choisit « Approfondi » :
- le portefeuille et l'historique continuent sans rupture ;
- au bilan suivant, un encart unique fait le pont : « Tes 100 unités de départ, c'était 100 %. Désormais, tu verras aussi les pourcentages. » ;
- les notions 10-12 deviennent *rencontrables* : les événements futurs les déclenchent, et les fiches déjà vues affichent maintenant leur vrai mot ;
- les frais simulés s'appliquent à partir de la **partie suivante**, car le barème de frais et la trajectoire d'une partie sont figés à sa création. Rien n'est rétroactif. L'encart T34 apparaît au premier prélèvement. L'inflation existe déjà dans toute trajectoire du moteur : elle devient simplement visible (liste du marché) au bilan annuel suivant.

---

## 5. Pédagogie contextuelle

### 5.1 Règles d'affichage des encarts

- **Forme** : un « feuillet de la bibliothèque », c'est-à-dire un encart dans la page, jamais une fenêtre modale sauf pendant l'onboarding. Il contient un titre (le mot introduit s'il y en a un), 1 à 3 phrases, parfois une ligne « Dans la vraie vie… », et deux actions : « J'ai compris » et « Plus tard ».
- **Une fois** : chaque encart s'affiche une seule fois par enfant (journal côté serveur), puis reste relisible dans la bibliothèque.
- **Un par écran** : au plus un encart par écran visité et par bilan. S'il y en a plusieurs, on les met en file d'attente pour les bilans suivants, dans cet ordre de priorité : **(1) réassurance** (T25, T28) → **(2) séparation des monnaies** (T26) → **(3) nouvelle notion dans l'ordre des chapitres** → **(4) le reste**.
- **Jamais bloquant, jamais incitatif** : un encart n'empêche aucune action et ne pousse jamais à acheter, vendre ou arbitrer.
- **Âge** : un encart dont la colonne est « — » pour la tranche ne s'affiche pas.
- **Variables** : toutes les valeurs (`{v}`, `{d}`, `{p}`…) viennent du serveur. `{d}` s'affiche sans signe dans une phrase (« a baissé de 4 ») et avec signe dans une étiquette (« −4 »).

### 5.2 Mon compte et Mon coffre

| ID | Événement (détecté par le serveur) | Message 8-9 | Message 10-12 | Mot | Où |
|---|---|---|---|---|---|
| T01 | Première entrée sur Mon compte | « Des pièces sont arrivées sur ton compte : c'est une entrée. Ce que tu as sur ton compte s'appelle ton solde. » | idem | entrée, solde | Accueil, sous le solde |
| T02 | Première sortie (achat) | « Des pièces sont sorties de ton compte : c'est une sortie. Ton solde est passé de {avant} à {après}. » | idem | sortie | Historique ou confirmation d'achat |
| T03 | Premier transfert vers Mon coffre | « Tes {n} pièces sont dans Mon coffre. Tu as toujours autant de pièces en tout : elles ont changé de place. Cela s'appelle un transfert. » | idem | transfert | Confirmation de transfert |
| T04 | Premier objectif créé | « Ton objectif : {titre}, {cible} pièces. Chaque pièce mise dans Mon coffre t'en rapproche. » | idem | objectif | Mon coffre |
| T05 | Objectif atteint | « Objectif atteint : {cible} pièces dans Mon coffre. Tu as mis de côté pour plus tard : cela s'appelle épargner. Pour utiliser ces pièces, remets-les d'abord sur Mon compte. » | idem, + « L'argent mis de côté s'appelle l'épargne. » | épargner, épargne | Mon coffre |
| T06 | Retrait du coffre alors que l'objectif n'est pas atteint | « C'est ton choix. Ton objectif t'attend : il te manque maintenant {manque} pièces. » | idem | — | Confirmation de retrait |
| T07 | Tentative d'achat avec un compte insuffisant | « Il te manque {manque} pièces sur Mon compte. » + si le coffre suffit et que la règle permet le retrait : « Tu en as {coffre} dans Mon coffre. Tu peux en reprendre. » | idem | — (renforce P1) | Boutique |
| T08 | Première ouverture de l'historique | « Ici, tu vois tout ce qui est entré et sorti de ton compte. C'est ton historique. » | « … C'est ton historique. À la banque, on reçoit la même chose : un relevé de compte. » | historique, relevé de compte | Historique |
| T09 | Correction par un parent | « {parent} a corrigé ton compte : {signe}{n} pièces. Raison : {raison}. L'ancienne ligne reste visible : un historique ne s'efface pas. » | idem | — | Historique |
| T10 | Achat refusé, pièces remboursées | « Ta demande « {récompense} » n'a pas été acceptée. Tes {n} pièces sont revenues sur ton compte : c'est un remboursement. » | idem | remboursement | Historique, notification existante |

### 5.3 Mes placements école

| ID | Événement | Message 8-9 | Message 10-12 | Mot | Où |
|---|---|---|---|---|---|
| T20 | Répartition à 100 % sur un seul support autre que Sécurisé | « Tu mets tout au même endroit. Si cet endroit baisse, tout ton placement baisse. Tu peux garder ce choix. » | « Tu mets 100 % sur un seul support. S'il baisse, tout ton portefeuille baisse avec lui. Répartir sur plusieurs supports s'appelle la diversification. Tu peux garder ce choix. » | diversification (10-12) | Atelier, au-dessus du bouton, sans le désactiver |
| T21 | Répartition à 100 % sur Sécurisé | « Tout sur Sécurisé : ton placement bougera très peu. Il grandira aussi très lentement. Tu peux garder ce choix. » | « 100 % Sécurisé : ton portefeuille variera très peu. Il grandira aussi lentement. Être très prudent a aussi des effets, que tu découvriras avec le temps. Tu peux garder ce choix. » | — | Atelier |
| T22 | Premier relevé | « Voici ton premier relevé. On regarde ce qui a changé depuis ta répartition. » | idem | relevé | Bilan |
| T23 | Première hausse du total | « Ton placement a monté cette fois. Ça ne veut pas dire qu'il montera toujours. » | idem | monter | Bilan |
| T24 | Première baisse d'un support | « {support} a baissé cette fois. Certains placements montent et descendent avec le temps. » | « … Ces mouvements s'appellent la volatilité. Plus le niveau de risque est élevé, plus ils peuvent être forts. » | baisser, volatilité (10-12) | Bilan |
| T25 | Première baisse du total | « Ton placement vaut moins qu'au relevé d'avant. Ce n'est pas une erreur de ta part. Tes pièces n'ont pas bougé. » | idem | — | Bilan (priorité 1) |
| T26 | Première fois sous la valeur de départ (ou sous le total versé) | « Ton placement vaut moins qu'au départ : {v} au lieu de {départ}. Il peut encore bouger, dans un sens ou dans l'autre. Tes pièces ne sont pas touchées. » | « Ton portefeuille vaut moins que ce que tu as versé. On parle de moins-value. Tant que tu ne changes rien, elle peut encore évoluer : on dit qu'elle est latente. » | moins-value latente (10-12) | Bilan |
| T26b | Première fois au-dessus du total versé (10-12), si T26 n'a pas déjà introduit « latente » | — | « Ton portefeuille vaut plus que ce que tu as versé : c'est une plus-value. Tant que tu ne changes rien, elle peut encore évoluer : elle est latente. » | plus-value latente | Bilan |
| T27 | Au moins un support en hausse et un en baisse, total stable ou léger | « Certains ont monté, d'autres ont baissé. Au total, ton placement a peu bougé. C'est l'avantage de ne pas tout mettre au même endroit. » | « Certains supports ont monté, d'autres ont baissé. Au total, ton portefeuille a peu bougé : c'est l'effet de ta diversification. » | diversification (10-12) | Bilan |
| T28 | Forte baisse du total (au-delà du seuil « fort », voir `INVESTMENT_UX.md` §0.4) | « C'est une grosse baisse. Ça arrive avec certains placements. Tu n'as rien à faire tout de suite. » | « C'est une forte baisse. Ça arrive. Tu n'as rien à décider tout de suite. Si tu changes de support maintenant, la baisse devient définitive pour la partie déplacée : on dit que la perte est réalisée. » | perte réalisée (10-12) | Bilan, et atelier ou arbitrage s'il est ouvert pendant la même période (priorité 1) |
| T29 | 3 ouvertures ou plus de l'observatoire depuis le dernier relevé (au plus une fois par période et par semaine réelle) | « Rien n'a changé depuis ta dernière visite : la valeur bouge seulement au relevé. Prochain relevé : {jour}. » | idem | — (P8) | Haut de l'observatoire. Jamais de compteur de visites affiché. |
| T30 | Premier relevé affiché avec des % | — | « +4,2 %, ça veut dire : 4,2 unités de plus pour 100 unités. Tes 100 unités de départ, c'était 100 %. » | pourcentage | Bilan |
| T31 | Première année simulée terminée | « Une année s'est écoulée dans ta partie. Ton placement est passé de {début} à {fin}. » | « Une année simulée s'est écoulée. Ton portefeuille a changé de {p} sur l'année : c'est son rendement. Un rendement peut être positif ou négatif. » | rendement (10-12) | Bilan annuel |
| T32 | Premiers intérêts versés (Sécurisé ou Prêter) | « Sécurisé a ajouté un petit supplément à ta part. Il fait ça un peu à chaque fois. » | « {support} t'a versé un petit supplément : ce sont des intérêts. » | intérêts (10-12) | Bilan |
| T33 | Deuxième année d'intérêts (intérêts sur intérêts > 0) | — | « Cette année, tes intérêts ont été calculés sur ce que tu avais placé, et aussi sur les intérêts de l'an dernier. C'est la capitalisation, qu'on appelle aussi les intérêts composés. » | capitalisation | Bilan annuel, lien vers l'effet boule de neige |
| T34 | Premiers frais visibles dans un bilan. Le moteur prélève les frais de gestion chaque mois (1/12 du taux annuel) : l'encart attend dans la file que le chapitre 3 soit terminé. | — | « Des frais ont été retirés : −{f} unité sur la période. C'est le prix de la gestion de ton placement. Ils sont retirés un peu chaque mois, même quand le placement baisse. » | frais de gestion | Bilan, lien vers le comparateur |
| T35 | Premier bilan annuel avec la liste du marché | — | « La liste du marché coûtait {a} unités école. Elle en coûte maintenant {b}. Quand la plupart des prix montent avec le temps, on parle d'inflation. » | inflation | Bilan annuel |
| T36 | Comparaison entre la croissance du portefeuille et l'inflation (premier bilan annuel après T35) | — | Si plus bas : « Ton portefeuille a grandi de {p1}. Les prix ont grandi de {p2}. Avec lui, tu peux acheter un peu moins de choses qu'avant : ton pouvoir d'achat a baissé. » Si plus haut : « … un peu plus de choses qu'avant : ton pouvoir d'achat a augmenté. » | pouvoir d'achat | Bilan annuel |
| T37 | Premier arbitrage programmé | — | « Tu as prévu de déplacer de la valeur d'un support à un autre. Cela s'appelle un arbitrage. Il sera appliqué au prochain relevé. » (+ « Des frais d'arbitrage de {x} seront retirés. » si l'option est active) | arbitrage | Confirmation de l'arbitrage |
| T38 | Répartition qui a dérivé d'au moins 10 points par rapport à la répartition choisie | — | « Ta répartition a bougé toute seule : {support} représentait {p0}, il représente maintenant {p1}. Les supports n'ont pas évolué au même rythme. Revenir à ta répartition choisie s'appelle rééquilibrer. » | rééquilibrer | Bilan |
| T39 | Premier versement programmé reçu | — | « {n} unités école sont arrivées et ont été placées selon ta répartition. Ajouter un peu à intervalles réguliers s'appelle un versement programmé. » | versement programmé | Bilan |
| T40 | Premier relevé après le premier versement | — | « Attention à ne pas confondre : tu as versé {versé}, ton portefeuille vaut {v}. Seule la différence ({d}) vient des mouvements des placements. » | versé, valeur | Bilan |
| T41 | Première ouverture de « durée recommandée » **ou** forte baisse dans les 2 dernières années de la partie | « Certains supports sont faits pour attendre longtemps. Sur peu de temps, ils peuvent être plus bas qu'au départ au moment où tu regardes. » | « Le temps que tu prévois d'attendre avant d'utiliser un placement s'appelle l'horizon. Sur un horizon court, un support qui bouge beaucoup a plus de risques d'être en baisse au moment où tu en as besoin. Attendre longtemps ne garantit rien, mais laisse aux hauts et aux bas le temps de se compenser, parfois. » | horizon (10-12) | Fiche support, bilan |
| T42 | Première ouverture d'une fiche support (10-12) | — | « Dans la vraie vie, on appelle ça {vrai mot}. » (Prêter : « des obligations » · Entreprises : « des actions » · Panier Monde : « un fonds » · Sécurisé : « une épargne sécurisée ») | obligation, action, fonds | Fiche support |
| T43 | Première répartition validée (10-12) | — | « La façon dont tu répartis ton capital entre les supports s'appelle l'allocation. » | allocation | Récapitulatif de l'onboarding |
| T44 | Première ouverture de « Tout ce que je possède » | — | « Tout ce que tu possèdes s'appelle ton patrimoine. Ici, il est en deux parties qui ne s'additionnent pas : les pièces et les unités école. » | patrimoine | Tout ce que je possède |
| T45 | Ouverture du verger du temps long | — | « Une assurance-vie est une enveloppe pour placer sur de longues années. À l'intérieur, on choisit des supports, comme dans l'observatoire. » | assurance-vie | Verger |
| T46 | Fin de partie | « Ta partie est terminée. Voici tout ce qui s'est passé, et tout ce que tu as appris. » | idem | — | Bilan final |

---

## 6. Échelle de vocabulaire

### 6.1 De la métaphore au vrai mot

Les lieux viennent d'`ART_BIBLE.md`. La colonne « Vrai mot » indique entre parenthèses l'âge à partir duquel il est montré.

| Métaphore (vallée d'Okodukai) | Mot simple | Vrai mot |
|---|---|---|
| La bourse de l'aventurier | l'argent que je peux utiliser | compte (8), solde (8) |
| Le registre (carnet relié) | la liste de ce qui est entré et sorti | historique (8), relevé de compte (10) |
| Une pièce qui arrive dans la bourse | ce qui rentre | entrée (8), crédit (10) |
| Une pièce qui quitte la bourse | ce qui sort | sortie (8), débit (10), dépense (8) |
| Porter des pièces de la bourse au coffre | changer de place | transfert (8), virement (10) |
| Le coffre du campement | ce que j'ai décidé de garder pour plus tard | épargne, épargner (8) |
| Le fanion au bout du chemin | ce que je veux obtenir | objectif d'épargne (8) |
| Les jetons d'étude | des unités pour apprendre | unités école (8), jamais « argent » |
| L'observatoire | l'endroit où je regarde mes placements | placements (8), portefeuille (10) |
| Les quatre lieux de la vallée vus depuis la tour | les endroits où je place | support (8) |
| La tour de garde en pierre | ce qui bouge très peu | épargne sécurisée (10), fonds en euros (10, dans l'enveloppe seulement) |
| Le pont en construction | prêter, puis être remboursé avec un supplément | obligation (10), intérêts (10) |
| Le marché aux mille échoppes | un petit peu de beaucoup d'entreprises | fonds (10), indice (10, dans « Dans la vraie vie » seulement) |
| Les trois ateliers d'artisans | un morceau de quelques entreprises | action (10), actionnaire (10) |
| L'établi de l'atelier | décider combien je mets où | répartir (8), allocation (10) |
| Des jetons dans plusieurs casiers | ne pas tout mettre au même endroit | diversification (10) |
| La feuille tamponnée sur le pupitre | le moment où l'on regarde ce qui a changé | relevé (8) |
| L'amplitude de l'aiguille | à quel point ça bouge | risque (8), volatilité (10) |
| — | combien ça a changé, sur 100 | pourcentage (10), rendement (10) |
| La petite part du gardien de l'observatoire | ce que coûte le placement | frais de gestion, frais d'arbitrage, frais sur versement (10) |
| Le supplément rendu par le pont | le petit supplément | intérêts (10) |
| La boule de neige | les suppléments qui font eux-mêmes des suppléments | capitalisation, intérêts composés (10) |
| La liste du marché | les prix qui montent | inflation (10) |
| Ce que la liste permet d'acheter | ce que je peux acheter avec | pouvoir d'achat (10) |
| Déplacer des jetons d'un lieu à l'autre | changer ma répartition | arbitrage (10), rééquilibrer (10) |
| La caravane régulière de l'école | ajouter un peu à chaque fois | versement programmé (10) |
| Le sablier | combien de temps j'attends | horizon, durée de placement recommandée (10) |
| « Sur le papier » | ce que ça vaudrait si je changeais maintenant | plus-value ou moins-value latente, réalisée (10) |
| Tout ce que je possède | tout ce que j'ai | patrimoine (10) |
| Prudent, équilibré, dynamique | ma façon de répartir | profil de risque (10) |
| Le verger du temps long | une enveloppe pour attendre longtemps | assurance-vie, contrat (10), unités de compte (10, avec avertissement) |

### 6.2 Règles d'introduction

- **Toujours la même formule** pour le vrai mot : « Cela s'appelle… » ou « Dans la vraie vie, on appelle ça… ». L'enfant reconnaît le moment où il apprend un mot.
- **Après vérification**, les libellés de l'interface montrent le vrai mot à côté du nom de jeu. Exemple 10-12 : « Prêter · obligations ».
- **La métaphore reste dans l'illustration, jamais dans les chiffres.** Les montants portent toujours les noms fonctionnels : Mon compte, Mon coffre, Mes placements école.
- **Une entrée du carnet** (bibliothèque) contient : le mot, « Ce que ça veut dire » (1 phrase), « Où tu l'as rencontré » (souvenir personnel daté, par exemple « Bilan de l'année 2 : Entreprises a baissé de 6 % ») et « Dans la vraie vie » (1 phrase).

### 6.3 Pièges de nommage (à respecter partout)

| Piège | Règle |
|---|---|
| « unités de compte » (vrai terme de l'assurance-vie) contre « unités école » | Le terme n'apparaît que dans le verger, pour les 10-12 ans, avec toujours la mention : « Rien à voir avec tes unités école. » |
| « Panier Monde » (support) contre panier de l'inflation | L'inflation utilise **la liste du marché**, jamais « panier ». |
| « Mon coffre » contre Sécurisé ou assurance-vie | On n'appelle jamais « coffre » un support ou l'enveloppe. « Mon coffre » désigne uniquement l'épargne en pièces. |
| « Gagner » | Réservé aux pièces obtenues par les quêtes (l'effort). Un placement « augmente » ou « monte » ; il ne « gagne » pas. |
| « Perdre » | Jamais « Tu as perdu ». On écrit « Sa valeur a baissé ». « Perte » n'est employé que comme mot technique (« perte réalisée ») pour les 10-12 ans. |
| « Investir » | L'interface dit « placer » et « placement ». « Investir » n'apparaît que dans « Dans la vraie vie » (10-12). |
| « Risque » | Toujours relié à « varier ». Jamais utilisé comme menace (« dangereux », « risqué ! »). |
| « Mon compte » | Seulement pour les pièces disponibles. Pas de « compte école » ni de « compte titres ». |
| Mots contenant « euros » (« fonds en euros ») | Seulement dans une ligne « Dans la vraie vie », sans aucun montant. |

---

## 7. Récompenser l'apprentissage

### 7.1 Ce qui donne de l'XP

Nouvelle source suggérée : `XpSourceType.FINANCE_LEARNING`. Toute XP passe par `grantXp` avec une clé d'idempotence.

| Action | XP | Clé d'idempotence | Limite |
|---|---|---|---|
| Notion **vérifiée** (bonne réponse à sa vérification, quel que soit le nombre d'essais) | 10 | `fin:notion:{childId}:{notion}` | 1 fois par notion |
| Première ouverture d'une fiche support (exploration) | 5 | `fin:explore:{childId}:support:{code}` | 1 fois par support |
| Première utilisation d'un outil : historique filtré, Tout ce que je possède, comparateur de frais, liste du marché, effet boule de neige, horizon | 5 | `fin:explore:{childId}:tool:{code}` | 1 fois par outil |
| Première répartition validée (onboarding et Q04 terminés) | 20 | `fin:onboarding:{childId}` | 1 fois |
| Bilan lu jusqu'au bout, question d'observation répondue | 5 | `fin:bilan:{childId}:{releveId}` | 2 au plus par semaine réelle, quel que soit le rythme |
| Chapitre du carnet terminé | 25 | `fin:chapter:{childId}:{n}` | 1 fois par chapitre |
| Bilan final d'une partie lu | 20 | `fin:partie:{childId}:{partieId}` | 1 fois par partie |
| Objectif d'épargne atteint | règle existante `SAVINGS_GOAL` | existante | Montant fixe, indépendant de la taille de l'objectif |

Ordre de grandeur : un parcours complet 10-12 représente environ 700 XP répartis sur plusieurs semaines, soit moins que les quêtes. Les quêtes restent le moteur principal de progression.

### 7.2 Ce qui ne donne jamais d'XP, de badge, de booster ni de pièce

- Une hausse de valeur, un rendement, le fait de passer au-dessus du départ, une partie terminée « en positif ».
- Le choix d'un support ou d'une répartition, y compris une répartition diversifiée. On récompense la **compréhension** de la diversification (Q07), pas le fait de l'appliquer.
- Le fait de garder ou de vendre après une baisse.
- Le nombre de visites, de jours consécutifs, de transferts ou d'arbitrages.
- Un montant épargné (une XP proportionnelle avantagerait les enfants qui reçoivent plus).
- Une réponse juste du premier coup : elle vaut autant qu'une réponse juste après explication.

### 7.3 Badges proposés

| Code | Titre | Condition |
|---|---|---|
| `premiere_repartition` | Première répartition | Onboarding validé et Q04 réussie |
| `lecteur_de_releves` | Lecteur de relevés | 5 bilans lus jusqu'au bout |
| `mots_du_metier` | Mots du métier | 10 vrais mots vérifiés |
| `oeil_sur_les_frais` | Œil sur les frais | Notion `frais` vérifiée et comparateur ouvert |
| `pouvoir_d_achat` | Pouvoir d'achat | Notions `inflation` et `pouvoir_achat` vérifiées |
| `temps_long` | Le temps long | Bilan final d'une partie lu, quel que soit le résultat |

Badges interdits : tout badge lié à une performance (« Investisseur gagnant », « +10 % », « Mains solides », « Sans jamais vendre »).

### 7.4 Boosters et cartes

Le module financier **n'attribue aucun booster ni aucune carte**, même pour un chapitre terminé. Les cartes reposent sur un tirage aléatoire : les associer aux placements mêlerait l'émotion du tirage et celle de la valorisation. L'XP d'apprentissage peut faire monter de niveau, et le niveau déclenche ses récompenses habituelles. C'est de la progression, pas de la chance.

### 7.5 Exigences serveur

- Les réponses justes des vérifications sont **stockées côté serveur**. Le client envoie l'identifiant de l'option choisie, le serveur décide et attribue l'XP. Voir l'écart constaté en §11.11.
- L'ordre des options est mélangé par le serveur.
- Le montant d'XP est identique quelle que soit la valeur du portefeuille : aucune donnée de marché n'entre dans le calcul.

---

## 8. Boucle d'habitude saine

### 8.1 Le rendez-vous (relevé)

| Élément | Règle |
|---|---|
| Déclencheur | Un moment **prévisible**, choisi par le parent (jours et heure, par défaut en fin d'après-midi), affiché partout : « Prochain relevé : jeudi. » Jamais la nuit, jamais pendant l'école. |
| Rythme | Rapide, Standard ou Long (réglage parent), définis dans `apps/api/src/lib/financeSim/clock.ts` : le moteur compresse le temps, jamais les rendements. Contraintes UX recommandées : **au plus 1 relevé par jour réel, au moins 1 par semaine, jamais pendant l'école ni après 19 h**. Valeurs du moteur `finsim-1.0.0` : STANDARD = 1 rendez-vous par jour à 17 h (6 mois simulés chacun) ; LONG = mercredi et samedi à 17 h (6 mois chacun) ; **RAPIDE = 4 rendez-vous par jour (8 h, 12 h, 16 h, 20 h, 3 mois chacun), ce qui ne respecte pas ces contraintes.** Recommandation : RAPIDE = 1 rendez-vous par jour à 17 h révélant 12 mois, soit la même vitesse d'un an simulé par jour. C'est la décision D1 d'`INVESTMENT_UX.md`. |
| Routine | Lire son bilan : moins de 2 minutes en 8-9, moins de 4 minutes en 10-12. Il se structure en 4 temps : ce qui a changé → une explication → une question d'observation facultative → une décision **facultative** (garder / changer). |
| Satisfaction | Un mot de plus dans le carnet, un tampon « lu » sur la feuille du relevé, la phrase finale « Rien ne bouge d'ici là ». La satisfaction vient d'avoir compris et d'avoir terminé, pas d'un gain. |
| Entre deux relevés | Les valeurs sont figées. L'observatoire affiche « Prochain relevé : {jour}. Rien ne bouge d'ici là. » |

### 8.2 Mon bilan

- **Bilan de relevé** : à chaque relevé, court.
- **Bilan annuel** : à chaque fin d'année simulée. En 10-12, il ajoute rendement, frais, intérêts et liste du marché.
- **Mon mois en pièces** : au premier bilan qui suit un changement de mois réel. Un volet séparé, au calendrier réel, sans jugement : « En octobre : 60 pièces sont entrées, 30 sont sorties, 20 sont allées dans Mon coffre. »
- **Bilan final** : à la fin de la partie, quand l'horizon simulé est atteint (voir `INVESTMENT_UX.md` E16).

### 8.3 Après une absence

- Les relevés manqués sont **fusionnés** en un seul bilan : « Depuis ta dernière visite : 3 relevés. Voici ce qui a changé en tout. »
- Les questions et encarts des relevés manqués ne s'accumulent pas. Seul l'encart prioritaire est montré, les autres rejoignent la file.
- Aucune formule du type « Tu as manqué… » ou « Ça fait longtemps… ».

### 8.4 Notifications

- Côté enfant : **désactivées par défaut**. Le parent peut les activer.
- Un seul texte possible : « Ton relevé est prêt. » Jamais de chiffre, de sens de variation ou d'emoji. Au plus une par relevé.
- Aucune notification pour un mouvement de marché, une « opportunité », un rappel d'inactivité ou un objectif « presque atteint ».
- Côté parent : pas d'alerte en cas de baisse. Les seules notifications parent concernent des actions à faire (par exemple une demande de retrait du coffre à valider) et le « Pour votre prochain échange » mensuel, si le parent l'a activé.

### 8.5 Le rendez-vous familial

À chaque bilan annuel, ou tous les 4 relevés en 8-9 :
- l'enfant voit « À raconter à tes parents : pourquoi Entreprises a baissé cette fois ? » (facultatif, sans XP) ;
- le parent voit dans sa vue « Pour votre prochain échange », par exemple : « Demandez à Léa pourquoi Entreprises a baissé alors que Sécurisé a monté. »

La discussion à la maison est la vérification la plus solide de la compréhension. L'app la prépare, elle ne la remplace pas.

### 8.6 Garde-fous anti-compulsion (structurels)

- Pas de valeur en temps réel, pas de rafraîchissement par glissement vers le bas sur l'observatoire.
- Pas de compte à rebours en heures, minutes ou secondes. On affiche le **jour** du prochain relevé.
- Une seule pastille « nouveau » : après un relevé non lu. Elle disparaît à l'ouverture du bilan.
- T29 rappelle calmement que rien n'a bougé, au plus une fois par semaine.
- Aucune XP liée à la fréquence des visites.
- Un seul arbitrage en attente à la fois, appliqué au relevé suivant. On ne peut pas « réagir » plusieurs fois dans la même période.

---

## 9. Vérifications de compréhension légères

### 9.1 Format

- **Une question, 2 ou 3 options, plus « Je ne sais pas encore »**, toujours en dernier. Les autres options sont mélangées par le serveur.
- **Au bon moment** : juste après l'événement ou l'encart concerné, ou comme question d'observation dans un bilan. Jamais en rafale, jamais plus d'une par écran.
- **Mauvaise réponse ou « Je ne sais pas encore »** : l'explication s'affiche tout de suite, avec un ton neutre (jamais « Faux ! »). La même notion revient plus tard sous une **variante** (autres nombres, autre support).
- **Pas de chronomètre, de vies, d'étoiles ou de score.**
- **Chiffres réels quand c'est possible** : on utilise les valeurs du portefeuille de l'enfant plutôt que des exemples abstraits (« Ton placement valait 104, il vaut 101… »).
- **Questions d'observation** dans un bilan : leur réponse se lit sur l'écran (« Quel support a le plus bougé cette fois ? »). Elles entraînent la lecture et donnent l'XP de bilan (§7.1).

### 9.2 Banque de questions

La bonne réponse est marquée ✓. Le retour affiché correspond à l'option choisie. Les variables viennent du serveur.

| ID | Notion | Tranche | Question | Options et retours |
|---|---|---|---|---|
| Q01 | compte (P1) | toutes | « Tu as 20 pièces sur Mon compte et 50 dans Mon coffre. Une récompense coûte 30 pièces. Que se passe-t-il ? » | ✓ « Je dois d'abord reprendre des pièces de Mon coffre. » → « Oui. Mon compte, c'est ce que tu peux utiliser tout de suite. » · « Je peux l'acheter tout de suite. » → « Pas encore : seules les pièces de Mon compte s'utilisent directement. Il faut d'abord reprendre 10 pièces de Mon coffre. » |
| Q02 | transfert (P2) | toutes | « Tu mets 10 pièces dans Mon coffre. Combien de pièces as-tu en tout ? » | ✓ « Autant qu'avant. » → « Oui. Tes pièces ont changé de place, le total ne change pas. » · « 10 de moins. » → « Non : elles ne sont pas dépensées, elles sont dans Mon coffre. » · « 10 de plus. » → « Non : tu n'as rien gagné, tu as déplacé des pièces. » |
| Q03 | entree, sortie | toutes | « Range chaque ligne : Quête « Mettre la table » +15 · Récompense « Soirée film » −30 · Vers Mon coffre 10. » | Réponse attendue : Entrée · Sortie · Transfert. Le retour est donné ligne par ligne : « Un transfert n'est ni une entrée ni une sortie : tes pièces changent de place. » |
| Q04 | unites_ecole (P3) | toutes | « Ton placement école a baissé. Et tes pièces ? » | ✓ « Elles ne bougent pas. » → « Oui. Les unités école servent à apprendre. Elles ne touchent jamais tes pièces. » · « Elles baissent aussi. » → « Non. Ce sont deux choses séparées : tes pièces ne bougent pas. » |
| Q05 | hausse_baisse (P3) | toutes | « Ton placement valait {avant}. Il vaut {après}. Que s'est-il passé ? » | ✓ « Il a baissé de {d}. » ou « Il a monté de {d}. » selon le cas · la mauvaise direction → « Regarde les deux nombres : {après} est plus petit (ou plus grand) que {avant}. » · « Il a perdu {après}. » → « Non : il n'a changé que de {d}. » |
| Q06 | risque | toutes | « Un support a un niveau de risque 5 sur 5. Qu'est-ce que ça veut dire ? » | ✓ « Sa valeur peut beaucoup bouger, vers le haut ou vers le bas. » → « Oui. Le niveau dit à quel point ça peut bouger, pas dans quel sens. » · « Il va forcément monter. » → « Non : personne ne sait dans quel sens il va bouger. » · « Il va forcément baisser. » → même retour. |
| Q07 | concentration / diversification (P5) | 8-9 et 10-12 | 8-9 : « Tout ton placement est sur Entreprises. Entreprises baisse beaucoup. Que fait ton placement ? » · 10-12 : « Tu as 100 % sur Entreprises. Entreprises baisse de 20 %. Ton portefeuille… » | 8-9 ✓ « Il baisse beaucoup aussi. » → « Oui, tout était au même endroit. En répartissant, une partie aurait pu moins bouger. » · 10-12 ✓ « baisse de 20 %. » → « Oui. Répartir sur plusieurs supports peut limiter cet effet : c'est la diversification. » · « ne bouge pas. » → « Si : tout était sur ce support. » |
| Q08 | pourcentage, repartition (P4) | 10-12 | « Tu as 100 unités. Tu en mets 30 sur Prêter. Quelle part est-ce ? » | ✓ « 30 % » → « Oui : 30 sur 100. » · « 3 % » ou « 70 % » → « Pour cent veut dire « sur 100 » : 30 sur 100, c'est 30 %. » |
| Q08b | repartition (P4) | 8-9 | « Tu as 100 unités école. Tu en mets 60 sur Sécurisé. Combien en reste-t-il à placer ? » | ✓ « 40 » · « 60 » ou « 160 » → « 100 moins 60, il en reste 40. » |
| Q09 | frais (P6) | 10-12 | « Deux portefeuilles ont eu exactement la même histoire. L'un a des frais, l'autre non. Lequel vaut le plus aujourd'hui ? » | ✓ « Celui sans frais. » → « Oui. Chaque année, les frais retirent une petite part. » · « Pareil. » → « Non : les frais sont retirés même si tout le reste est identique. » |
| Q10 | inflation, pouvoir_achat (P7) | 10-12 | « La liste du marché coûtait 100, elle coûte maintenant 105. Ton placement Sécurisé est passé de 100 à 103. Peux-tu acheter plus ou moins de choses qu'au départ ? » | ✓ « Un peu moins. » → « Oui. Ton placement a grandi moins vite que les prix : ton pouvoir d'achat a baissé. » · « Plus. » → « Il a grandi, mais les prix ont grandi plus vite. » |
| Q11 | capitalisation | 10-12 | « L'an dernier, tes intérêts ont été ajoutés à ton placement. Cette année, ils… » | ✓ « rapportent eux aussi des intérêts. » → « Oui : c'est la capitalisation. » · « disparaissent. » ou « ne comptent plus. » → « Ils restent dans ton placement et rapportent à leur tour. » |
| Q12 | horizon | 10-12 | « Tu auras besoin de tes unités dans 1 an. Quel support a le plus de risques d'être plus bas qu'au départ à ce moment-là ? » | ✓ « Entreprises. » → « Oui. Sur un horizon court, ce qui bouge beaucoup peut être en baisse au mauvais moment. » · « Sécurisé. » → « Sécurisé bouge très peu. » |
| Q13 | patience (P8) | toutes | « Entre deux relevés, que se passe-t-il si tu regardes tes placements 10 fois ? » | ✓ « Rien ne change. » → « Oui. La valeur change seulement au relevé. Tu n'as pas besoin de regarder toutes les cinq minutes. » · « Ils montent. » ou « Ils baissent. » → même explication. |
| Q14 | arbitrage | 10-12 | « Arbitrer, c'est… » | ✓ « déplacer de la valeur d'un support à un autre. » · « transformer des unités en pièces. » → « Impossible : les unités école ne deviennent jamais des pièces. » · « ajouter des unités. » → « Ça, c'est un versement. » |
| Q15 | assurance_vie | 10-12 | « Dans ce jeu, le verger du temps long sert surtout à… » | ✓ « placer sur de longues années. » · « dépenser vite. » ou « gagner des pièces. » → « C'est une enveloppe pour attendre longtemps. Elle ne donne jamais de pièces. » |
| Q16 | verse_vs_valeur | 10-12 | « Tu as versé 150 unités. Ton portefeuille vaut 162. Combien viennent des mouvements des placements ? » | ✓ « 12 » · « 162 » ou « 150 » → « Ce que tu as versé n'est pas un gain : seule la différence vient des placements. » |

---

## 10. Anti-patterns interdits

| # | Interdit | Pourquoi | À la place |
|---|---|---|---|
| 1 | Célébrer une hausse : confettis, son, pluie d'or, « Bravo », « Super ! », « JACKPOT » | Cela récompense la chance et installe le frisson du gain. | Une phrase sobre, au même format qu'une baisse. |
| 2 | Dramatiser une baisse : rouge vif, vibration, icône d'alerte, « Attention ! », « Oh non » | Cela crée de l'anxiété et pousse à réagir. | Une phrase calme, un fait, et le rappel que les pièces n'ont pas bougé. |
| 3 | Révéler une valeur comme un tirage : suspense, « Touche pour découvrir », compteur qui défile, animation de cristal | Cela confond valorisation et hasard récompensé, c'est le réflexe de la machine à sous. | Le chiffre s'affiche directement, en fondu de 220 ms au plus. |
| 4 | Vocabulaire du jeu d'argent : miser, parier, tenter sa chance, gros lot, casino, roulette, dés | Cela fait passer le placement pour un jeu de hasard. | Placer, répartir, observer. |
| 5 | Récompense (XP, badge, booster, carte, pièce) liée à une hausse, une performance ou un choix de support | Cela apprend que la chance mérite une récompense. | Voir §7. |
| 6 | Valeurs en temps réel, bandeau défilant, rafraîchissement par glissement | Cela pousse à vérifier sans cesse. | Des relevés programmés. |
| 7 | Bouton « Avancer le temps », « Relevé suivant » ou « Rejouer » à la demande | Cela devient un levier de machine à sous. | Le temps avance côté serveur. |
| 8 | Notification de variation (« Ton portefeuille a pris 5 % ! ») ou avec un chiffre | C'est une récompense variable envoyée dans la poche. | « Ton relevé est prêt. » si le parent l'a activé. |
| 9 | Compte à rebours en heures, minutes ou secondes | Cela crée de l'urgence. | « Prochain relevé : jeudi. » |
| 10 | Pastille « nouveau » permanente, série de jours, récompense de connexion, « Reviens demain » | Cela crée une compulsion. | Rien. |
| 11 | « Tu ne t'es pas connecté », « Tu as manqué 3 relevés », « Tu as trop dépensé », « Tu aurais dû… », « Dommage » | Cela culpabilise. | « Depuis ta dernière visite… » |
| 12 | Juger un retrait du coffre (« Tu abandonnes ton objectif ? ») | C'est son argent et sa décision. | « C'est ton choix. Ton objectif t'attend. » |
| 13 | Refus culpabilisant (« Non merci, je préfère ne pas épargner ») | C'est de la manipulation. | Deux choix neutres de même poids. |
| 14 | Montrer après coup la répartition « idéale » (« Tu aurais eu 30 de plus avec… »), mettre en avant la meilleure option, calculer un « meilleur mélange » | Cela installe le regret et l'idée qu'on pouvait savoir. | Au bilan final seulement (10-12) : les 4 résultats « tout sur un seul support » (`alternativeOutcomes` du moteur), rangés par niveau de risque, sans mise en avant et avec « Personne ne pouvait savoir à l'avance » (`INVESTMENT_UX.md` E16). |
| 15 | Classement ou comparaison entre enfants, frères et sœurs, « moyenne des enfants », « mieux que 80 % » | C'est un invariant produit. | Aucune donnée sur les autres. |
| 16 | Partager ses performances | Comparaison sociale. | Aucun partage. |
| 17 | Projeter le portefeuille de l'enfant (« Dans 10 ans, tu auras… ») | C'est une fausse promesse. | Des exemples étiquetés, sans lien avec son portefeuille. |
| 18 | « Garanti », « sans risque », « sûr », « ça remonte toujours », « à long terme on gagne toujours » | C'est faux ou trompeur. | Les formulations sur l'horizon (T41). Sécurisé « varie très peu ». |
| 19 | « Plus de risque = plus de gains », « meilleur rendement » | C'est une promesse déguisée. | « Plus le niveau est élevé, plus la valeur peut varier fortement. » |
| 20 | Support « conseillé », répartition par défaut pré-remplie, bouton « répartition recommandée » | C'est un choix fait à la place de l'enfant. | Rien de pré-rempli. Les supports sont rangés par niveau de risque. |
| 21 | Conversion ou somme entre pièces et unités école, entre pièces et euros, symbole €, « vrai argent » chiffré | C'est un invariant produit. | Deux totaux séparés. |
| 22 | Inflation simulée appliquée aux prix de la boutique familiale | Cela mélange les deux monnaies. | La liste du marché, en unités école uniquement. |
| 23 | Couleur seule pour + et − | Accessibilité, et lecture d'un relevé réel. | Signe, flèche et mot (§11.3). |
| 24 | Graphique à l'échelle trompeuse (axe zoomé qui transforme −0,5 % en chute) | Cela dramatise. | Une échelle honnête (`INVESTMENT_UX.md` §0.5). |
| 25 | Bouton « Tout vendre » mis en avant ou coloré d'urgence | Cela pousse à la vente panique. | Des actions neutres, de même poids. |
| 26 | Frais cachés, regroupés ou non détaillés | C'est l'inverse de la leçon. | Chaque frais a sa ligne dans l'historique. |
| 27 | Vraies marques, vraies entreprises, vrais codes boursiers, crypto, effet de levier, vente à découvert, « trading » | Hors périmètre et risqué. | Les entreprises imaginaires de la vallée. |
| 28 | Mascotte qui réagit émotionnellement aux variations (triste quand ça baisse) | Cela transfère l'émotion sur l'enfant. | Le décor reste calme quelle que soit la valeur. |

---

## 11. Recommandations pour Mon compte, Mon coffre et l'historique

### 11.1 Noms

- **« Mon compte »** remplace « Dans ma bourse » / « Dans ta bourse » dans les libellés. La bourse de cuir reste l'**illustration** du lieu (`ART_BIBLE.md`). En 8-9, la phrase d'accueil est « J'ai 82 pièces ».
- **« Mon coffre »** est conservé tel quel, partout.
- **« Historique »** est le titre de la liste. En 10-12, le sous-titre « Ton relevé de compte » apparaît après T08.
- **Pluriel français** : « 0 pièce », « 1 pièce », « 2 pièces » (utiliser `Intl.PluralRules('fr')`).

### 11.2 Lire une ligne d'historique

```
[icône de sens]  Quête « Mettre la table »                 +15
                 Entrée · Hier                              Solde après : 97   (10-12)
```

| Élément | Règle |
|---|---|
| Libellé principal | **Ce qui s'est passé**, avec la source nommée : titre de la quête, de la récompense, « Vers Mon coffre », « Correction de Maman ». On n'affiche jamais le code technique. |
| Type (mot) | « Entrée », « Sortie », « Transfert », « Remboursement », « Correction », « Bonus d'épargne ». Toujours écrit, jamais seulement suggéré par la couleur. |
| Icône de sens | Flèche qui entre dans la bourse (entrée), flèche qui en sort (sortie), double flèche (transfert), flèche retour (remboursement), crayon (correction). L'icône accompagne le mot, elle ne le remplace pas. |
| Montant | Signe explicite « + » ou « − » (U+2212), chiffres tabulaires alignés à droite. Jamais de parenthèses pour le négatif. |
| Date | 8-9 : « Aujourd'hui », « Hier », « Mardi ». 10-12 : en plus, des en-têtes de jour (« Mardi 14 octobre »). |
| Solde après | 10-12 : sur chaque ligne. 8-9 : dans le détail de la ligne. |
| Détail (appui sur la ligne) | Pour tous les âges : **Avant 82 · Mouvement +15 · Après 97**, plus la source, l'auteur et la raison. C'est le geste qui fait comprendre l'arithmétique d'un solde. |

### 11.3 Plus et moins sans dépendre de la couleur

Trois signaux redondants : **signe** (+ / −), **icône de sens** et **mot de type**. La couleur est facultative et peu saturée. Le **rouge est réservé aux erreurs** : une sortie n'est pas une erreur. Les sorties s'affichent à l'encre, avec le signe « − ». Lecteur d'écran : « Sortie, 30 pièces, Récompense Soirée film, lundi. »

### 11.4 Les transferts : changer de place n'est pas dépenser

Le signe dépend **du lieu regardé**, comme sur un vrai relevé :

| Vue | Affichage d'un transfert de 10 pièces vers le coffre |
|---|---|
| Historique de Mon compte | « Vers Mon coffre · Transfert · −10 » avec l'icône double flèche, **pas** l'icône de sortie |
| Historique de Mon coffre | « Depuis Mon compte · Transfert · +10 » |
| Vue « Tout mon argent » (les deux lieux) | Une seule ligne **sans signe** : « 10 pièces · Mon compte → Mon coffre », avec la mention « Ton total ne change pas. » |
| Résumés de période | Les transferts ne comptent **ni** dans les entrées ni dans les sorties. Ils forment une ligne à part : « Mis de côté : 20 · Repris : 5 ». |

### 11.5 Résumé de période (10-12)

En haut de l'historique : « Cette semaine : Entrées +40 · Sorties −25 · Différence +15 · Mis de côté 20 ». Des filtres permettent d'afficher : Tout / Entrées / Sorties / Transferts. En 8-9, on affiche les 10 dernières lignes et un bouton « Voir plus ». La limite actuelle de 30 lignes ne doit pas cacher l'historique : il faut paginer.

### 11.6 Cas particuliers

| Cas | Affichage |
|---|---|
| Achat demandé, pas encore validé (déjà débité côté serveur) | « Récompense « Soirée film » · Sortie · −30 · **En attente de validation** » |
| Achat refusé | Ligne « Remboursement · Récompense « Soirée film » refusée · +30 », reliée à la ligne d'origine, qui reste visible. |
| Correction parent | « Correction de {parent} · {signe}{n} · Raison : {raison} ». Le sens vient du champ `direction`. L'ancienne ligne reste affichée (T09). |
| Bonus d'épargne parent | Dans l'historique de **Mon coffre** : « Bonus d'épargne de {parent} · +{n} ». Jamais appelé « intérêts ». |

### 11.7 Mettre de côté et reprendre

- Des **boutons de montant** : « 5 », « 10 », « 20 », « Tout », plus un sélecteur +/−. Pas de champ numérique libre en 8-9.
- Un **aperçu avant validation**, obligatoire : « Mon compte : 82 → 72 · Mon coffre : 120 → 130 ».
- Le bouton nomme l'action : « Mettre 10 pièces dans Mon coffre » ou « Reprendre 10 pièces de Mon coffre ».
- Le client génère une **clé d'idempotence par intention**, et le bouton est désactivé pendant l'envoi : un double appui ne doit pas créer deux transferts.
- Confirmation : « C'est fait. 10 pièces sont dans Mon coffre. », puis T03 la première fois.

### 11.8 Règles du coffre fixées par le parent

La règle est montrée **avant** le dépôt, pas au moment du retrait. L'enfant dépose en connaissance de cause.

| Règle parent | Avant le dépôt | Au moment du retrait |
|---|---|---|
| Libre | (rien) | Retrait immédiat. |
| Avec validation | « Pour reprendre des pièces du coffre, un parent devra valider. » | « Demande envoyée. Un parent va la regarder. » puis « Ta demande est acceptée : 10 pièces sont revenues sur Mon compte. » ou « Ta demande n'a pas été acceptée. Tes pièces restent dans Mon coffre. » |
| Durée minimale | « Ces pièces resteront dans Mon coffre au moins {n} jours. » | « Ces pièces restent dans Mon coffre jusqu'au {date}. C'est la règle choisie avec tes parents. » |
| Seulement objectif atteint | « Tu pourras reprendre ces pièces quand ton objectif sera atteint. » | « Il te manque {manque} pièces pour ton objectif. Ensuite, tu pourras les reprendre. » Sans objectif actif, le retrait passe par la validation d'un parent. |

Une règle plus stricte ne s'applique qu'**aux pièces déposées après le changement** : on ne change pas les règles d'un dépôt déjà fait.

### 11.9 Objectifs

- Toujours trois nombres : **présent**, **cible**, **manque**. Par exemple « 120 sur 150 · Il te manque 30 pièces. » La barre de progression accompagne les nombres, elle ne les remplace pas.
- Quand l'objectif est lié à une récompense de la boutique : « Quand tu auras 150 pièces, remets-les sur Mon compte pour demander « Vélo ». »
- Objectif atteint : T05. Pas de pluie de confettis. L'illustration du fanion planté au bout du chemin (`ART_BIBLE.md`) suffit.

### 11.10 Messages d'erreur (API vers la phrase enfant)

| Erreur serveur | Phrase enfant |
|---|---|
| `Solde insuffisant` (dépôt au coffre) | « Il te manque {manque} pièces sur Mon compte pour en mettre {n} de côté. » |
| `Coffre insuffisant` (retrait) | « Mon coffre contient {coffre} pièces. Tu peux en reprendre jusqu'à {coffre}. » |
| Retrait bloqué par une règle | Voir §11.8. |
| Erreur réseau | « Ça n'a pas marché. Rien n'a changé : tes pièces sont au même endroit. » + « Réessayer ». |
| Chargement impossible | « Impossible d'afficher ton argent pour l'instant. Il n'a pas bougé. » + « Réessayer ». |

Pour afficher ces phrases, le serveur doit renvoyer les montants utiles (`manque`, `coffre`) avec l'erreur.

### 11.11 Écarts constatés dans le code actuel (à corriger lors de l'implémentation)

- `apps/web/src/pages/child/Home.tsx` et `Vault.tsx` : libellés « Dans ta bourse » et « Dans ma bourse » à remplacer par « Mon compte ».
- `Vault.tsx`, historique : le signe vient de `DEBIT_TYPES`, et le champ `direction` n'est pas lu. **Une `PARENT_ADJUSTMENT` au débit s'affiche donc « + ».** De plus, `SAVINGS_LOCK` apparaît comme une sortie « − » dans une liste qui mélange compte et coffre, et `SAVINGS_BONUS` (crédit du coffre) apparaît « + » sans dire où va l'argent. Il n'y a ni date ni solde après, et la liste est limitée à 30 lignes.
- `Vault.tsx`, transfert : champ numérique libre, aucun aperçu avant/après. `apps/api/src/routes/savings.ts` génère la clé d'idempotence côté serveur (`Date.now()` + aléa), donc un double appui crée deux transferts.
- `Learn.tsx` : la bonne réponse est toujours le premier bouton, et l'autre option est « Je ne sais pas ». Une mauvaise réponse ferme le module sans explication. `POST /child/learning/modules/:id/complete` (`apps/api/src/routes/learning.ts`) **croit le booléen `correct` envoyé par le client**, ce qui contredit « le serveur est l'autorité sur l'XP ».
- `apps/api/src/lib/devSeed.ts`, module `inflation` : l'exemple est en pièces (« Une glace coûte 10 pièces… 12 pièces »), ce qui laisse croire que les prix de la boutique familiale vont monter. Il faut le réécrire avec la liste du marché en unités école et le déclencher au premier bilan annuel (T35).
- `apps/api/src/routes/simulation.ts` : l'enfant choisit un profil puis fait avancer le temps par un clic (`POST …/advance`). Tout cela est remplacé par les relevés du serveur (`INVESTMENT_UX.md` §23).

---

## 12. Mesurer sans surveiller

Les indicateurs produit sont **agrégés et anonymes**, jamais affichés comme un score individuel :

- la part d'enfants qui réussissent Q04 (monnaies séparées) et Q06 (sens du risque) ;
- le nombre médian d'ouvertures de l'observatoire **par période entre deux relevés**, avec une cible **basse** (1 à 3). Une hausse de cet indicateur est un signal d'alerte, pas une réussite ;
- la part de bilans lus jusqu'au bout ;
- la part de notions vérifiées par chapitre.

On n'optimise jamais le temps passé dans l'app ni le nombre de sessions.
