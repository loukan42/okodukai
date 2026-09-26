# Plan des assets restants

Ce qui manque encore pour que chaque lieu de l'application ait sa matière. Les assets livrés sont listés dans
`ASSET_REGISTRY.md` ; les règles de fabrication sont dans `ART_BIBLE.md` (§9 et §13). Statuts : **à faire**,
**en cours**, **livré**, **abandonné** (avec la raison).

| Asset | Lieu | Priorité | Statut | Notes |
| --- | --- | --- | --- | --- |
| Sachet de booster Okodukai | Accueil, collection, ouverture | haute | **livré** (26/09) | Illustration dorée d'origine + logo + ruban d'univers (`BoosterPack.tsx`). Une version 3D studio n'est plus prioritaire : le propriétaire préfère la matière actuelle. |
| Dos de carte Okodukai | Ouverture de booster | haute | **livré** (26/09) | SVG dans `BoosterOpenOverlay.tsx` (nuit, cadre doré, étoile du cercle). À décliner en asset studio si l'album affiche un jour des cartes retournées. |
| Cercle d'invocation | Ouverture de booster | haute | **livré** (26/09) | SVG `RuneCircle.tsx`, mots gravés : les qualités des quêtes. |
| Échoppe (auvent, comptoir, marchandises) | En-tête de la boutique | moyenne | à faire | Scène studio `scenes/shop.js` à créer, même plateau que `board.js`. Remplacera l'icône de l'en-tête. |
| Observatoire 3D (lunette, lanternes) | En-tête de « Investir » | moyenne | à faire | Nuit, lanternes qui s'allument au relevé (motion prévue, voir P3.6). |
| Verger (arbres de pièces) | Verger du temps long | moyenne | à faire | Deux humeurs : « belle récolte » et « un hiver ». |
| Bibliothèque (étagère, livres) | Bibliothèque | basse | à faire | Peut réutiliser le plateau du tableau d'aventurier. |
| Décors par lieu (bandeaux) | Mon argent, boutique, quêtes | basse | à faire | Recadrages de la vallée existante d'abord ; nouvelles scènes seulement si le recadrage ne suffit pas. |
| Boosters par univers | Collection, ouverture | basse | à faire | Variante de couleur du ruban et du halo par univers, sans nouvelle illustration. |
| Stockage des images de cartes | Production | haute | décision attendue | S3, Supabase storage propre à Okodukai ou Git LFS (voir `RESTE_A_FAIRE.md` §1.4). |

Chaque asset livré ajoute sa ligne dans `ASSET_REGISTRY.md` (source, commande de régénération, date).
