# Registre des assets — Okodukai

Chaque asset visuel livré dans `apps/web/public/assets/` est listé ici : d'où il vient, comment le régénérer, sous
quelle licence. Règles de production : `docs/ART_BIBLE.md` (sections 9 et 13).

Licence de tous les assets « Studio » et « Pipeline vectoriel » : créations originales d'Okodukai, générées par le
code du dépôt (aucune banque d'images, aucun modèle génératif externe, aucune ressource tierce).

| Asset | Fichiers | Source / méthode | Régénérer | Date |
| --- | --- | --- | --- | --- |
| Pièce Okodukai | `coins/okodukai-coin-{48,96,192,512}.webp` | Studio 3D, `scenes/coin.js` : disque à trou carré, gravure *seigaiha*, blason à 4 pétales, 8 rivets | `npm run art:studio --workspace apps/web -- okodukai-coin` | 2026-09-26 |
| Coffre (6 états) | `savings/savings-chest-{closed,empty,low,full,almost,reached}-{240,480,720}.webp` | Studio 3D, `scenes/chest.js` : planches, bandes et coins d'or, serrure frappée de la pièce, tas de pièces instanciées. Même cadrage pour tous les états | `… -- savings-chest` | 2026-09-26 |
| Parchemin de quête | `objects/quest-scroll-{128,256,512}.webp` | Studio 3D, `scenes/props.js` (`quest-scroll`) : carte au trait, sceau de cire | `… -- quest-scroll` | 2026-09-26 |
| Bourse | `objects/coin-pouch-{128,256,512}.webp` | Studio 3D, `scenes/props.js` (`coin-pouch`) : cuir froncé, lien doré, pièces | `… -- coin-pouch` | 2026-09-26 |
| Sablier | `objects/hourglass-{128,256,512}.webp` | Studio 3D, `scenes/props.js` (`hourglass`) : verre transmissif, sable doré, colonnes d'or | `… -- hourglass` | 2026-09-26 |
| Pousse à pièces | `objects/coin-sprout-{128,256,512}.webp` | Studio 3D, `scenes/props.js` (`coin-sprout`) : pot de terre cuite, pièces en guise de fruits | `… -- coin-sprout` | 2026-09-26 |
| Tableau d'aventurier | `quests/quest-board-{180,360,540,1080}.webp` | Studio 3D, `scenes/board.js` : panneau de planches, pignon au médaillon, trois avis épinglés, lanterne | `… -- quest-board` | 2026-09-26 |
| Lunette, arbre du verger, étagère | `objects/{telescope,orchard-tree,bookshelf}-{128,256,512}.webp` | Studio 3D, `scenes/places.js` : lunette de laiton sur trépied et étoile ; arbre au feuillage en boules et pièces-fruits ; étagère de livres reliés d'or | `… -- telescope` · `orchard-tree` · `bookshelf` | 2026-09-26 |
| Échoppe | `shop/shop-stall-{180,360,540}.webp` | Studio 3D, `scenes/shop.js` : comptoir de planches, auvent rayé festonné, étagère, bourse, paquets cadeaux, parchemin, lanterne ; médaillon de la pièce | `… -- shop-stall` | 2026-09-26 |
| Vallée, heure dorée | `backgrounds/valley-golden-wide-{1280,1920}.webp`, `backgrounds/valley-golden-tall-{720,1080}.webp` | Studio 3D, `scenes/valley.js` (`mood: "golden"`) : terrain procédural, bosquets, ciel shader, brume | `… -- valley-golden` | 2026-09-26 |
| Vallée, crépuscule | `backgrounds/valley-dusk-wide-{1280,1920}.webp`, `backgrounds/valley-dusk-tall-{720,1080}.webp` | Studio 3D, `scenes/valley.js` (`mood: "dusk"`) : lanternes le long de la rivière | `… -- valley-dusk` | 2026-09-26 |
| Landing : vallée et chemin, heure dorée | `backgrounds/valley-path-golden-wide-{1280,1920}.webp`, `backgrounds/valley-path-golden-tall-{720,1080}.webp` | Studio 3D, `scenes/world.js` (`layer: "bg"`) : la vallée de `valley.js`, un chemin de terre battue vers le hameau (maisons, observatoire) | `… -- valley-path` | 2026-09-26 |
| Landing : avant-plan | `decorations/valley-foreground-golden-{wide,tall}-*.webp` | Studio 3D, `scenes/world.js` (`layer: "fg"`) : touffes à feuilles rondes, buissons, pierres moussues, pièces tombées ; fond transparent, plus bas côté titre | `… -- valley-foreground` | 2026-09-26 |
| Landing : hameau à l'aube | `backgrounds/valley-hamlet-dawn-{wide,tall}-*.webp` | Studio 3D, `scenes/world.js` (`mood: "dawn"`) : plus loin sur le chemin, fenêtres et lanternes encore allumées | `… -- valley-hamlet` | 2026-09-26 |
| Socle du téléphone | `objects/stone-plinth-{450,900}.webp` | Studio 3D, `scenes/world.js` (`layer: "base"`) : dalle de pierre moussue, touffes, deux pièces | `… -- stone-plinth` | 2026-09-26 |
| Textures de la pièce 3D | `coins/okodukai-coin-{face,edge}-{normal,roughness}.webp` | Cuites par `scripts/art/studio/bake-coin.mjs` depuis `lib/textures.js`, pour la pièce temps réel de la landing (`pages/landing/coin3d.js`) | `node scripts/art/studio/bake-coin.mjs` (dans `apps/web`) | 2026-09-26 |
| Portrait d'Emma (démo) | `avatars/aventurier-06-{96,192}.webp` | Case du roster `avatars/roster-v2.png` découpée et réduite (sharp), pour ne pas charger la planche de 2 Mo sur la landing | découpe sharp, colonne 2 ligne 2 | 2026-09-26 |
| Tableau de bord parent (capture) | `screens/parent-dashboard-{960,1440}.webp` | Capture réelle de l'espace parent du foyer de démonstration (Playwright, outils de démo masqués), une quête « Ranger sa chambre » en attente | refaire la capture sur le foyer de démo | 2026-09-26 |
| Avatars (roster de 12) | `avatars/aventurier-01.svg` … `aventurier-12.svg` | Pipeline vectoriel, `scripts/art/characters/avatars.mjs` | `node scripts/art/export-svg.mjs avatars` (dans `apps/web`) | 2026-09-26 |
| Logo (déclinaisons web) | `brand/logo-full-{320,640,960}.webp` | Redimensionnement WebP (sharp) du logo peint fourni par le propriétaire (`public/logo-full.png`) | voir commande `sharp` dans l'historique du commit | 2026-09-26 |

## Hors registre (à traiter)

- `apps/web/public/cards/**` et `apps/web/public/avatars/*.png` : images de *Héros de la classe* copiées localement,
  gitignorées (voir `CLAUDE.md`). Les anciens identifiants d'avatars restent lisibles : `Avatar.tsx` retombe sur un
  portrait du roster si le PNG manque.
- `apps/web/src/assets/cards/card-{single,booster}.webp` : visuels du système de cartes repris de *Héros de la
  classe* (voir `CLAUDE.md`), convertis en WebP 640 px (2,5 Mo → 260-280 Ko chacun). Le sachet est habillé
  Okodukai par `components/booster/BoosterPack.tsx` : logo sur l'ancien titre anglais, ruban au nom de l'univers
  sur le crâne. Décision du 26/09 : le propriétaire préfère cette matière dorée à un sachet vectoriel. Le dos de
  carte d'origine n'est plus affiché par l'ouverture, qui dessine son propre dos en SVG.
