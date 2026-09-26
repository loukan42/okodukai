# Refonte de la landing : l'entrée dans la Vallée d'Okodukai

Code : `apps/web/src/pages/Landing.tsx` et `apps/web/src/pages/landing/`. Assets : `docs/ASSET_REGISTRY.md`.
Direction artistique de référence : `docs/ART_BIBLE.md`.

## 1. Problèmes de l'ancienne landing

- **Un hero de landing SaaS** : titre et paragraphe à gauche, un coffre qui flotte à droite, sans produit visible. On ne voyait jamais l'app.
- **La boucle en six étapes** était une grille de cartes (objet, titre, texte) sur un plateau. C'était une liste de fonctions, pas une histoire.
- **Aucune preuve produit**, hormis un faux relevé construit en `div` (« Compte de Léa »).
- **Rien sur les quêtes vues par l'enfant, les placements, la collection ou le tableau de bord parent.**
- **Un texte d'accroche de 30 mots**, trop long pour un parent qui décide en cinq secondes.
- **Un mouvement décoratif** (poussières, coffre qui tombe, pièces qui orbitent) qui ne racontait rien.
- **Des textes devenus faux** : le coffre s'appelle aujourd'hui « Coffre magique » et donne une prime le lundi, et les placements utilisent de vraies pièces (virtuelles).

## 2. Principes retenus

1. **Le hero est une scène.** On entre dans la vallée : plusieurs plans séparés, le produit posé dans l'herbe, la pièce qui flotte.
2. **Le produit d'abord.** Les écrans montrés sont les composants de l'app (pièce, coffre, lignes de relevé, barres de progression, icônes) avec les données du foyer de démonstration. Ce ne sont ni des captures truquées ni des maquettes génériques. Le tableau de bord parent est une vraie capture.
3. **Une idée par section.**
   - Hero : entrer dans le monde.
   - Choix : décider.
   - Compte : l'écran change avec le défilement.
   - Quêtes : l'action d'abord.
   - Coffre : mettre de côté.
   - Placements : voir le temps passer.
   - Collection : ouvrir et collectionner.
   - Parents : piloter.
   - Confiance : ce qu'il n'y a pas.
   - Fin : le chemin mène au hameau.
4. **Une journée dans le monde, qui assure la continuité.**
   - Heure dorée : hero, choix, compte, quêtes, coffre.
   - Crépuscule : les placements, où le ciel change pendant le défilement.
   - Nuit aux lanternes : collection, parents, confiance.
   - Aube : la fin, sur le même chemin qu'au début.

   C'est la seule bascule de thème, faite par la lumière du monde et non par des blocs de couleur.
5. **Promesse, preuve et parcours dès le premier écran.**
   - Promesse : le titre.
   - Preuve : le téléphone avec l'accueil d'Emma.
   - Parcours : le rail « Gagner, Gérer, Économiser, Décider, Comprendre », qui mène aux sections.
6. **Rien d'inventé.** Pas de témoignage, pas de note, pas de partenaire, pas de statistique.
   - Les seuls chiffres viennent du produit : 14 univers, 105 cartes, cinq raretés ; un relevé à 17 h qui révèle six mois ; dix ans pour les 10-12 ans et cinq pour les 8-9 ans ; une prime d'une pièce pour dix gardées.
   - Les données d'exemple sont signalées comme démonstration.

## 3. Ce que nous avons pris aux modèles Scrolltide (principes, pas code)

| Modèle | Principe retenu | Chez Okodukai |
| --- | --- | --- |
| Lodestar | Une interface produit plantée dans un décor atmosphérique | Le téléphone d'Emma posé sur une pierre moussue, dans l'herbe de la vallée |
| Malachite | Des pièces mises en scène plutôt que des graphiques | La pièce Okodukai en vraie 3D, qui tourne doucement et suit le pointeur |
| Meridian et Nocturne | Le logiciel comme un lieu ; un même paysage à deux heures | La vallée à l'heure dorée (hero) et à l'aube (fin), avec le même chemin |
| Zephyr | Promesse, preuve et parcours dans le premier écran | Titre, téléphone, rail du parcours |
| Flying Garden | Du charme et quelques surprises | La pièce glissée dans le titre « Il gagne 10 », le tampon « Validé » qui s'abat sur la fiche, le booster qui s'ouvre en éventail |
| Billet | Un objet qui lit le pointeur | Le reflet et l'inclinaison de la pièce 3D |
| Stillbloom | Un titre énorme qui cohabite avec un objet | « Il gagne 10. » en très grand, la pièce dans la ligne |
| Composants (Fan Deck, Arc Carousel) | Une main de cartes ouverte depuis un pivot | Les sept cartes de la collection, dépliées au défilement |

## 4. Ce que nous avons volontairement évité

- **Tout élément reconnaissable d'un modèle** : pas de forêt pluvieuse, pas de maison de campagne peinte, pas de verre teal, pas de palette ni de mise en page reprise.
- **Le code propriétaire** : rien n'a été téléchargé ; tout est construit avec la pile du dépôt.
- **Les séquences d'images vidéo** (240 images) : elles sont lourdes et ne correspondent pas à notre pipeline. Nos plans sont des rendus 3D du studio du dépôt.
- **Le détournement du défilement** : aucune capture de la molette. Les sections longues utilisent seulement `position: sticky`.
- **Les tics de « landing IA »** :
  - pas de dégradé violet, pas de grille de six cartes, pas de sur-titre au-dessus de chaque section ;
  - pas de tiret cadratin, pas de faux logos, pas de « trusted by », pas d'émoji.

## 5. Architecture

| Section | Composant | Mécanique |
| --- | --- | --- |
| Navigation | `LandingNav.tsx` | Fixe, devient translucide après le haut de page ; liens d'ancre, « Connexion », « Commencer » |
| Hero | `Hero.tsx` | Plans fond, voile, texte, produit, pièce et avant-plan, animés en parallaxe au défilement (`useScroll`) ; une seule entrée orchestrée au chargement |
| Il gagne 10 | `Choice.tsx` | Titre en deux lignes qui glissent en sens opposés ; trois chemins (dépenser, garder, placer) tracés au défilement |
| Son premier compte | `AccountStory.tsx` | Téléphone fixe (sticky) ; le chapitre au milieu de l'écran, détecté par `IntersectionObserver`, choisit l'écran de l'app |
| Quêtes | `QuestsScene.tsx` | Tableau d'aventurier en parallaxe, trois fiches épinglées (proposée, en attente, validée), tampon « Validé » |
| Coffre magique | `VaultScene.tsx` | Section fixe de 330 svh : les cinq rendus du coffre se succèdent, le solde et l'objectif suivent |
| Placements | `InvestScene.tsx` | Le ciel passe de l'heure dorée au crépuscule, les étoiles apparaissent, la courbe se trace année par année |
| Collection | `CollectionScene.tsx` | Le booster descend, sept cartes réelles s'ouvrent en éventail 3D (CSS, `preserve-3d`) |
| Parents | `ParentsScene.tsx` | Vraie capture du tableau de bord ; les réglages réels de l'espace parent |
| Confiance et fin | `Finale.tsx` | Liste typographique courte ; aube sur le hameau, appel final, pied de page |

Les écrans du téléphone (`AppDemo.tsx`) sont dessinés à 390 px de large puis mis à l'échelle (`Phone.tsx`). Ils ne réutilisent pas les pages de l'app, dont les media queries lisent la fenêtre et non le téléphone. Leur contenu est inerte (`inert`), et une description accessible accompagne chaque téléphone.

## 6. Direction artistique

- **Matière** : les plans sont rendus par le studio 3D du dépôt (`scripts/art/studio/scenes/world.js`), avec la lumière, les matières et les feuillages ronds de l'Art Bible.
- **Typographie** : Fraunces (déjà la marque), très grande, en graisse 800. Les deuxièmes lignes sont en italique 500, « en demi-présence ». L'axe italique a été ajouté au chargement de police. Manrope pour le texte courant.
- **Couleurs** : un seul accent, l'or de la pièce. Encre et nuit `#172941` / `#13233a`, parchemin `#f6f0df`.
- **Formes** : 999 px pour ce qui se touche (boutons, pastilles), 22 px pour les panneaux, 6 px pour le papier des fiches.
- **Boutons** : l'or frappé de la pièce, biseau intérieur, ombres teintées en couches, reflet qui balaie une fois au survol, enfoncement au clic. L'ancienne ombre pleine « tranche de 4 px » est abandonnée sur la landing.

## 7. Mouvement

- **Moteur** : framer-motion, déjà dans la pile (`useScroll`, `useTransform`, `useMotionValueEvent`). Aucun écouteur `scroll`, aucune bibliothèque d'animation ajoutée.
- **Propriétés animées** : seulement `transform` et `opacity`. Les états qui changent par paliers (coffre, année, chapitre) ne mettent à jour React qu'au changement de palier.
- **Pièce 3D** : three.js, chargé à la demande après le premier rendu (`requestIdleCallback`). Elle s'arrête hors de l'écran et quand l'onglet est caché, et n'est pas chargée si WebGL2 manque, en mode économie de données ou avec peu de mémoire.
- **Mouvement réduit** : pas de parallaxe, pas de 3D, les états finaux sont affichés d'emblée (éventail ouvert, courbe complète, crépuscule). Les sections fixes restent navigables : elles ne dépendent pas du mouvement.

## 8. Assets créés

Voir `docs/ASSET_REGISTRY.md` pour le détail :
- la vallée et son chemin à l'heure dorée (fond) ;
- l'avant-plan (touffes, pierres, pièces) ;
- le hameau à l'aube ;
- le socle de pierre du téléphone ;
- le tableau de quêtes en 1080 px ;
- les textures cuites de la pièce 3D ;
- le portrait léger d'Emma ;
- la capture du tableau de bord parent.

Chaque plan existe en paysage (1280 et 1920) et en portrait (720 et 1080) pour le mobile.

## 9. Responsive

- **Mobile (moins de 768 px)** :
  - Plans portrait dédiés (autre cadrage de caméra, pas un simple recadrage).
  - Téléphone et pièce reposés en bas de l'écran, rail de parcours masqué.
  - Dans l'histoire du compte, le téléphone reste en haut et les chapitres disparaissent en fondu sous lui.
  - Éventail de cartes réduit, choix en une colonne.
- **Tablette (moins de 1080 px)** : navigation réduite au logo et aux deux boutons ; coffre et tableau de bord sur deux rangs.
- **Tailles** : titres et marges en `clamp()`, hauteurs en `svh`.

## 10. Performance

- **Point le plus lourd du premier écran** : l'image de fond du hero (58 Ko en 1920 px, `fetchpriority="high"`). L'avant-plan pèse 67 Ko, le reste est différé (`loading="lazy"`).
- **Budgets de l'Art Bible respectés** : chaque fond fait au plus 80 Ko en 1920 px.
- **Pièce 3D** : 131 Ko gzip, isolée dans son propre morceau (`coin3d-*.js`). Elle est exclue du précache PWA : les utilisateurs de l'app ne la téléchargent jamais.
- **Textures de la gravure** : 85 Ko au total, cuites une fois, pour ne pas les calculer pixel par pixel sur le téléphone du visiteur.
- **Avatar** : le portrait d'Emma est un WebP de 5 Ko ; la planche d'avatars de 2 Mo n'est pas chargée.

## 11. À refaire si le produit change

- **Écrans du téléphone** : `AppDemo.tsx` (données de démonstration, noms des lieux).
- **Capture parent** : à refaire sur le foyer de démonstration.
- **Chiffres** : 105 cartes, 14 univers, rythme des relevés, durée des parties, règle de la prime.
