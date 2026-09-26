# Art Bible — Okodukai

Document de référence pour tout asset visuel. Il complète `ART_DIRECTION.md` (grammaire de l'interface) : ici on définit **le monde** et la manière de le dessiner. En cas de conflit, cette bible prime pour les illustrations ; `ART_DIRECTION.md` prime pour les composants d'interface.

## 1. Le monde

**La Vallée d'Okodukai** : une vallée abritée, au pied de montagnes bleutées, où chaque enfant installe son campement. Le monde est chaleureux, légèrement nostalgique, onirique sans être magique à outrance. L'argent y est concret : des pièces qu'on gagne, qu'on range, qu'on regarde grandir.

Chaque fonction du produit a **un lieu** et **un objet signature** :

| Fonction | Lieu | Objet signature |
| --- | --- | --- |
| Accueil enfant | Le campement, au centre de la vallée | La tente et le feu de camp |
| Mon compte | La bourse de l'aventurier | Bourse de cuir + livret de comptes |
| Historique | Le registre | Carnet relié, pages lignées |
| Mon coffre | Le coffre du campement | Coffre de bois cerclé d'or, emblème de la pièce |
| Objectifs | Le chemin vers une destination | Fanion planté au bout du chemin |
| Quêtes | Le tableau d'aventurier | Panneau de bois à petit toit, fiches épinglées |
| Boutique | L'échoppe | Étal à auvent de toile, étagères |
| Investir | L'observatoire | Tour d'observation avec lunette |
| Assurance-vie (simulation) | Le verger du temps long | Jeunes arbres qui grandissent lentement |
| Collection | La salle des collections | Arche de pierre, vitrines, cartes exposées |
| Apprendre | La bibliothèque de l'observatoire | Livres, cartes du ciel |

Le monde n'invente pas de dragons ni de héros épiques : l'aventure, c'est la progression de l'enfant.

### Monde évolutif (architecture, pas tout développé tout de suite)

| Niveau | Campement |
| --- | --- |
| 1 | Tente, feu de camp, coffre simple, tableau de quêtes |
| 5 | Lanternes allumées, fanion personnel, petite palissade |
| 10 | Cabane de bois, échoppe permanente, jardin |
| 20 | Hameau : deux maisons, pont, observatoire agrandi |

Chaque palier est un **calque additionnel** du même décor (jamais un décor entièrement différent) : l'enfant reconnaît son lieu qui s'enrichit.

## 2. Style général

> **Pivot (septembre 2026)** : l'illustration vectorielle plate a été jugée « cheap » par le propriétaire du produit
> (« on veut un design de niveau Blizzard »). Le monde, les objets et les décors sont désormais **rendus en 3D
> stylisée** par le studio du repo (section 13) ; le vectoriel ne reste que pour les portraits d'avatars et les
> pictogrammes d'interface.

- **3D stylisée, matières réelles** : volumes sculptés et chanfreinés (aucune arête vive), matières PBR (or martelé,
  bois de planches, cuir, cire, verre, terre cuite), lumière de studio chaude. Pas de photoréalisme froid, pas de
  plastique uniforme.
- Silhouettes simples et reconnaissables à 48 px. Les objets doivent se lire en ombre chinoise.
- Fantasy légère et nature : feuillages ronds, érables et ginkgos dorés, pierres moussues.
- Touches japonaises extrêmement discrètes : pièce à trou carré, blason à quatre pétales, vagues *seigaiha* gravées,
  lanternes. Jamais de torii, de kanji décoratif, de sabre ni de cliché.
- Détails maîtrisés : un objet porte 2 à 4 détails signifiants (cerclage, rivets, blason, sceau), pas davantage.
- Ambiances (décision « Mix A + B ») : **heure dorée** pour l'accueil, Mon compte, les quêtes, le coffre, la boutique,
  la landing et l'inscription ; **crépuscule aux lanternes** pour la Collection, Investir / l'observatoire et Mon bilan.

## 3. Perspective

| Usage | Vue | Règle |
| --- | --- | --- |
| Backgrounds / scènes | Panoramique latérale | Horizon entre 40 % et 55 % de la hauteur ; 3 à 5 plans parallèles |
| Objets et bâtiments | Trois-quarts plongeant (~15° pour les scènes, 25-30° pour les objets 3D isolés) | On voit la face avant, le dessus, et un flanc ; même cadrage pour tous les états d'un objet |
| Icônes d'objets (≤ 64 px) | Même trois-quarts simplifié | Le dessus et le flanc droit se réduisent à un bandeau |
| Cartes et boosters | Frontale stricte | Objets plats, légère inclinaison uniquement par l'interface |
| Personnages | Trois-quarts face | Pieds au sol, ombre de contact |

Toujours un seul point de fuite implicite, centré. Aucun objet vu du dessous, aucune perspective forcée.

## 4. Lumière

- **Direction** : lumière principale en haut à gauche (soleil bas de fin d'après-midi).
- **Température** : chaude (≈ 3 500 K) : dessus clairs dorés, faces avant moyennes, flancs droits dans l'ombre.
- **Ombres** : froides et transparentes (bleu-violet `#3b4f78` à 20-35 %), jamais noires. Ombre de contact elliptique sous chaque objet posé.
- **Rim light** : liseré clair doré sur le bord gauche des silhouettes des plans proches ; liseré froid très léger à droite sur les objets métalliques.
- **Atmosphère** : les plans lointains se désaturent et bleuissent ; un halo chaud part du soleil.
- **Sources locales** (lanternes, feu, or) : halos radiaux doux, jamais de bloom sur toute la scène.
- **Variante crépuscule** (collection, investissement, bilans) : ciel bleu nuit `#172941` → rose poudré, lanternes allumées ; même direction de lumière, intensité réduite.

## 5. Matières

| Matière | Base | Clair | Ombre | Détail autorisé |
| --- | --- | --- | --- | --- |
| Bois | `#8a5a3b` | `#b8814f` | `#5a3624` | 1-2 veinures, bouts de planches plus sombres |
| Pierre | `#b3a893` | `#d4cab4` | `#7d725f` | Mousse sur le dessus, 1 fissure |
| Or / laiton | `#e0ae45` | `#f7dd8a` | `#a8701f` | Reflet spéculaire en bande, rivets |
| Fer | `#56627a` | `#8a95a8` | `#343d52` | Rivets uniquement |
| Tissu | `#c8553f` / `#2e4a6b` / `#f1e3c4` | +12 % luminosité | −18 % | Un pli, bord ourlé |
| Cuir | `#9c5b34` | `#c47d4c` | `#64371e` | Couture pointillée |
| Végétation | `#3f7a57` | `#7fb06a` | `#2a5540` | Touffes, jamais brin par brin |
| Papier | `#f6f0df` | `#fffaf0` | `#d8c9a7` | Coin corné, épingle |
| Verre / lanterne | `#ffd58a` | `#fff1c9` | `#e0a24a` | Armature de bois fine |

## 6. Palette du monde

Construite sur les tokens de l'interface (`tokens.css`) :

- Encre / nuit : `#172941`, `#243d55`
- Ivoire / papier : `#f6f0df`, `#fffaf0`
- Or : `#d59b38`, `#f1d389`
- Feuille : `#2d7254`, `#3f7a57`, `#7fb06a`
- Vermillon (fanion) : `#bd5140`, `#c8553f`
- Ciel : `#4a7895`, `#9fc3c8`, pêche `#f7d9a8`
- Lointain : `#8fa9b8`, `#a9bfc6`
- Ombre froide : `#3b4f78`

Règles : saturation maîtrisée (aucune couleur au-dessus de ~75 % de saturation sauf l'or des pièces et les lueurs). Le vermillon est rare : fanions, érable, accents. Le violet n'existe que dans la rareté « Rare » des cartes.

## 7. Personnages

Proportions « jeune aventurier » : 3,5 têtes, tête ronde, grands yeux simples (point sombre + reflet), joues rosées, nez minuscule, pas de bouche agressive. Vêtements d'explorateur (écharpe, sacoche, bottes), palette par personnage limitée à 3 couleurs + peau + cheveux. Même lumière et mêmes ombres que le décor. Poses utiles : repos, content, récompense (bras levés), réflexion (main au menton), objectif atteint (fanion en main).

## 8. Niveau de détail

- Un background doit rester lisible derrière du texte : zone calme (ciel, prairie) réservée derrière les chiffres importants.
- Un objet-icône doit rester reconnaissable à 32 px ; une illustration de scène doit rester belle à 1 440 px.
- Pas plus de 3 niveaux de valeur par matière (clair / base / ombre) + un reflet.

## 9. Règles de production

1. **Aucun texte dans les images.** Panneaux, bannières, étiquettes : vides. Le texte est en HTML.
2. **Assets modulaires** : fond, objets, végétation, particules et avant-plan séparés, composés dans l'app.
3. **Formats** : rendus 3D du studio exportés en **WebP** (fond transparent pour les objets) à plusieurs largeurs
   (`<nom>-<largeur>.webp`, servis via `srcset`) ; SVG pour les avatars ; composants React (`apps/web/src/art/`)
   pour tout ce qui s'anime ou change d'état.
4. **Nommage** : `lieu-objet-variante.ext` en kebab-case, en anglais technique (`valley-golden-wide`, `okodukai-coin`, `savings-chest-full`). Jamais `final`, `v2`, `new`.
5. **Organisation** : `apps/web/public/assets/<catégorie>/` pour les fichiers statiques, `apps/web/src/art/` pour les composants illustrés. Catégories : `brand`, `backgrounds`, `characters`, `avatars`, `coins`, `quests`, `rewards`, `shop`, `savings`, `bank`, `invest`, `cards`, `boosters`, `collections`, `learning`, `decorations`, `textures`, `objects`.
6. **Traçabilité** : chaque asset est inscrit dans `ASSET_REGISTRY.md` (source, méthode, date, licence).
7. **Poids** (WebP) : fond plein cadre ≤ 80 Ko en 1 920 px, objet ≤ 20 Ko à sa taille d'affichage 2x, avatar SVG ≤ 4 Ko. Le logo n'est jamais servi en PNG source (1,2 Mo) : `assets/brand/logo-full-{320,640,960}.webp`.

## 10. Mouvement

Le monde respire, il ne s'agite pas. Un seul moment orchestré par écran (l'arrivée), puis des boucles lentes :

- **Arrivée** (framer-motion) : le décor recule légèrement (zoom 1,08 → 1,03 en 2,4 s), le texte monte (16 px, 0,55 s,
  `ease-out`), le coffre tombe et se pose sur un ressort, six pièces jaillissent et retombent (1,5 s, une seule fois).
- **Boucles** (CSS) : coffre qui flotte (6 s), pièces qui dansent (4,8 s), halo qui respire (3,8 s), poussières
  dorées qui montent dans la lumière (9-19 s).
- **Parallaxe** à la souris uniquement (pas au gyroscope) : décor ±14 px, objet principal ±22 px, ressorts doux.
- **Défilement** : le chemin de la boucle produit se trace une fois quand il entre à l'écran (2,2 s).
- Interfaces : < 300 ms, `ease-out`, jamais `ease-in`. Tout est coupé par `prefers-reduced-motion` (entrées sans
  animation, boucles arrêtées).

## 11. Grille de refus (revue Art Director)

Un asset est refusé s'il présente : perspective incohérente avec la section 3, lumière qui ne vient pas d'en haut à gauche, objet fusionné ou illisible en silhouette, détail aléatoire sans fonction, texte intégré, saturation excessive, style différent des assets voisins, anatomie fausse, accumulation décorative. Revue systématique : l'asset est comparé côte à côte avec la pièce, le coffre et le fond de l'accueil.

## 12. Tests de validation d'un écran

- Sans les textes, reconnaît-on encore Okodukai ?
- Pourrait-il appartenir à n'importe quelle startup ? (doit être non)
- Un parent de 40 ans s'arrêterait-il sur la capture dans un fil LinkedIn ?
- Un enfant de 10 ans dirait-il « c'est mon jeu » ?
- Le chiffre le plus important (solde, reste à épargner, gain d'une quête) est-il lu en moins de 2 secondes ?

## 13. Studio 3D (pipeline du repo)

Aucun générateur d'images externe : tout est produit par du code versionné, donc reproductible et retouchable.

- **Où** : `apps/web/scripts/art/studio/`. Une scène = un module ESM three.js (`scenes/*.js`) qui exporte
  `render(canvas, params)`. `harness.mjs` l'empaquette (esbuild), la rend dans Chromium headless (WebGL2 via
  SwiftShader), suréchantillonne ×2 puis réduit en Lanczos ; `exportWebp` écrit les largeurs demandées.
- **Commandes** : `npm run art:studio --workspace apps/web [-- filtre]` reconstruit les assets listés dans
  `studio/build.mjs` ; `node scripts/art/studio/sheet.mjs <scène> <sortie.png> '<[params]>'` produit une planche de
  revue (fond ivoire, fond nuit, vignette 56 px) ; `shot.mjs` rend un décor seul.
- **Plateau commun** (`lib/stage.js`) : tone mapping ACES, environnement « photo produit » en dôme dégradé (ciel
  crème, horizon ambré, sol chaud clair, nadir bleu nuit `#1c2438`) + boîtes à lumière (clé chaude en haut à gauche,
  contre-jour froid à droite, plafond, réflecteur bas). L'or ne tombe jamais dans le noir.
- **Matières** (`lib/textures.js`) : textures procédurales seedées — métal martelé, planches de bois, pierre,
  gravure *seigaiha* ; `lib/coins.js` fournit la pièce « de foule » instanciée pour les tas et les éclats.
- **Décors** (`scenes/valley.js`) : terrain procédural (rivière sinueuse, collines, montagnes striées), bosquets
  instanciés à feuillage lissé, ciel en shader (dégradé, halo solaire, nuages étirés), brume + perspective
  atmosphérique bleutée, bloom léger, vignettage et grain.
- **Revue** : chaque rendu passe par une planche `sheet.mjs` ; refus si l'or paraît noir ou plâtreux, si une ombre
  portée « flotte » sur l'interface (on garde l'ombre de contact seule), si un objet ne se lit plus à 56 px.

