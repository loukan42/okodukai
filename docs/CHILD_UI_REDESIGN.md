# Refonte des écrans enfant — Vallée d'Okodukai

## Structure

L'accueil est une scène navigable. Chaque destination est un lien HTML nommé et ciblable au clavier ; l'illustration sert de carte du monde, et les plaques portent le texte. Le HUD regroupe profil, niveau, XP et pièces disponibles. Le niveau du serveur choisit un palier `data-world-tier` (1, 5, 10, 20, 30) ; les calques peints de chaque palier enrichissent la vallée sans changer les URL ni les règles métier.

| Route | Lieu | Objet et contenu prioritaires |
| --- | --- | --- |
| `/enfant` | Place de la vallée | Panorama horizontal ou vertical, personnage, six destinations, HUD, deux nouvelles utiles |
| `/enfant/quetes` | Journal d'aventurier | Tableau, fiches illustrées, statut, gains seulement après validation |
| `/enfant/argent` | Registre de la bourse | Solde lisible, entrées et sorties, accès au coffre |
| `/enfant/argent/coffre` | Chambre du trésor | Coffre à états, solde, prime, transfert et objectifs |
| `/enfant/argent/investir` | Observatoire | Temps, supports, risques et courbe sans promesse de rendement |
| `/enfant/argent/investir/bibliotheque` | Bibliothèque | Scènes de notion, leçons chiffrées et carnet |
| `/enfant/boutique` | Échoppe | Objets familiaux illustrés, prix en pièces, demande soumise au parent |
| `/enfant/collection` | Galerie aux lanternes | Booster à ouvrir, univers, cartes exposées ; salle conservée dans chaque album |
| `/enfant/profil` | Atelier du personnage | Personnage, niveau, choix parmi 16 portraits et cadres déverrouillés par l'XP |

Les pièces et XP demeurent des valeurs serveur. Une quête en attente n'affiche pas son gain comme acquis. Le compte garde un relevé lisible ; les placements restent une simulation pédagogique. Les cartes et l'ouverture de booster existantes sont réemployées.

Les récompenses usuelles du foyer de démonstration possèdent maintenant des objets distincts, notamment dessert, musique, invitation d'un ami, figurine et livre. Le temps d'écran réemploie le sablier de la vallée. Une récompense libre créée par le parent conserve un pictogramme de catégorie si aucun objet ne correspond à son titre ; l'illustration ne change ni le prix ni la validation parentale.

Le journal choisit l'objet de chaque fiche d'après sa catégorie serveur, plutôt que sa position dans une liste. Maison, autonomie, apprentissage, entraide, créativité, école, jardin et animaux ont huit objets distincts. Le nom de la catégorie et le type de quête sont écrits en français et en anglais. Les habitudes et grandes quêtes ont chacune un bord de fiche reconnaissable ; la numérotation arbitraire des fiches a été retirée.

L'XP fait aussi pousser un arbre personnel, visible dans le HUD et sur le profil. Cinq illustrations de la même espèce correspondent aux niveaux 1, 5, 10, 20 et 30. La taille varie légèrement entre ces seuils selon l'XP du niveau courant ; le prochain seuil est indiqué en texte. Un gain détecté depuis la dernière visite sur l'appareil déclenche une réaction courte, jamais un gain simulé. Ce compagnon visuel est purement cosmétique ; les nombres et les récompenses restent ceux du serveur. Le registre de compte possède maintenant sa propre scène intérieure, avec le solde sur une surface sombre lisible. Chaque objectif du coffre est une destination au bout d'un chemin : la pièce avance selon le montant du serveur. À la création d'un objectif libre, l'enfant choisit l'un des neuf objets peints de la boutique ; les objectifs anciens sans choix conservent le poteau illustré.

Le profil propose aussi trois cadres de portrait : bois et laiton au niveau 5, feuillage au niveau 10, observatoire au niveau 20. L'enfant peut revenir au portrait sans cadre. Le serveur vérifie le niveau calculé depuis l'XP avant d'enregistrer le choix sur son profil ; le cadre apparaît dans l'en-tête, sur l'accueil et dans le choix des portraits. Aucun cadre ne modifie les pièces, l'XP ou les récompenses. Les cadres verrouillés restent visibles avec leur niveau requis.

## Deux appareils, un foyer

Depuis l'espace parent, **Espace enfant** ouvre le choix d'un profil. Pour prêter le téléphone, le parent crée d'abord un PIN parent de quatre chiffres en confirmant son mot de passe, puis appuie sur **Donner ce téléphone**. Le bouton Parent de l'espace enfant demande ce PIN pour revenir. Le mot de passe parent reste une solution de retour. Pour un téléphone distinct, **Partager un lien** crée une invitation à usage unique valable 24 heures ; l'enfant ouvre le lien et saisit son propre PIN. L'invitation ne transporte pas la session parent. Les routes et protections serveur sont décrites dans `DATA_MODEL.md` et testées dans `auth.e2e.test.ts`.

## Adaptation des formats

Dans le build local, la barre « Démo » propose les niveaux 1 à 30 pour le profil enfant connecté. Le niveau choisi n'est qu'un aperçu dans l'onglet : la vallée, l'arbre et la fiche de progression changent, tandis que les données du foyer restent intactes. Revenir à « Niveau réel » ferme l'aperçu. Le choix d'un cadre est désactivé pendant l'aperçu, car son déblocage dépend du vrai niveau.

Le script `node apps/web/scripts/capture-demo-levels.mjs` vérifie les seuils 1, 5, 10, 20 et 30, le retour au niveau réel et l'absence de débordement à 375, 768 et 1280 px. Les captures `docs/screenshots/demo-level-*` montrent le sélecteur ouvert, la vallée et le profil ; le script vérifie aussi que l'XP réel n'a pas changé.

- À 375 px, la scène du village utilise le fond vertical ; les plaques restent accessibles au-dessus de la navigation fixe, le HUD dispose le niveau sous le nom, et l'échoppe garde deux objets par rangée.
- À 768 px, le panorama montre les six bâtiments et les panneaux de contenu restent limités en largeur.
- À 1280 px, le monde remplit une grande scène sans étirer les fiches de lecture. La navigation flotte au bas de la fenêtre, sans couvrir les plaques du village.
- Les actions ont au moins 44 px ; le focus est visible. Les animations s'arrêtent avec `prefers-reduced-motion`.
- L'arbre, le profil, le registre, un objectif du coffre, les huit catégories de quête, la collection, ses albums et la bibliothèque ont été capturés aux trois largeurs dans `docs/screenshots/child-experience-*` ; la capture est régénérable par `node apps/web/scripts/capture-child-experience.mjs` avec Chrome local. Les cinq paliers de la vallée sont dans `docs/screenshots/child-valley-tier-*`. Les chargements enfant montrent le sablier illustré, sans spinner bloquant.
- Le choix des cadres est contrôlé à 375, 768 et 1280 px dans `docs/screenshots/child-portrait-frames-*`, régénérable par `node apps/web/scripts/capture-child-frames.mjs` avec Chrome local. La fixture remplace le niveau et le cadre dans les réponses du navigateur ; elle n'écrit pas dans la base.
- Les cinq poses supplémentaires des quatorze personnages sont regroupées dans `docs/screenshots/child-character-poses-{1,2}.png`. Les captures `child-character-{01,08,16}-*` contrôlent la place et le profil à 375/768/1280 px. `child-goal-artwork-{journey,choice}-*` vérifie le choix d'image à ces largeurs, avec une réponse locale simulée sans écriture en base.

## Langue et contenu

Les nouveaux textes de l'accueil, de la navigation, du journal, de la boutique, du profil, du PIN et du passage parent/enfant utilisent `defineCopy` avec français et anglais. La langue est transmise à l'API par `X-Locale`. Les titres de quêtes, de récompenses, de modules et de cartes sont des contenus créés en français par le foyer ou le seed et ne sont pas traduits automatiquement ; la localisation de ces contenus demande un modèle éditorial distinct.

## Personnages et paliers livrés

Les 16 portraits ont chacun un personnage en pied avec six poses : repos, heureux, fier, réflexion, victoire et découverte. La place montre la pose heureuse, le profil la pose fière et les étapes de leçon passent de découverte à réflexion puis fier ; la validation de quête utilise victoire. Les planches des quatorze derniers personnages ont été produites à partir de leur pose repos et inspectées côte à côte avant découpe. Les paliers 5, 10, 20 et 30 ajoutent chacun un calque complet au village ; le hameau du fond est le palier 1.
