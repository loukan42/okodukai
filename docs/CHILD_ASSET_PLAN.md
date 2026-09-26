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
| `child-character-idle-{256,512}.webp` | Place, profil | WebP transparent | Trois-quarts, silhouette du roster | P1 | À produire |
| `child-character-{happy,proud,thinking,victory,discover}.webp` | Récompenses et profil | WebP transparent 512 | Même personnage et caméra | P1 | À produire |
| `reward-{cinema,icecream,bicycle,family-game}.webp` | Boutique, récompenses familiales | WebP transparent 256/512 | Objets trois-quarts, palette du monde | P1 | À produire |
| `quest-{habit,mission,major,booster}.webp` | Journal, type de quête | WebP transparent 256 | Objet sobre, sans texte | P1 | À produire |
| `learning-{diversification,inflation,risk,compound}.webp` | Bibliothèque, mini scènes | WebP 640 | Diaporama pédagogique cohérent | P2 | À produire |
| `hub-tier-{5,10,20,30}.webp` | Progression du village | WebP transparent, calques 1280/720 | Même caméra que les fonds | P2 | Prévu dans l’architecture |

Les images des cartes et le sachet de booster sont déjà intégrés. Leur changement demande une revue d’ensemble, car ils constituent un système de collection existant.
