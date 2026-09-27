# Refonte des écrans enfant — Vallée d'Okodukai

## Structure

L'accueil est une scène navigable. Chaque destination est un lien HTML nommé et ciblable au clavier ; l'illustration sert de carte du monde, et les plaques portent le texte. Le HUD regroupe profil, niveau, XP et pièces disponibles. Le niveau du serveur choisit un palier `data-world-tier` (1, 5, 10, 20, 30) ; les décors supplémentaires pourront s'y brancher sans changer les URL ni les règles métier.

| Route | Lieu | Objet et contenu prioritaires |
| --- | --- | --- |
| `/enfant` | Place de la vallée | Panorama horizontal ou vertical, personnage, six destinations, HUD, deux nouvelles utiles |
| `/enfant/quetes` | Journal d'aventurier | Tableau, fiches illustrées, statut, gains seulement après validation |
| `/enfant/argent` | Registre de la bourse | Solde lisible, entrées et sorties, accès au coffre |
| `/enfant/argent/coffre` | Chambre du trésor | Coffre à états, solde, prime, transfert et objectifs |
| `/enfant/argent/investir` | Observatoire | Temps, supports, risques et courbe sans promesse de rendement |
| `/enfant/argent/investir/bibliotheque` | Bibliothèque | Scènes de notion, leçons chiffrées et carnet |
| `/enfant/boutique` | Échoppe | Objets familiaux illustrés, prix en pièces, demande soumise au parent |
| `/enfant/collection` | Galerie aux lanternes | Booster à ouvrir, univers, cartes exposées |
| `/enfant/profil` | Atelier du personnage | Personnage, niveau et choix parmi 16 portraits |

Les pièces et XP demeurent des valeurs serveur. Une quête en attente n'affiche pas son gain comme acquis. Le compte garde un relevé lisible ; les placements restent une simulation pédagogique. Les cartes et l'ouverture de booster existantes sont réemployées.

L'XP fait aussi pousser un arbre personnel, visible dans le HUD et sur le profil. Cinq illustrations de la même espèce correspondent aux niveaux 1, 5, 10, 20 et 30. La taille varie légèrement entre ces seuils selon l'XP du niveau courant ; le prochain seuil est indiqué en texte. Un gain détecté depuis la dernière visite sur l'appareil déclenche une réaction courte, jamais un gain simulé. Ce compagnon visuel est purement cosmétique ; les nombres et les récompenses restent ceux du serveur. Le registre de compte possède maintenant sa propre scène intérieure, avec le solde sur une surface sombre lisible. Chaque objectif du coffre est une destination au bout d'un chemin : la pièce avance selon le montant du serveur, les quatre récompenses illustrées connues montrent leur objet, et les titres libres utilisent un poteau sans texte peint.

## Deux appareils, un foyer

Depuis l'espace parent, **Espace enfant** ouvre le choix d'un profil. Pour prêter le téléphone, le parent crée d'abord un PIN parent de quatre chiffres en confirmant son mot de passe, puis appuie sur **Donner ce téléphone**. Le bouton Parent de l'espace enfant demande ce PIN pour revenir. Le mot de passe parent reste une solution de retour. Pour un téléphone distinct, **Partager un lien** crée une invitation à usage unique valable 24 heures ; l'enfant ouvre le lien et saisit son propre PIN. L'invitation ne transporte pas la session parent. Les routes et protections serveur sont décrites dans `DATA_MODEL.md` et testées dans `auth.e2e.test.ts`.

## Adaptation des formats

- À 375 px, la scène du village utilise le fond vertical ; les plaques restent accessibles au-dessus de la navigation fixe, le HUD dispose le niveau sous le nom, et l'échoppe garde deux objets par rangée.
- À 768 px, le panorama montre les six bâtiments et les panneaux de contenu restent limités en largeur.
- À 1280 px, le monde remplit une grande scène sans étirer les fiches de lecture. La navigation flotte au bas de la fenêtre, sans couvrir les plaques du village.
- Les actions ont au moins 44 px ; le focus est visible. Les animations s'arrêtent avec `prefers-reduced-motion`.
- L'arbre, le profil, le registre et un objectif du coffre ont été capturés aux trois largeurs dans `docs/screenshots/child-experience-*` ; la capture est régénérable par `node apps/web/scripts/capture-child-experience.mjs` avec Chrome local.

## Langue et contenu

Les nouveaux textes de l'accueil, de la navigation, du journal, de la boutique, du profil, du PIN et du passage parent/enfant utilisent `defineCopy` avec français et anglais. La langue est transmise à l'API par `X-Locale`. Les titres de quêtes, de récompenses, de modules et de cartes sont des contenus créés en français par le foyer ou le seed et ne sont pas traduits automatiquement ; la localisation de ces contenus demande un modèle éditorial distinct.

## Suite prévue

Les 16 portraits sont disponibles, mais seuls Emma (`aventurier-06`) et Lucas (`aventurier-05`) disposent aujourd'hui de personnages de plein pied, en repos et en victoire. Les autres choix affichent leur portrait. Les cinq paliers du village sont sélectionnés par le niveau mais partagent encore le même décor ; les calques de progression et les poses supplémentaires sont des enrichissements graphiques futurs. Aucun effet de progression fictif n'est affiché.
