# Brief Codex : illustrer les paliers de la Vallée d'Okodukai

Tâche à reprendre dans Codex, qui dispose de la génération d'images. Tout le code est déjà en place : il reste à
produire huit images, à les passer dans les scripts fournis et à activer les paliers. Lire d'abord `CLAUDE.md` et
`AGENTS.md` à la racine. Ce brief est la procédure de référence des calques de palier.

## Ce qui existe déjà (sur `main`)

- `apps/web/src/pages/child/Home.tsx` : l'accueil enfant calcule le palier (1, 5, 10, 20, 30) à partir du niveau
  renvoyé par `/child/me`. À partir du palier 5, il pose le calque `backgrounds/hub-tier-<palier>-{wide,tall}-*.webp`
  sur le fond, sous les lieux et le personnage, non cliquable. Le calque n'apparaît que si le palier figure dans
  `const tierLayers: number[] = [];` (vide aujourd'hui).
- `apps/web/scripts/extract-hub-tier-layer.mjs <palier> <wide|tall>` : compare la scène complète générée au fond
  et écrit le calque transparent. Affiche la part de la scène modifiée et le chemin d'un aperçu (calque posé sur le
  fond, dans le dossier temporaire du système).
- `apps/web/scripts/optimize-child-art.mjs` : produit les WebP de chaque palier dont la source existe. Refuse un
  calque opaque ou d'un autre cadrage.
- `apps/web/scripts/capture-child-valley-tiers.mjs` : capture les cinq paliers à 375, 768 et 1280 px avec un niveau
  remplacé dans le navigateur seulement, et vérifie présence du calque, alignement, lieux cliquables, HUD et
  débordement.

## Décisions déjà prises (ne pas rediscuter)

- Le fond actuel `child-hub-*` (sources `apps/web/art/source/child/hub-wide.png` et `hub-tall.png`) reste le palier 1,
  même s'il montre déjà un hameau et pas un campement.
- Un calque complet par palier : celui du 20 contient aussi les ajouts du 5 et du 10. Jamais de calques empilés.
- Pipeline « génération d'images », comme le fond. Pas le Studio 3D (`scripts/art/studio`), qui donne un autre rendu.
- Rien côté API, aucun nouveau champ, aucun texte visible ajouté. Ne pas toucher à `ExperienceTree.tsx`,
  `ChildCharacter.tsx` ni `Avatar.tsx`.

## Direction artistique

Même caméra trois-quarts légèrement plongeante, même soleil bas et chaud en haut à gauche, ombres froides, lointain
bleu et désaturé, même rendu de diorama peint que le fond. Matières : bois rainuré, pierre moussue, laiton brossé,
cuir cousu, toile. Palette : encre `#172941`, papier `#f6f0df`, or `#d59b38`, feuille `#2d7254`, vermillon rare
`#bd5140`. Chaque palier ajoute des objets concrets, jamais un filtre de couleur ou de lumière. Refus : texte ou faux
caractères peints, personnage ou animal, lueur magique, dégradé violet ou bleu, perspective incohérente, lieu
existant repeint.

## Ce que chaque palier ajoute (cumulatif)

| Palier | Ajout |
| --- | --- |
| 5 | Guirlande de petites lanternes de papier et de laiton entre de fins poteaux de bois le long du chemin ; un fanion vermillon bordé d'or sur un grand mât planté dans le pré |
| 10 | Une petite échoppe de planches à auvent de toile ; deux carrés de potager surélevés (choux, courges, rames de haricots) |
| 20 | Deux ou trois maisonnettes au toit de tuiles ou d'ardoise ; un pont de bois neuf sur le ruisseau |
| 30 | Nouvelle lisière : le sentier continue après le verger jusqu'à une arche de bois à l'orée d'un bois, avec deux lanternes |

## Zones

Pourcentages depuis le coin haut gauche, largeur puis hauteur.

Paysage (`hub-wide.png`, 1672 × 941) : A 30–41 × 49–62 (pré à gauche du coffre) ; B 57–65 × 40–53 (pré à droite
du personnage) ; C 58–67 × 17–31 (rive du lac) ; D 0–12 × 19–46 (falaises et cascade) ; E 77–100 × 3–17 (crête
boisée) ; F 0–22 × 80–100 et G 80–100 × 79–100 (premiers plans, eau en bas à droite).

Portrait (`hub-tall.png`, 941 × 1672) : A 0–16 × 14–26 (falaises au bord de l'eau) ; B 0–14 × 42–56 (cascade
gauche) ; C 86–100 × 24–48 (falaise et cascade droite) ; D 28–62 × 73–82 (pré sous la porte du coffre) ; E 0–40 ×
80–92 (premier plan et ruisseau).

Ne jamais peindre sur : la galerie, le tableau des quêtes, le coffre, l'échoppe, l'observatoire, le verger, le
grand arbre et sa place ronde (portrait), le pont de bois existant (portrait, en bas à droite), l'emplacement du
personnage (paysage 43–56 × 22–56, portrait 36–64 × 33–51), le coin du titre (paysage 0–40 × 0–17, portrait
0–76 × 0–13). Les pastilles des lieux sont affichées par-dessus le calque : un ajout placé dessous serait caché.

## Les huit générations

Toujours joindre l'image de départ indiquée et exiger exactement sa taille (Codex a déjà produit du 1672 × 941 et
du 941 × 1672 pour ce projet). Enregistrer chaque résultat dans `apps/web/art/source/child/` sous le nom indiqué.
Faire la chaîne paysage puis la chaîne portrait, dans l'ordre : chaque palier part du résultat du précédent pour que
les ajouts restent identiques.

| # | Image de départ | Résultat |
| --- | --- | --- |
| 1 | `hub-wide.png` | `hub-tier-5-wide-full.png` |
| 2 | `hub-tier-5-wide-full.png` | `hub-tier-10-wide-full.png` |
| 3 | `hub-tier-10-wide-full.png` | `hub-tier-20-wide-full.png` |
| 4 | `hub-tier-20-wide-full.png` | `hub-tier-30-wide-full.png` |
| 5 | `hub-tall.png` | `hub-tier-5-tall-full.png` |
| 6 | `hub-tier-5-tall-full.png` | `hub-tier-10-tall-full.png` |
| 7 | `hub-tier-10-tall-full.png` | `hub-tier-20-tall-full.png` |
| 8 | `hub-tier-20-tall-full.png` | `hub-tier-30-tall-full.png` |

Consigne commune, où `{SIZE}` vaut `1672x941` en paysage et `941x1672` en portrait, `{ADD}` vient du tableau
suivant et `{KEEP}` de la ligne sous la consigne :

> Edit the attached image. Output exactly {SIZE} pixels, with the same camera, framing, perspective and lighting. Keep every existing building, path, tree, rock, water surface and the sky exactly as they are, and change only the small areas where you add the new elements. Add: {ADD} Same hand-painted 3D diorama style as the rest of the scene: warm low sun from the upper left, cool shadows, crisp contact shadows, blue and desaturated distance. Materials: grooved wood, mossy stone, brushed brass, stitched leather, canvas. Palette: ink #172941, paper #f6f0df, gold #d59b38, leaf #2d7254, rare vermilion #bd5140. No text, letters or symbols, no people or animals, no glow or magic effects, no purple or blue gradients. Do not cover or repaint {KEEP}

- `{KEEP}` paysage : `the domed gallery, the quest board, the big treasure chest, the shop with the striped awning, the observatory tower, the orchard, or the centre of the meadow where the character stands. Keep every element added in earlier edits unchanged.`
- `{KEEP}` portrait : `the gallery, the quest board, the round vault door, the shop with the striped awning, the observatory, the orchard, the big tree and its round plaza, the existing wooden bridge at the bottom right, or the centre of the scene where the character stands. Keep every element added in earlier edits unchanged.`

| # | `{ADD}` |
| --- | --- |
| 1 | a string of small paper-and-brass lanterns hung between thin wooden posts along both edges of the stone path around the central meadow and between the treasure chest and the shop, and one vermilion pennant with a gold border on a tall wooden pole planted in the meadow right of the centre, about 60% from the left and 45% from the top. |
| 2 | a small plank market stall with a canvas awning and two raised vegetable beds made of planks, with cabbages, pumpkins and bean poles, in the meadow left of the treasure chest, 30–41% from the left and 49–62% from the top. |
| 3 | two or three small cottages with tiled or slate roofs, on the lake shore behind the meadow (58–67% from the left, 17–31% from the top) and on the cliffs by the left waterfall (0–12% from the left, 19–46% from the top), and a new wooden footbridge over the water in the bottom-right corner (80–100% from the left, 79–100% from the top). |
| 4 | a new forest edge on the wooded ridge in the top-right corner (77–100% from the left, 3–17% from the top): the path continues past the orchard to a wooden arch at the edge of a wood, with two lanterns. |
| 5 | a string of small paper-and-brass lanterns hung between thin wooden posts, and one vermilion pennant with a gold border on a tall wooden pole, in the grassy area below the round vault door, 28–62% from the left and 73–82% from the top. |
| 6 | a small plank market stall with a canvas awning and two raised vegetable beds made of planks, with cabbages, pumpkins and bean poles, in the grassy area below the round vault door beside the lanterns, 28–62% from the left and 73–82% from the top. |
| 7 | two or three small cottages with tiled or slate roofs on the cliffs at the left edge (0–16% from the left and 14–26% from the top, and 0–14% from the left and 42–56% from the top), and a new wooden footbridge over the stream at the bottom left (0–40% from the left, 80–92% from the top). |
| 8 | a new forest edge on the right cliff (86–100% from the left, 24–48% from the top): a path leads to a wooden arch at the edge of a wood, with two lanterns. |

Refaire une génération si l'image change de cadrage, repeint un lieu, ajoute du texte ou un personnage, ou si
l'extraction annonce plus d'un tiers de la scène modifiée.

## Après les générations

1. Pour chaque palier et chaque forme : `node apps/web/scripts/extract-hub-tier-layer.mjs <palier> <wide|tall>`.
   Ouvrir l'aperçu indiqué : aucun lieu repeint, pas de liseré, pas de tache isolée, ajouts bien posés.
2. `node apps/web/scripts/optimize-child-art.mjs` : doit écrire `hub-tier-<palier>-wide-{1280,1920}.webp` et
   `hub-tier-<palier>-tall-{720,1080}.webp` pour les quatre paliers, sans modifier les autres WebP.
3. Dans `Home.tsx` : `const tierLayers: number[] = [5, 10, 20, 30];`.
4. API et Vite démarrés (`npm run dev:api`, `npm run dev:web`, base Docker `npm run db:up`), puis
   `node apps/web/scripts/capture-child-valley-tiers.mjs`. Si Playwright n'a pas son navigateur :
   `CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`. Le script échoue au moindre défaut.
   Regarder les 15 captures `docs/screenshots/child-valley-tier-*.png`.
5. `npm run build --workspace apps/web`.
6. Documentation :
   - `docs/ASSET_REGISTRY.md` : retirer la puce `hub-tier` de « Hors registre » et ajouter au tableau la ligne
     `| Paliers de la vallée | backgrounds/hub-tier-{5,10,20,30}-{wide,tall}-*.webp | Génération d'images par édition successive du fond (hub-wide.png, hub-tall.png) ; calque complet par palier extrait par différence. Sources hub-tier-*-full.png et hub-tier-*.png dans art/source/child/ | extract-hub-tier-layer.mjs puis optimize-child-art.mjs | <date> |`.
   - `docs/CHILD_ASSET_PLAN.md` : état de la ligne `hub-tier` → « Livré, contrôlé à 375/768/1280 px ».
   - `docs/CHILD_ART_DIRECTION.md` : retirer « Les calques P5+ restent à illustrer (…) » et garder la règle
     « un palier sans calque garde le fond seul ».
   - `docs/RESTE_A_FAIRE.md` : point d'étape en tête (fait, comment vérifier, reste), et marquer ce brief comme
     traité.
7. Versionner les huit `-full.png`, les huit calques `.png`, les WebP et les captures ; commit puis push sur `main`.
