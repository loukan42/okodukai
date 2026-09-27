# Plan d’assets enfant

Le registre des fichiers livrés et de leur provenance est `ASSET_REGISTRY.md`. Priorité P0 = nécessaire au premier parcours, P1 = prochain enrichissement, P2 = détail. Un fichier n’entre dans l’app qu’après contrôle des artefacts, de la perspective, du poids et d’une capture à 375 px.

| Nom | Écran / fonction | Format et dimensions cibles | Perspective et style | Priorité | État |
| --- | --- | --- | --- | --- | --- |
| `child-hub-wide-{1280,1920}.webp` | Accueil, village navigable | WebP 16:9 | Trois-quarts plongeant, diorama 3D, lumière chaude | P0 | Livré, à enregistrer dans le registre |
| `child-hub-tall-{720,1080}.webp` | Accueil mobile | WebP 9:16 | Même lieux et palette, composition verticale | P0 | Livré, à enregistrer dans le registre |
| `quest-board-{180,360,540,1080}.webp` | Quêtes, objet signature | WebP transparent | Trois-quarts, bois et laiton | P0 | Livré, réemploi |
| `savings-chest-{closed,empty,low,full,almost,reached}-*.webp` | Coffre, états de remplissage | WebP transparent 240/480/720 | Trois-quarts constant | P0 | Livré, réemploi |
| `okodukai-coin-{48,96,192,512}.webp` | HUD, solde, gain | WebP transparent | Frontal et relief laiton | P0 | Livré, réemploi |
| `coin-pouch-{128,256,512}.webp` | Compte, bourse | WebP transparent | Trois-quarts | P0 | Livré, réemploi |
| `shop-stall-{180,360,540}.webp` | Boutique, objet signature | WebP transparent | Trois-quarts | P1 | Livré, réemploi |
| `telescope-{128,256,512}.webp` | Observatoire | WebP transparent | Trois-quarts | P1 | Livré, réemploi |
| `bookshelf-{128,256,512}.webp` | Bibliothèque | WebP transparent | Trois-quarts | P2 | Livré, réemploi |
| `adventurer-{emma,lucas}-idle-{256,512,768}.webp` | Place, profil | WebP transparent | Personnages du roster en pied | P1 | Livré |
| `adventurer-{emma,lucas}-victory-{256,512,768}.webp` | Validation de quête | WebP transparent | Même personnage et caméra | P1 | Livré |
| `adventurer-{emma,lucas}-{happy,proud,thinking,discovery}-{256,512,768}.webp` | Place, profil et leçons | WebP transparent, trois tailles | Même personnage, tenue et caméra que les poses existantes | P1 | Livré |
| Personnages en pied pour les 14 autres portraits | Profil et moments de jeu | WebP transparent 256/512/768 | Fidèles au portrait choisi | P1 | Livré : les 16 portraits ont une figure en pied ; Emma et Lucas ont six poses, les 14 autres la pose repos |
| `reward-{cinema,icecream,bicycle,family-game}-{256,512}.webp` | Boutique, récompenses familiales | WebP transparent | Objets trois-quarts, palette du monde | P1 | Livré |
| `reward-{dessert,music,friend,figurine,book}-{256,512}.webp` | Boutique, récompenses courantes du foyer | WebP transparent | Objets distincts, détails fonctionnels et sans inscriptions | P1 | Livré, contrôlé à 375/768/1280 px |
| `quest-{home,autonomy,learning,help}-{180,360,540}.webp` | Journal, catégories maison, autonomie, apprentissage et entraide | WebP transparent | Objets du quotidien, sans texte ni décor plaqué | P1 | Livré, contrôlé à 375/768/1280 px |
| Illustrations créativité, école, jardin, animaux | Journal, autres catégories de quête | WebP transparent | Objets distincts de la même famille visuelle | P1 | À produire ; parchemin/étagère provisoires. Les types habitude et grande quête ont un traitement de fiche ; aucun booster n'est promis par une quête particulière depuis le rythme une fois sur trois. |
| `learning-{diversification,inflation,risk,compound}-{320,640}.webp` | Bibliothèque, mini scènes | WebP carré | Notions illustrées, même vallée | P2 | Livré |
| `child-{gallery,observatory,library,shop}-interior-{1280,1920}.webp` | Lieux intérieurs | WebP panoramique | Même bois, laiton, vallée et lumière | P1 | Livré |
| `child-savings-chamber-{1280,1920}.webp` | Chambre du trésor | WebP panoramique | Pierre moussue et grand coffre | P1 | Livré |
| `child-registry-interior-{1280,1920}.webp` | Registre de compte enfant | WebP panoramique | Comptoir de bois, registre ouvert, vallée par la fenêtre ; zone calme à gauche pour les chiffres | P1 | Livré |
| `hub-tier-{5,10,20,30}-{wide,tall}-*.webp` | Progression du village | WebP transparent, un calque complet par palier, 1280/1920 et 720/1080, mêmes dimensions que le fond | Même caméra et même lumière que `child-hub-*` ; ajouts dans les zones libres | P2 | Architecture livrée (calque, scripts, capture) ; illustrations à produire, voir ci-dessous |
| `xp-tree-{sprout,sapling,young,flowering,mature}-{256,512}.webp` | HUD et profil, croissance avec l'XP | WebP transparent, deux tailles | Trois-quarts, arbre courbe à fleurs ivoire, base moussue et lumière de la vallée | P1 | Livré, cinq formes |
| `goal-waypost-{128,256,512}.webp` | Destination des objectifs libres | WebP transparent, trois tailles | Poteau en bois, carte sans texte, médaillon vide ; trois-quarts | P1 | Livré |

Les sources de la nouvelle série sont dans `apps/web/art/source/child/`. `node apps/web/scripts/optimize-child-art.mjs` régénère les WebP. Les images des cartes et le sachet de booster sont déjà intégrés. Leur changement demande une revue d’ensemble, car ils constituent un système de collection existant.

## Calques de palier de la vallée

Le fond `child-hub-*` reste celui du palier 1. À partir du palier 5, l’accueil pose par-dessus un calque transparent au même cadrage, sous les lieux et le personnage. Chaque palier a son propre calque complet : celui du palier 20 contient aussi les ajouts des paliers 5 et 10. Un palier n’apparaît à l’écran qu’une fois inscrit dans `tierLayers` (`apps/web/src/pages/child/Home.tsx`) ; sans calque, l’enfant voit le fond seul.

Le fond actuel montre déjà un hameau (échoppe, ponts, lanternes), pas un campement. Décision du propriétaire (27/09) : ce hameau reste le palier 1. Les calques ajoutent donc des éléments en plus de ce qui existe ; ils ne repeignent ni lieu, ni chemin, ni ciel.

| Palier | Ajout (cumulatif) | Zones paysage | Zones portrait |
| --- | --- | --- | --- |
| 5 | Guirlande de lanternes de papier et de laiton sur de fins poteaux de bois le long du chemin ; un fanion vermillon bordé d’or sur un mât, planté dans le pré | Lanternes : bords du chemin en A et B, et entre le coffre et l’échoppe ; fanion : B | D |
| 10 | Une petite échoppe de planches à auvent de toile et deux carrés de potager (planches, choux, courges, rames de haricots) | A | D |
| 20 | Deux ou trois maisonnettes au toit de tuiles ou d’ardoise ; un pont de bois neuf sur le ruisseau | Maisons : C et D ; pont : G | Maisons : A et B ; pont : sur l’eau de E |
| 30 | Nouvelle lisière : le sentier continue après le verger jusqu’à une arche de bois à l’orée d’un bois, avec deux lanternes | E | C |

Zones libres, en pourcentage depuis le coin haut gauche (largeur × hauteur) :

- Paysage (`hub-wide.png`, 1672 × 941) : A 30–41 × 49–62 (pré à gauche du coffre) ; B 57–65 × 40–53 (pré à droite du personnage) ; C 58–67 × 17–31 (rive du lac) ; D 0–12 × 19–46 (falaises et cascade) ; E 77–100 × 3–17 (crête boisée) ; F 0–22 × 80–100 et G 80–100 × 79–100 (premiers plans, eau en bas à droite).
- Portrait (`hub-tall.png`, 941 × 1672) : A 0–16 × 14–26 (falaises au bord de l’eau) ; B 0–14 × 42–56 (cascade gauche) ; C 86–100 × 24–48 (falaise et cascade droite) ; D 28–62 × 73–82 (pré sous le coffre) ; E 0–40 × 80–92 (premier plan et ruisseau).

Ne jamais peindre sur la galerie, le tableau des quêtes, le coffre, l’échoppe, l’observatoire, le verger, le grand arbre et sa place (portrait), le pont de bois existant (portrait, en bas à droite), l’emplacement du personnage (paysage 43–56 × 22–56, portrait 36–64 × 33–51) ni le coin du titre (paysage 0–40 × 0–17, portrait 0–76 × 0–13). Les pastilles HTML des lieux restent au-dessus du calque : un ajout placé sous une pastille serait caché.

Production d’un palier :

1. Éditer l’image au même cadrage, sans recadrage ni zoom, avec l’outil de génération d’images. Partir du palier précédent pour garder les ajouts identiques : `hub-wide.png` → `hub-tier-5-wide-full.png` → `hub-tier-10-wide-full.png` → …, et de même pour `tall`.
2. `node apps/web/scripts/extract-hub-tier-layer.mjs <palier> <wide|tall>` écrit `hub-tier-<palier>-<forme>.png`, le calque transparent obtenu par différence avec le fond. Le script avertit si plus d’un tiers de la scène a changé : le générateur a repeint le décor et l’édition est à refaire.
3. Contrôler le calque posé sur le fond : aucun lieu repeint, pas de liseré, pas de texte. Puis `node apps/web/scripts/optimize-child-art.mjs`, qui refuse un calque opaque ou mal cadré.
4. Ajouter le palier à `tierLayers`.
5. API et Vite démarrés : `node apps/web/scripts/capture-child-valley-tiers.mjs` (avec `CHROMIUM_PATH` vers Chrome si Playwright n’a pas son navigateur). Le niveau est remplacé dans le navigateur seulement ; le script vérifie que le calque apparaît aux bons paliers, son alignement, les lieux cliquables, le HUD et l’absence de débordement, puis écrit `docs/screenshots/child-valley-tier-<palier>-{375,768,1280}.png`.

Consigne de génération. Donner au générateur l’image de départ (fond ou palier précédent) et garder son cadrage 16:9 ou 9:16 ; un autre format est refusé par l’extraction.

> Edit this exact image. Keep the same camera, framing, perspective and lighting, and keep every existing building, path, tree, rock and colour exactly as it is. Only add: {ajout du palier}, placed in {zones}. Same hand-painted 3D diorama style as the rest of the scene: warm low sun from the upper left, cool shadows, crisp contact shadows, blue and desaturated distance. Materials: grooved wood, mossy stone, brushed brass, stitched leather. Palette: ink #172941, paper #f6f0df, gold #d59b38, leaf #2d7254, rare vermilion #bd5140. No text or letters, no people or animals, no glow or magic effects, no purple or blue gradients. Do not cover the gallery, the quest board, the treasure chest, the shop, the observatory, the orchard or the centre of the meadow.

Texte à mettre à la place de `{ajout du palier}, placed in {zones}` (chaque édition part du palier précédent et n’ajoute que les éléments du palier) :

| Palier | Paysage (`wide`) | Portrait (`tall`) |
| --- | --- | --- |
| 5 | a string of small paper-and-brass lanterns hung between thin wooden posts along the edges of the stone path, and one vermilion pennant with a gold border on a tall wooden pole, placed along the path on both sides of the central meadow and between the treasure chest and the shop; the pennant stands in the meadow right of the centre, about 60% from the left and 45% from the top | the same lanterns and pennant, placed in the grassy area below the round vault door, 28–62% from the left and 73–82% from the top |
| 10 | a small plank market stall with a canvas awning and two raised vegetable beds made of planks, with cabbages, pumpkins and bean poles, placed in the meadow left of the treasure chest, 30–41% from the left and 49–62% from the top | the same stall and vegetable beds, placed in the grassy area below the vault door beside the lanterns, 28–62% from the left and 73–82% from the top |
| 20 | two or three small cottages with tiled or slate roofs and a new wooden footbridge over the stream, placed on the lake shore behind the meadow (58–67% from the left, 17–31% from the top) and on the cliffs by the left waterfall (0–12%, 19–46%); the footbridge crosses the water in the bottom-right corner (80–100%, 79–100%) | the same cottages and footbridge: cottages on the cliffs at the left edge (0–16% from the left, 14–26% from the top, and 0–14%, 42–56%); the footbridge crosses the stream at the bottom left (0–40%, 80–92%) |
| 30 | a new forest edge: the path continues past the orchard to a wooden arch at the edge of a wood, with two lanterns, placed on the wooded ridge in the top-right corner (77–100% from the left, 3–17% from the top) | the same forest edge, placed on the right cliff (86–100% from the left, 24–48% from the top) |
