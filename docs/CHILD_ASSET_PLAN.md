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
| Personnages en pied pour les 14 autres portraits | Profil et moments de jeu | WebP transparent 512 | Fidèles au portrait choisi | P1 | À produire |
| `reward-{cinema,icecream,bicycle,family-game}-{256,512}.webp` | Boutique, récompenses familiales | WebP transparent | Objets trois-quarts, palette du monde | P1 | Livré |
| `quest-{habit,mission,major,booster}.webp` | Journal, type de quête | WebP transparent 256 | Objet sobre, sans texte | P1 | Variantes visuelles par objets existants livrées ; assets dédiés à produire |
| `learning-{diversification,inflation,risk,compound}-{320,640}.webp` | Bibliothèque, mini scènes | WebP carré | Notions illustrées, même vallée | P2 | Livré |
| `child-{gallery,observatory,library,shop}-interior-{1280,1920}.webp` | Lieux intérieurs | WebP panoramique | Même bois, laiton, vallée et lumière | P1 | Livré |
| `child-savings-chamber-{1280,1920}.webp` | Chambre du trésor | WebP panoramique | Pierre moussue et grand coffre | P1 | Livré |
| `child-registry-interior-{1280,1920}.webp` | Registre de compte enfant | WebP panoramique | Comptoir de bois, registre ouvert, vallée par la fenêtre ; zone calme à gauche pour les chiffres | P1 | Livré |
| `hub-tier-{5,10,20,30}.webp` | Progression du village | WebP transparent, calques 1280/720 | Même caméra que les fonds | P2 | Prévu dans l’architecture |
| `xp-tree-{sprout,sapling,young,flowering,mature}-{256,512}.webp` | HUD et profil, croissance avec l'XP | WebP transparent, deux tailles | Trois-quarts, arbre courbe à fleurs ivoire, base moussue et lumière de la vallée | P1 | Livré, cinq formes |
| `goal-waypost-{128,256,512}.webp` | Destination des objectifs libres | WebP transparent, trois tailles | Poteau en bois, carte sans texte, médaillon vide ; trois-quarts | P1 | Livré |

Les sources de la nouvelle série sont dans `apps/web/art/source/child/`. `node apps/web/scripts/optimize-child-art.mjs` régénère les WebP. Les images des cartes et le sachet de booster sont déjà intégrés. Leur changement demande une revue d’ensemble, car ils constituent un système de collection existant.
