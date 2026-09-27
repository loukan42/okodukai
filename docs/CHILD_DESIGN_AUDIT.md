# Revue de la refonte enfant — 27 septembre 2026

## Avant / après

| Axe | Avant | Après vérifié |
| --- | --- | --- |
| Accueil | Panneaux de dashboard et quelques éléments gaming | Village panorama mobile/ordinateur, lieux cliquables, personnage et HUD stable |
| Quêtes | Liste de fiches | Journal en bois avec illustration, type, statut et gains conditionnés à la validation |
| Coffre | Solde et coffre sur fond clair | Chambre du trésor, coffre à six états, montant et règle lisibles |
| Boutique | Grille de récompenses peu incarnées | Échoppe illustrée, objets familiaux en 3D, étagère en bois |
| Collection | Fond de vallée au crépuscule | Galerie intérieure éclairée aux lanternes ; boosters et cartes existants conservés |
| Placements / apprendre | Décor générique et leçons textuelles | Observatoire et bibliothèque dédiés, quatre mini scènes de notions |
| Accès enfant | Profil parent sans passage clair | Choix même téléphone avec PIN parent, ou invitation unique pour un appareil distinct |

## Captures contrôlées

- 375 px : `screenshots/child-home-mobile-375.png`, `child-quests-mobile-375.png`, `child-vault-mobile-375.png`, `child-shop-mobile-375.png`, `child-profile-mobile-375.png`.
- 768 px : `screenshots/child-home-tablet-768.png`, `child-gallery-tablet-768.png`.
- 1280 px : `screenshots/child-home-desktop-1280.png`, `child-observatory-desktop-1280.png`.

Les captures viennent du foyer local de démonstration ; le bouton « Démo » n'apparaît pas en production. Le contrôle a aussi porté sur le dialogue PIN à 375 px, sa fermeture par Échap et l'absence de débordement horizontal sur les principaux écrans.

## Points corrigés pendant la revue

- Plaques du coffre, des quêtes et de la boutique remontées dans la scène pour rester visibles au-dessus de la navigation fixe.
- Nom de l'enfant entier dans le HUD à 375 px, avec niveau sur une deuxième ligne.
- Onglets du compte disposés en quatre colonnes sur téléphone ; Historique reste visible sans défilement latéral.
- Contraste du texte blanc dans la chambre du trésor ; aucune donnée sur le décor nu.
- PIN masqué et touche d'effacement nommée pour le lecteur d'écran.
- Deux rendus d'échoppe évalués : le premier comportait des pseudo-inscriptions et a été écarté ; le second, sans texte peint, est intégré.

## Limites constatées

Les personnages de plein pied couvrent deux portraits et deux poses chacun. Les autres portraits restent des avatars. Les paliers visuels 5/10/20/30 utilisent encore la scène de base. Les contenus éditoriaux du foyer et du seed restent en français. Ces limites sont consignées dans `CHILD_UI_REDESIGN.md` et `CHILD_ASSET_PLAN.md` ; elles ne changent ni les soldes, ni les protections parentales.
