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
| XP | Barre abstraite | Arbre personnel en cinq formes, croissance graduelle et profil explicatif |
| Portrait | Choix parmi 16 visages | Trois cadres cosmétiques à gagner aux niveaux 5, 10 et 20, sélection enregistrée et affichée dans l'en-tête et l'accueil |
| Mon compte | Aplat bleu et solde | Registre intérieur illustré, solde sur contraste sombre, historique conservé lisible |
| Objectifs | Barre seule | Chemin parcouru par la pièce, destination illustrée, montant écrit et progression accessible |

## Captures contrôlées

- 375 px : `screenshots/child-home-mobile-375.png`, `child-quests-mobile-375.png`, `child-vault-mobile-375.png`, `child-shop-mobile-375.png`, `child-profile-mobile-375.png`.
- 768 px : `screenshots/child-home-tablet-768.png`, `child-gallery-tablet-768.png`.
- 1280 px : `screenshots/child-home-desktop-1280.png`, `child-observatory-desktop-1280.png`.
- 375, 768 et 1280 px : `screenshots/child-experience-{home,profile,account,goal}-*.png`, régénérables par `node apps/web/scripts/capture-child-experience.mjs`.
- 375, 768 et 1280 px : `screenshots/child-experience-{collection,album,album-empty}-*.png`. L'album possède maintenant la salle aux lanternes jusque dans la vue d'un univers ; les filtres vides montrent une bibliothèque et une consigne adaptée.
- 375, 768 et 1280 px : `screenshots/child-experience-{learning-list,learning-detail}-*.png`. Les six poses d'Emma et de Lucas sont disponibles ; la scène de leçon affiche découverte, réflexion ou fierté selon l'étape. Le décor et le texte restent lisibles sur téléphone, tablette et ordinateur.
- 375, 768 et 1280 px : `screenshots/child-experience-{quests,vault,shop,shop-end,observatory}-*.png`. Les captures de début et de fin de boutique montrent tous les objets courants et la navigation à sa place dans la fenêtre. Les images sont contrôlées après chargement et les pages ne débordent pas horizontalement.

Les captures viennent du foyer local de démonstration ; le bouton « Démo » n'apparaît pas en production. Le contrôle a aussi porté sur le dialogue PIN à 375 px, sa fermeture par Échap et l'absence de débordement horizontal sur les principaux écrans.

- Les cadres de portrait ont leurs captures `screenshots/child-portrait-frames-{375,768,1280}.png`. La fixture montre le niveau 10 et le cadre feuillage, laisse le cadre du niveau 20 verrouillé et vérifie que le choix du cadre campement actualise l'en-tête. Les trois PNG transparents ont été contrôlés au centre et hors de l'anneau ; les six WebP chargent et les trois pages ne débordent pas horizontalement. Le test `childAccess.e2e.test.ts` couvre le refus serveur avant les niveaux 5, 10 et 20 et l'enregistrement après chaque seuil.

## Points corrigés pendant la revue

- Plaques du coffre, des quêtes et de la boutique remontées dans la scène pour rester visibles au-dessus de la navigation fixe.
- Nom de l'enfant entier dans le HUD à 375 px, avec niveau sur une deuxième ligne.
- Onglets du compte disposés en quatre colonnes sur téléphone ; Historique reste visible sans défilement latéral.
- Contraste du texte blanc dans la chambre du trésor ; aucune donnée sur le décor nu.
- PIN masqué et touche d'effacement nommée pour le lecteur d'écran.
- Deux rendus d'échoppe évalués : le premier comportait des pseudo-inscriptions et a été écarté ; le second, sans texte peint, est intégré.
- Album d'univers : son entête auparavant posé sur le fond beige reprend le décor de la galerie, avec un voile qui conserve la lisibilité. Les univers sans illustration de carte utilisent un pan de la galerie. Les chargements enfant affichent un sablier du monde. L'ouverture du booster a été vérifiée jusqu'au récapitulatif ; le dernier coup sur le cristal annonce sa rupture au lieu d'afficher « encore 0 touche ».
- Boutique : la première planche de nouveaux objets reprenait le même motif d'étoile sur plusieurs récompenses sans raison. Elle a été rejetée. Les objets ont été refaits séparément, sans inscription ni emblème arbitraire. Le dessert et la glace ont deux images distinctes ; les récompenses de musique, ami, figurine, livre et temps d'écran ont chacune un objet lisible.
- Personnages : les 16 portraits disposent d'un corps entier avec leurs traits et vêtements du roster. Les captures `child-character-{01,04,07,10,11,12,16}-{home,profile}-{375,768,1280}.png` contrôlent des silhouettes variées dans la vallée et le profil. Les portraits verticaux débordaient du profil sur tablette : le conteneur de figure utilise maintenant un bloc de hauteur fixe. Aucun débordement après nouvelle capture.
- Journal : les huit catégories ont chacune un objet, sans motifs arbitraires ni inscriptions. Les captures `child-experience-quests-{375,768,1280}.png` utilisent une fixture visuelle stable parce que les quêtes du foyer de démo local avaient déjà été validées ; elles contrôlent les images, le cadrage et l'absence de débordement, pas les récompenses réelles.
- Vallée : les paliers 5, 10, 20 et 30 montrent des ajouts peints et cumulés dans les deux cadrages, avec 15 captures `child-valley-tier-*` à 375, 768 et 1280 px. Le calque est aligné et ne bloque aucun lieu.

## Revue par profils (inspection de l'interface, sans test utilisateur)

| Regard | Constat et décision |
| --- | --- |
| Direction artistique jeu | Bois, laiton, pierre et lumière de vallée relient la place, les intérieurs et les objets. Le même arbre traverse le HUD et le profil. |
| Game UI | Les destinations sont des lieux, le booster forme une courte séquence avec passage direct et révélation complète, les quêtes ont un journal. Les chiffres du compte restent sur des surfaces lisibles. |
| Concept art | Les nouvelles scènes n'ont pas d'inscriptions peintes et gardent une perspective compatible. Les cartes historiques préexistantes ont des cadrages plus variés ; leurs cadres les rassemblent visuellement. |
| Produit | Les liens du village et les filtres de cartes sont des contrôles nommés ; PIN, soldes, historique et règles parentales restent explicites. Les captures aux trois largeurs ne montrent pas de débordement horizontal. |
| Progression de jeu | L'XP fait pousser l'arbre, attribue des boosters de niveau côté serveur et annonce les prochains seuils. Aucun achat ou pari n'est associé au booster. |
| Lecture 9 ans | Les lieux, objets et gros boutons donnent des points d'entrée visuels. Les données complexes restent dans les vues financières adaptées à l'âge. |
| Lecture 12 ans | Le dessin garde un ton d'aventure sans mascotte bébé ; l'historique et les placements offrent le détail supplémentaire. |
| Parent et découverte | Le passage parent/enfant est visible sur le téléphone partagé. Les captures de la place et des intérieurs montrent d'abord le monde, puis l'usage éducatif. |

## Limites constatées

Les personnages de plein pied couvrent les 16 portraits et ont chacun six poses depuis le 28 septembre. Les contenus éditoriaux créés par le foyer et certains contenus du seed restent en français ; les traduire automatiquement risquerait de changer leur sens. Pour un objectif libre, l'enfant choisit l'image la plus proche de son idée parmi neuf objets. Ces limites de contenu sont consignées dans `CHILD_UI_REDESIGN.md` et `CHILD_ASSET_PLAN.md` ; elles ne changent ni les soldes, ni les protections parentales.
