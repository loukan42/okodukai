# Simulation d'assurance-vie pédagogique

Ce qu'Okodukai simule de l'assurance-vie, pour les 10-12 ans (bornes souples 9-13 ans), avec le
moteur `finsim` (`docs/FINANCIAL_SIMULATION_ENGINE.md`). Le parcours ludique et l'UX relèvent de
`docs/FINANCIAL_EDUCATION.md` et `docs/INVESTMENT_UX.md`. Ce document fixe **le fond** : ce qui
est simulé, ce qui est simplifié, les formulations exactes et les garde-fous.

Principe : les concepts doivent être **justes**, même simplifiés. Une simplification enlève un
détail, elle ne dit jamais quelque chose de faux.

---

## 1. Ce qu'est une assurance-vie (formulation de référence, pour les adultes)

L'assurance-vie est un **contrat** souscrit auprès d'un **assureur**. On y fait des
**versements**, qui sont placés sur un ou plusieurs **supports** choisis selon les règles du
contrat :

- le **fonds en euros**, géré par l'assureur (surtout investi en obligations). Dans la plupart des
  contrats, il comporte une **garantie en capital** donnée par l'assureur, dont l'étendue
  **dépend des règles du contrat** (par exemple, garantie avant ou après frais de gestion). Son
  rendement est fixé par l'assureur, en général une fois par an ; il varie d'une année à l'autre
  et n'est connu qu'après coup. Les intérêts déjà crédités restent en principe acquis ;
- les **unités de compte** (UC) : des parts de supports (fonds d'obligations, d'actions, etc.)
  dont la **valeur n'est pas garantie** et varie à la hausse comme à la baisse. L'assureur
  s'engage sur le **nombre** d'unités de compte, pas sur leur valeur : il existe un **risque de
  perte en capital**.

On peut en général **arbitrer** (déplacer l'argent d'un support à l'autre sans le sortir du
contrat), **retirer** tout ou partie de l'argent (le **rachat**) et payer des **frais** (sur
versement, de gestion, d'arbitrage selon les contrats). Le contrat prévoit aussi à qui revient
l'argent en cas de décès (la **clause bénéficiaire**) : c'est ce qui en fait un contrat
d'assurance.

L'assurance-vie est souvent utilisée sur plusieurs années. Des règles fiscales particulières
existent, notamment selon la durée du contrat : elles sont **hors périmètre** du simulateur et ne
sont jamais présentées comme un argument.

---

## 2. Ce qu'on simule

| Réalité | Dans Okodukai | Code |
|---|---|---|
| Le contrat, « l'enveloppe » | « Mon contrat école » : une enveloppe fictive qui contient les supports | `SimulationRun` en mode `ASSURANCE_VIE` |
| Fonds en euros | Support **Sécurisé** : valeur lissée, monte lentement, ne baisse pas avec les marchés dans la simulation | `SECURISE` (famille `FONDS_EUROS`) |
| Unités de compte obligataires | Support **Prêter** | `PRETER` |
| Unités de compte actions diversifiées | Support **Panier Monde** | `MONDE` |
| Unités de compte actions concentrées | Support **Entreprises** | `ENTREPRISES` |
| Valeur de part (valeur liquidative) | Valeur de part base 100, révélée à chaque rendez-vous | `market.prices` |
| Nombre de parts garanti, pas leur valeur | Le portefeuille détient des **parts** ; leur valeur bouge | `holdings` |
| Versement initial, versements libres | Versement ponctuel | `VERSEMENT` |
| Versements programmés | Versement mensuel automatique | `VERSEMENTS_PROGRAMMES` |
| Répartition entre supports | Répartition en % entiers, total 100 % | `Allocation` |
| Arbitrage | Nouvelle répartition de tout le contrat, frais sur le montant déplacé | `ARBITRAGE` |
| Rachat partiel ou total | Retrait au prorata des supports (10-12 ans seulement) | `RETRAIT` |
| Frais sur versement, de gestion, d'arbitrage | Les trois, paramétrables, comparables avec/sans | `FeeSchedule`, `compareWithAndWithoutFees` |
| Relevé annuel de situation | Un « relevé » à chaque année simulée : valeur, versé, frais payés, performance hors versements | `summarizePeriod` sur 12 étapes |
| Inflation | Indice des prix fictif, valeur en pouvoir d'achat | `priceIndex`, `realValue` |
| Horizon de placement | Horizon de 8 à 10 ans simulés (20 jours en rythme Standard) | `horizonMonths` 96-120 |

Paramètres conseillés pour ce mode : horizon 10 ans, rythme Standard ou Rapide,
`EXAMPLE_CONTRACT_FEES` (2 % sur versement, 0,8 %/an de gestion, 0,5 % par arbitrage). Pour la
leçon « comparer deux contrats », deux contrats fictifs (« Contrat A : 2 % sur versement » /
« Contrat B : 0 % sur versement, 1 %/an de gestion »), jamais nommés d'après un vrai assureur.

---

## 3. Ce qu'on simplifie volontairement, et pourquoi

| Simplification | Réalité | Pourquoi on simplifie | Ce qu'il ne faut pas en conclure |
|---|---|---|---|
| Sécurisé crédité chaque mois | Rendement du fonds en euros en général crédité une fois par an | Voir la progression à chaque rendez-vous | Que le rendement est connu d'avance : il ne l'est pas, même dans la simulation |
| Sécurisé ne baisse jamais avec le marché (avant frais) | Garantie en capital selon le contrat, solidité de l'assureur, règles exceptionnelles | Faire comprendre « ça bouge très peu » | Que c'est « garanti » ou « sans risque » : on ne dit jamais ça (§4) |
| Un seul taux de frais de gestion | Frais du contrat + frais propres à chaque fonds en UC | Lisibilité | Que les frais sont faibles : la leçon frais montre leur effet cumulé |
| Exécution au prix affiché | Arbitrages et rachats exécutés sur une prochaine valeur de part, avec un délai | Simplicité pour les 8-10 ans | Qu'on peut « choisir son prix » |
| Pas de fiscalité ni de prélèvements sociaux | Impôt sur les gains au rachat, prélèvements sociaux, règles liées à la durée | Hors de portée et non pédagogique à cet âge ; éviter tout conseil fiscal | Que les gains sont nets d'impôt |
| Pas de clause bénéficiaire | Élément central du contrat | Sujet sensible (décès), sans rapport avec la leçon d'épargne | Que l'assurance-vie n'est qu'un placement : dire « c'est un contrat d'assurance » |
| Pas de gestion pilotée, de rééquilibrage automatique, de taux minimum garanti, de bonus liés aux UC, d'euro-croissance | Options fréquentes selon les contrats | Garder 4 supports et des décisions de l'enfant | — |
| Retrait toujours possible et immédiat | En général possible à tout moment, avec un délai de versement ; la loi permet, dans des circonstances exceptionnelles, de limiter temporairement les retraits (dispositif issu de la loi Sapin 2) | Hors de portée des 10-12 ans | Mentionnable au parent si la question se pose |
| Pas de montant minimum de versement | Minimums variables selon les contrats | Inutile ici | — |
| Supports génériques | Des centaines de fonds réels | Interdiction de tout produit réel | — |

---

## 4. Formulations exactes : on dit / on ne dit jamais

| Sujet | On dit | On ne dit jamais |
|---|---|---|
| Sécurisé / fonds en euros (enfant) | « Sécurisé bouge très peu. Il monte doucement. » | « Tu ne peux pas perdre. » / « C'est garanti. » / « Sans risque. » |
| Fonds en euros (10-12, parent) | « Dans un vrai contrat, ce support s'appelle souvent le fonds en euros. L'assureur le protège des baisses des marchés, selon les règles écrites dans le contrat. » | « Le capital est garanti à 100 % dans tous les cas. » |
| Unités de compte | « Ces supports ont une valeur qui monte et qui descend. Tu gardes tes parts, mais la valeur de chaque part change. » | « Ça finit toujours par remonter. » |
| Risque | « Plus un support est risqué, plus sa valeur peut bouger, vers le haut comme vers le bas. » | « Plus c'est risqué, plus ça rapporte. » |
| Diversification | « Mettre dans plusieurs paniers rend les écarts plus petits. Ça n'empêche pas tout de baisser en même temps. » | « Diversifier, ça protège des pertes. » |
| Rendement passé | « Ce qui s'est passé avant ne dit pas ce qui va se passer ensuite. » | « Ça a monté l'an dernier, ça va continuer. » |
| Frais | « Les frais, c'est ce que tu paies pour le service. Ils sont pris même quand ça baisse. » | « Les frais ne comptent pas. » / « C'est gratuit. » |
| Arbitrage | « Tu déplaces ton argent d'un support à l'autre, sans le sortir du contrat. » | « Arbitrer, c'est retirer. » |
| Rachat | « Tu sors de l'argent du contrat. Ce qui est sorti ne travaille plus. » | Toute idée que les unités sorties deviennent des pièces ou des euros |
| Horizon | « Ce genre de contrat est souvent pensé pour plusieurs années. Sur une courte durée, tout peut arriver. » | « Il faut toujours garder 8 ans. » (conseil) |
| Crise | « Le marché a beaucoup baissé. Ça arrive. Personne ne sait quand il remontera. » | « Catastrophe ! » / « Tu as tout perdu ! » / « Vite, vends ! » |
| Gain / perte en cours | « C'est un gain sur le papier : il peut encore changer tant que tu n'as pas retiré. » | « Tu as gagné 30 unités » (pendant la simulation, en présentant le gain comme acquis) |
| Intérêts composés | « Si ça montait de 4 % chaque année : 100, puis 104, puis 108,16. » | « Tu vas avoir 112,49 dans 3 ans. » |
| Inflation | « Tes 100 unités restent 100. Mais les prix ont monté : elles achètent un peu moins. » | Toute équivalence unités ↔ euros ou pièces |

---

## 5. Progression du vocabulaire

Règle : **le mot simple d'abord, le vrai mot ensuite**, introduit par « Les adultes appellent
ça… ». Un vrai mot n'est jamais le premier contact avec une notion.

| Étape | Âge indicatif | Mots introduits |
|---|---|---|
| 1. Découvrir | 8-9 | placer, ça monte / ça baisse, attendre, Sécurisé, Prêter, Panier Monde, Entreprises, répartir, frais (« ce qu'on paie pour le service ») |
| 2. Comprendre | 9-10 | support, répartition, risque (« ça bouge beaucoup »), diversifier, intérêts, intérêts composés, prix qui montent (inflation), versement |
| 3. Décider | 10-11 | arbitrage, versement programmé, frais de gestion, frais sur versement, valeur de part, obligation, action, pouvoir d'achat, rendement, horizon |
| 4. Nommer le réel | 11-12 | contrat, enveloppe, assureur, assurance-vie, fonds en euros, unités de compte, rachat, perte en capital, volatilité, allocation |

Déblocage : par progression dans les modules, jamais par l'âge seul. Le parent peut avancer ou
reculer d'une étape.

---

## 6. Déroulé d'une simulation d'assurance-vie (contenu, pas UX)

1. **Ouvrir le contrat école** : l'enfant (ou le parent) crée l'enveloppe, avec un plafond de
   capital école fixé par le parent. Mentions de simulation affichées (§7.3).
2. **Premier versement et répartition** entre les 4 supports. Affichage du niveau de risque de
   la répartition avec son message (« ça peut bouger, dans les deux sens »). Aucune répartition
   n'est proposée comme « la bonne ».
3. **Versements programmés** (option) : l'enfant voit que l'argent ajouté n'est pas un gain
   (indice de performance séparé).
4. **Rendez-vous** : chaque rendez-vous révèle 3 ou 6 mois ; bilan « au dernier bilan / aujourd'hui ».
5. **Relevé annuel** à chaque année simulée : valeur, total versé, frais payés, performance hors
   versements, pouvoir d'achat.
6. **Arbitrage** (étape 3 du vocabulaire) : frais affichés avant confirmation (« Cet arbitrage
   coûte 0,25 unité »). Aucune alerte qui pousse à arbitrer pendant une baisse.
7. **Rachat partiel** (étape 4, optionnel) : les unités retirées sortent du contrat et ne vont
   nulle part ailleurs ; elles ne deviennent jamais des pièces.
8. **Bilan final** : nom du scénario vécu, total versé, valeur finale, frais payés, pouvoir
   d'achat, « et avec d'autres choix ? » (même versements, 100 % sur chaque support), message
   « personne ne pouvait savoir à l'avance ». Pas de note, pas d'XP liée au résultat.

Pour les 8-9 ans, la « simulation miroir » reste sans enveloppe ni vocabulaire assurance-vie :
supports, répartition, attente, bilan.

---

## 7. Garde-fous de conformité

### 7.1 Ce qu'Okodukai n'est pas

Okodukai n'est ni un assureur, ni un intermédiaire en assurance, ni un conseiller en
investissements financiers, ni un prestataire de services d'investissement. Il ne distribue,
ne compare ni ne recommande aucun produit réel. Conséquences :

- **Aucune recommandation personnalisée** : jamais « tu devrais mettre X % », « la meilleure
  répartition pour toi », ni questionnaire de « profil investisseur » qui débouche sur une
  répartition conseillée. Le niveau de risque décrit une répartition choisie ; il ne prescrit rien.
- **Aucun produit réel** : pas de nom d'assureur, de banque, de fonds, d'indice, d'entreprise,
  de code ISIN, ni de performance historique réelle présentée comme celle d'un support.
- **Aucun lien** vers un contrat réel : ni affiliation, ni publicité, ni formulaire de contact.
  Côté parent, pas de « ouvrir une assurance-vie pour votre enfant ».
- **Aucune équivalence** unités école ↔ euros ↔ pièces, sous aucune forme.

### 7.2 Mots et mécaniques interdits

- Mots : « garanti » (sauf dans la formulation exacte du §4 côté 10-12 ans et parent), « sans
  risque », « rendement assuré », « placement sûr », « meilleur placement », « gagner
  facilement », « investis maintenant », « ne rate pas ».
- Mécaniques : urgence, compte à rebours, notification qui annonce une hausse ou une baisse,
  classement, comparaison entre enfants, récompense (XP, badge, booster, carte) liée à une
  performance, « série » de connexions aux rendez-vous.

### 7.3 Mentions à afficher

| Où | Mention |
|---|---|
| Partout dans le simulateur (badge permanent) | « Simulation — unités école » |
| Création d'une simulation | « Ce n'est pas un vrai placement. Les unités école ne sont pas de l'argent et ne se transforment jamais en pièces. » |
| Premier contact avec un support qui bouge | « Dans la simulation comme dans la vraie vie, la valeur peut baisser. » |
| Bilan (chaque rendez-vous et final) | « Ce qui s'est passé ne dit pas ce qui va se passer. » |
| Espace parent (pied de page du simulateur) | « Contenu pédagogique simplifié. Ne constitue ni un conseil en investissement ni un conseil en assurance. Les supports, frais et scénarios sont fictifs et ne reflètent aucun contrat réel. Les scénarios sont choisis pour faire vivre toutes les situations de marché, pas pour imiter leur fréquence réelle. » |

### 7.4 Contrôle parental

Plafond de capital école, rythme, pause, arrêt, choix des scénarios autorisés (jeu équilibré
obligatoire), mode leçon (scénario imposé), activation des frais et du rachat. Le parent voit
exactement ce que voit l'enfant, sans le futur de la trajectoire.

---

## 8. Glossaire enfant

| Mot | 8-9 ans | 10-12 ans |
|---|---|---|
| Placer | Mettre des unités quelque part pour voir ce qu'elles deviennent avec le temps. | Confier de l'argent à un support en espérant qu'il grandisse, en acceptant qu'il puisse baisser. |
| Support | Un endroit où tu mets tes unités. | Ce sur quoi ton argent est placé : Sécurisé, Prêter, Panier Monde, Entreprises. |
| Répartir / répartition | Décider combien tu mets à chaque endroit. | La part de chaque support dans ton total, en %. Les adultes disent aussi « allocation ». |
| Risque | À quel point ça peut bouger. | À quel point la valeur peut monter ou baisser. Ça ne dit pas ce que tu vas gagner. |
| Diversifier | Ne pas tout mettre au même endroit. | Répartir entre plusieurs supports pour que les écarts soient plus petits. Ça ne supprime pas le risque. |
| Sécurisé | Ça bouge très peu et ça monte doucement. | Dans un vrai contrat, ça ressemble au « fonds en euros » : l'assureur le protège des baisses selon les règles du contrat. |
| Prêter | Tu prêtes à quelqu'un qui te rend un peu plus plus tard. | Des « obligations » : on prête à des États ou des entreprises qui paient des intérêts. Leur valeur peut bouger un peu. |
| Entreprises | Tu achètes un petit bout de quelques entreprises. | Des « actions » de quelques entreprises : ça peut beaucoup monter ou beaucoup baisser. |
| Panier Monde | Un tout petit bout de plein d'entreprises du monde entier. | Beaucoup d'actions de nombreux pays : ça bouge, mais moins qu'avec quelques entreprises. |
| Unités de compte | — | Les supports dont la valeur monte et descend (Prêter, Panier Monde, Entreprises). L'assureur garantit le nombre de parts, pas leur valeur. |
| Part / valeur de part | — | Ton argent est découpé en parts. Le nombre de parts reste, la valeur de chaque part change. |
| Intérêts | Ce qu'on te donne en plus quand tu prêtes. | Ce que rapporte un prêt ou un placement, souvent en % par an. |
| Intérêts composés | Les intérêts rapportent eux aussi des intérêts. | 100 à 4 % par an : 104, puis 108,16, puis 112,49. Plus c'est long, plus l'effet est fort. |
| Rendement | Combien ça a monté ou baissé. | La variation en %, sur une période. Il est connu après, jamais avant. |
| Frais | Ce que tu paies pour le service. | Sur versement (quand tu ajoutes), de gestion (chaque année), d'arbitrage (quand tu déplaces). Ils sont pris même quand ça baisse. |
| Versement | Ajouter des unités. | Argent ajouté au contrat. Ce n'est pas un gain. |
| Versement programmé | Ajouter automatiquement tous les mois. | Même montant ajouté chaque mois, sans y penser. |
| Arbitrage | — | Changer ta répartition : déplacer de l'argent d'un support à l'autre, sans le sortir du contrat. Peut coûter des frais. |
| Retrait / rachat | Reprendre des unités. | Sortir de l'argent du contrat. Ce qui est sorti ne travaille plus. |
| Enveloppe / contrat | — | La « boîte » qui contient tes supports. L'assurance-vie en est une. |
| Assureur | — | L'entreprise avec qui on signe le contrat et qui gère le fonds en euros. |
| Assurance-vie | — | Un contrat, signé avec un assureur, dans lequel on place de l'argent sur des supports. Il prévoit aussi à qui revient l'argent plus tard. |
| Inflation | Quand les prix montent. | La hausse des prix : avec le même nombre d'unités, on achète un peu moins. |
| Pouvoir d'achat | Ce que tes unités peuvent acheter. | Ce que ton argent permet d'acheter compte tenu des prix. Il baisse quand les prix montent plus vite que ton argent. |
| Horizon | Combien de temps tu attends. | La durée prévue du placement. Sur une courte durée, tout peut arriver. |
| Crise | Quand ça baisse beaucoup. | Une forte baisse des marchés. Ça arrive ; personne ne sait quand ni combien de temps ça dure. |
| Reprise | Quand ça remonte après une baisse. | Une remontée après une crise. Elle n'est jamais certaine et rarement en ligne droite. |
| Volatilité | — | La façon dont une valeur bouge beaucoup ou peu, dans les deux sens. |
| Perte en capital | — | Finir avec moins que ce qu'on a mis. Possible avec les unités de compte. |
| Gain « sur le papier » | Ça a monté, mais ça peut encore changer. | Un gain ou une perte qui n'existe vraiment qu'au moment où l'on retire. |

---

## 9. Points à valider par l'utilisateur

- **Âge d'entrée du mode assurance-vie** : A. à partir de l'étape 3 du vocabulaire (≈ 10 ans),
  débloqué par la progression. B. à partir de 11 ans fixe. *Recommandation : A.*
- **Rachat** : A. inclus en étape 4 (11-12 ans), sans fiscalité. B. exclu (trop proche d'un
  vrai produit). *Recommandation : A*, avec la mention « ce qui est sorti ne va nulle part ».
- **Clause bénéficiaire** : A. une phrase neutre au glossaire 10-12 (« il prévoit aussi à qui
  revient l'argent plus tard »), rien de plus. B. ne jamais l'évoquer. *Recommandation : A*,
  c'est ce qui rend le nom « assurance-vie » compréhensible sans aborder le décès.
