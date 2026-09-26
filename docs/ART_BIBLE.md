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

- Illustration vectorielle **peinte** : formes douces, volumes lisibles par aplats dégradés, pas de contour noir. Un contour sombre très fin (couleur de l'ombre du matériau, jamais noir) est autorisé sur les petits objets d'interface ≤ 64 px pour la lisibilité.
- Silhouettes simples et reconnaissables à 48 px. Les objets doivent se lire en ombre chinoise.
- Fantasy légère et nature : feuillages ronds, ginkgos dorés, érables vermillon ponctuels, pierres moussues.
- Touches japonaises extrêmement discrètes : lanternes de papier, pièce à trou carré, toits à débord légèrement relevé, tissus façon *noren* (sans motif ni texte). Jamais de torii, de kanji décoratif, de sabre ni de cliché.
- Détails maîtrisés : un objet porte 2 à 4 détails signifiants (cerclage, rivets, clou, pli), pas davantage.

## 3. Perspective

| Usage | Vue | Règle |
| --- | --- | --- |
| Backgrounds / scènes | Panoramique latérale | Horizon entre 40 % et 55 % de la hauteur ; 3 à 5 plans parallèles |
| Objets et bâtiments | Frontale trois-quarts, légèrement plongeante (~15°) | On voit la face avant, le dessus, et le flanc droit |
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
3. **Formats** : vectoriel natif en SVG optimisé (fond et objets) ; WebP/AVIF uniquement pour les textures et les rares rendus raster ; composants React pour les objets animés ou à états.
4. **Nommage** : `lieu-objet-variante.ext` en kebab-case, en anglais technique (`child-home-valley-bg-far.svg`, `okodukai-coin-large`, `savings-chest-full`). Jamais `final`, `v2`, `new`.
5. **Organisation** : `apps/web/public/assets/<catégorie>/` pour les fichiers statiques, `apps/web/src/art/` pour les composants illustrés. Catégories : `brand`, `backgrounds`, `characters`, `avatars`, `coins`, `quests`, `rewards`, `shop`, `savings`, `bank`, `invest`, `cards`, `boosters`, `collections`, `learning`, `decorations`, `textures`.
6. **Traçabilité** : chaque asset est inscrit dans `ASSET_REGISTRY.md` (source, méthode, date, licence).
7. **Poids** : background complet ≤ 120 Ko (gzip), objet ≤ 15 Ko, texture ≤ 30 Ko.

## 10. Mouvement

Le monde respire, il ne s'agite pas : fanion qui ondule (4-6 s), lanternes qui scintillent, feuilles de ginkgo qui tombent, poussière lumineuse, pièce qui tourne une fois à l'apparition, coffre qui se soulève légèrement quand on y dépose des pièces. Parallaxe ≤ 12 px. Tout est coupé par `prefers-reduced-motion`.

## 11. Grille de refus (revue Art Director)

Un asset est refusé s'il présente : perspective incohérente avec la section 3, lumière qui ne vient pas d'en haut à gauche, objet fusionné ou illisible en silhouette, détail aléatoire sans fonction, texte intégré, saturation excessive, style différent des assets voisins, anatomie fausse, accumulation décorative. Revue systématique : l'asset est comparé côte à côte avec la pièce, le coffre et le fond de l'accueil.

## 12. Tests de validation d'un écran

- Sans les textes, reconnaît-on encore Okodukai ?
- Pourrait-il appartenir à n'importe quelle startup ? (doit être non)
- Un parent de 40 ans s'arrêterait-il sur la capture dans un fil LinkedIn ?
- Un enfant de 10 ans dirait-il « c'est mon jeu » ?
- Le chiffre le plus important (solde, reste à épargner, gain d'une quête) est-il lu en moins de 2 secondes ?
