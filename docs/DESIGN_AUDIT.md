# Audit de la refonte Okodukai

Audit réalisé sur les écrans enfant, parent et la référence d'ouverture de booster fournie par l'utilisateur : https://astral-summon-luminous.gigabitmillion.chatgpt.site/.

| Avant | Après | Pourquoi |
| --- | --- | --- |
| Solde et actions mélangés à des cartes génériques | Solde en tête, objectif puis journal de quêtes | L'enfant voit d'abord ce qu'il possède et ce qu'il peut faire. |
| Icônes emoji et vocabulaire visuel hétérogène | Pictogrammes SVG, ivoire, encre, or et vert issus du logo | Une identité cohérente sur tous les écrans. |
| Accès au booster absent quand l'inventaire était vide | Inventaire permanent dans « Ma collection » et lien visible dès l'accueil | L'enfant trouve le parcours et comprend comment gagner un pack. |
| Booster attribué seulement à certaines quêtes configurées | Un booster serveur pour chaque quête validée, stocké fermé | La règle est constante, même pour les anciennes quêtes. |
| Ouverture qui se terminait seule après un court effet | Cristal à frapper trois fois, éclat, carte vedette, grille finale | L'enfant agit dans le moment de révélation. |
| Carte en 2:3 placée dans une zone 3:4, avec marge noire apparente | Zone 2:3 et recadrage limité à la marge intégrée à l'image | Le cadre doré et la carte complète restent visibles. |
| Carte statique au pointeur | Inclinaison 3D et lumière localisée au survol, aussi dans l'album | Le pointeur donne une réponse directe sans gêner la lecture. |
| Logo compact dans l'en-tête | Logo fourni dans `images/logo.png` sur les vues enfant, parent et l'accueil | La marque demandée est présente en haut à gauche. |
| Tableau parent proche d'un panneau SaaS | Vue familiale, validations et actions regroupées par usage | Le parent trouve vite les décisions à prendre. |

## Contrôles effectués

- Parcours visuels dans le navigateur local : accueil enfant, quêtes, coffre, boutique, collection, album, inventaire, cristal, carte vedette, cinq résultats, tableau parent et accueil public ; contrôle sur petit écran et à 1300 × 576.
- Ouverture réelle d'un booster de démonstration : trois impacts, carte vedette, cinq cartes entières, retour à une collection actualisée.
- `npm test` : quatre tests réussis, dont le parcours API quête validée → booster inventorié → ouverture idempotente.
- TypeScript web/API et `npm run build` : réussis. Le dépôt ne définit pas de script lint ; `git diff --check` ne signale aucune erreur de patch.

Les cartes et les images locales de *Héros de la classe* restent la source des illustrations ; elles sont exclues de Git et doivent être fournies au déploiement séparément.
