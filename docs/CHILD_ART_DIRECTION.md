# Direction artistique enfant — la Vallée d’Okodukai

Ce document complète `ART_BIBLE.md` et `DESIGN_SYSTEM.md`. Il s’applique uniquement à l’espace enfant. Les règles produit de `CLAUDE.md` restent prioritaires.

## Monde et sensation

L’enfant entre dans un hameau de vallée qu’il reconnaît à chaque visite. Les fonctions sont des lieux reliés par un chemin : le tableau des quêtes, le coffre, l’échoppe, la galerie des cartes, l’observatoire et le verger. La place centrale accueille son personnage. La progression enrichit le même village ; elle ne remplace pas le monde à chaque niveau. L’émotion est celle d’une aventure calme et personnelle, sans casino ni compétition.

## Grammaire visuelle

| Dimension | Règle |
| --- | --- |
| Palette | Encre `#172941`, papier `#f6f0df`, or `#d59b38`, feuille `#2d7254`, vermillon rare `#bd5140`, ciel bleu grisé. Conserver les tokens existants. |
| Lumière | Soleil bas, chaud en haut à gauche. Ombres froides, contacts nets, lointain bleu et désaturé. Galerie et observatoire passent au crépuscule avec des lanternes. |
| Matières | Bois rainuré, pierre moussue, laiton brossé, cuir cousu, papier épinglé. Un objet a peu de détails signifiants, clairement lisibles à petite taille. |
| Formes | Silhouettes franches, coins adoucis par la construction de l’objet. Le décor n’utilise pas les arrondis de carte SaaS comme motif dominant. |
| Perspective | Trois-quarts légèrement plongeant pour le monde et les objets, frontal pour le contenu écrit, cartes et boosters. Les objets gardent une lumière et une échelle cohérentes. |
| Typographie | Fraunces pour les noms de lieu et moments clés, Manrope pour les actions et données. Pas de texte dans les images. |
| Détail | Premier plan détaillé, milieu lisible, fond atmosphérique. L’information importante est posée sur une surface opaque. |

## Les lieux

- **Accueil / Place du hameau** : scène large et navigable. Chaque bâtiment est une destination dont la cible HTML possède un nom visible et accessible. Le compte, le niveau et l’XP restent dans un HUD stable.
- **Quêtes / Tableau d’aventurier** : panneau de bois et fiches de papier épinglées. Différencier par les sceaux, le traitement des fiches et la récompense, pas seulement par couleur. Une quête en attente ne promet pas des gains acquis.
- **Mon compte / Registre de la bourse** : le solde est le premier chiffre, avec un relevé clair et des signes écrits. Le jeu enveloppe le registre, sans masquer les opérations.
- **Mon coffre / Chambre du trésor** : le coffre existant change avec le remplissage. Le transfert montre un mouvement de pièces après la réponse serveur ; l’objectif est une destination sur un chemin et garde sa valeur numérique.
- **Collection / Galerie aux lanternes** : les cartes sont les objets exposés, avec matière de rareté, numéro et univers. Les boosters ont un autel dédié. Les illustrations des cartes existantes restent la source d’image.
- **Boutique / Échoppe** : objets et récompenses familiales, prix lisibles, validation parentale explicite. Aucun code visuel de microtransaction.
- **Placements / Observatoire** : cadrans et lunette pour l’exploration du temps ; graphiques et risques demeurent honnêtes et lisibles. Aucun vocabulaire de trading.
- **Apprendre / Bibliothèque** : petites scènes conceptuelles plutôt qu’une décoration sans lien avec la leçon.

## Personnage et progression

Le portrait existant représente l’identité choisie. Le personnage de plein pied est une évolution de ce même roster : tête et palette reconnues, corps d’aventurier sobre, ombre de contact. Les poses prévues sont repos, content, réflexion, découverte, fier et victoire. La personnalisation future se compose de calques cosmétiques (cheveux, tenue, accessoire, cadre, compagnon, titre), sans bonus de pièces ni de XP.

Le modèle de décor accepte cinq paliers : 1 campement, 5 lanternes et fanion, 10 échoppe et jardin, 20 hameau et pont, 30 nouvelle lisière. Le niveau serveur sélectionne un palier ; les lieux, liens et données sont identiques. Les variantes de décor P5+ ne sont pas encore produites : l’architecture réserve des calques décoratifs et n’affiche jamais un progrès fictif.

L'arbre d'aventure est la trace visible de l'effort de l'enfant. Il garde le même tronc courbe, les mêmes feuilles et la même base moussue pendant cinq formes : pousse (niveau 1), jeune arbre (5), premières branches (10), fleurs (20), grand arbre (30). Entre deux formes, chaque gain d'XP augmente légèrement sa taille. Les fleurs sont ivoire et ne deviennent jamais des pièces : cet arbre représente l'expérience, sans valeur monétaire ni avantage de jeu. La lumière et la caméra sont celles de la vallée. L'arbre figure dans le HUD et en grand sur le profil.

## Pièce, cartes et boosters

La pièce à trou carré et blason à quatre pétales est l’unique monnaie visuelle. Elle existe en 48, 96, 192 et 512 px ; son changement de taille suffit aux usages petit, moyen, grand. Pile, bourse et animation réutilisent cette géométrie. Aucun emoji monétaire. Les cartes gardent un cadre et une illustration frontale. Commune = papier mat, peu commune = papier renforcé, rare = vernis et métal, épique = relief d’or, légendaire = foil et moment lumineux court. La rareté est aussi écrite. Le sachet existant et son ouverture serveur restent la référence fonctionnelle.

## Animation et son

La scène d’arrivée possède un seul mouvement court de profondeur ; les lieux réagissent au focus ou au toucher. Le monde respire discrètement, une boucle calme à la fois. Les transferts et récompenses n’animent que des changements confirmés par le serveur. Durées : 120–250 ms pour contrôle, 300–550 ms pour changement de scène, quelques secondes au plus pour une rareté légendaire. `prefers-reduced-motion` retire parallax, zoom et particules tout en conservant l’état final. Les points d’insertion audio futurs sont quête, pièce, coffre, booster, rareté et niveau ; le son restera facultatif.

## Cohérence et refus

Comparer chaque asset à la pièce, au coffre et au tableau existants : même soleil, saturation retenue, métal chaud, bois plausible, ombre de contact. Aucun texte peint, main incorrecte, architecture incohérente, or noir, signe pseudo-magique aléatoire ou perspective impossible. Une capture doit montrer d’abord un lieu, puis une interface compréhensible. À 375 px, les actions ont au moins 44 px, restent lisibles et atteignables à une main ; à 768 et 1280 px, davantage de monde est visible sans étirer les panneaux de lecture.
