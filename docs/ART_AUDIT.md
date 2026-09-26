# Audit artistique — septembre 2026

Captures de référence : parcours complet enfant (8-9 et 10-12 ans), parent, landing et inscription, foyer de démo Martin.

## Constat général

L'interface a une palette cohérente (bleu nuit, ivoire, or, vert) et une typographie de caractère, mais **tout l'univers repose sur des panneaux CSS** : cartes arrondies, filets dorés, dégradés, pictogrammes monolignes. Les seuls vrais visuels sont le logo et l'image du booster. Si on retire les textes, rien ne dit « jeu » : on voit une application de tâches soignée.

## Écrans où l'absence d'illustration détruit l'immersion

| Écran | Ce qu'on voit | Ce qui manque | Gravité |
| --- | --- | --- | --- |
| Accueil enfant | Panneau bleu nuit avec pièce CSS, liste de quêtes, carte booster, deux liens | Un lieu. Aucun décor, aucun personnage, aucun objet dans le monde | Bloquant |
| Journal de quêtes | Liste de cartes numérotées avec bandeau beige | Le tableau d'aventurier, le campement, la sensation de mission | Bloquant |
| Mon coffre | Deux tuiles colorées, un formulaire, une barre de progression, un historique brut | Le coffre lui-même (pictogramme 24 px), l'objectif désirable, la destination | Bloquant |
| Collection | 14 panneaux bleu nuit identiques « Univers 01…14 » avec un cercle décoratif | Une salle des collections, une identité par univers | Bloquant |
| Apprendre / simulateur | Trois cartes-liste | Un lieu d'observation, des graphiques mis en scène | Fort |
| Boutique | Étal de cartes texte | L'échoppe, des récompenses illustrées | Fort |
| Dashboard parent | Cockpit propre mais générique | Une trace de l'univers (en-tête illustré, états vides illustrés) | Moyen |
| Landing / connexion | Colonne de texte, aperçu de cartes, formulaire seul | Une scène d'entrée, premier moment de marque | Fort |
| États vides | Coche dans un médaillon | Un objet du monde (tableau vide, échoppe vide, album ouvert) | Moyen |

## Problèmes transverses

- **Pièce** : cercle CSS avec carré évidé ; lisible mais sans matière. Doit devenir un objet du monde.
- **Avatars** : images gitignorées, cassées hors machine du propriétaire ; aucune solution de repli illustrée.
- **Profondeur** : un seul plan partout ; ni avant-plan, ni atmosphère, ni lumière localisée.
- **Motion** : animations limitées au booster ; le monde est figé.
- **Argent** : le solde est lisible mais il vit dans un panneau générique ; entrées/sorties récentes, placements et patrimoine absents de l'accueil.

## Contraintes pour la suite

- Aucun outil de génération d'images n'est disponible dans l'environnement de développement actuel : les assets du monde sont produits comme **illustrations vectorielles originales** (SVG), générées par code quand c'est pertinent, vérifiées capture par capture.
- Les illustrations de cartes (Héros de la classe), le logo et le packaging booster existant sont des images peintes : la nouvelle famille vectorielle doit s'accorder avec eux par la lumière, la palette et les matières (voir `ART_BIBLE.md`).
