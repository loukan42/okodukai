# Instructions des agents — Okodukai

Lire aussi `CLAUDE.md` pour les règles produit et les invariants techniques. Les demandes de l'utilisateur et les instructions de plus haut niveau priment sur les exemples des skills. Conserver le design system, la stack et les composants déjà présents ; un skill ne justifie pas à lui seul l'ajout d'une dépendance ou une refonte hors sujet.

## Utilisation autonome des skills

Les skills du repo sont dans `.agents/skills/<nom>/SKILL.md`. À chaque tâche, repérer les sujets concernés, ouvrir les skills correspondants et appliquer leurs consignes utiles sans attendre qu'on les nomme. Lire les références annexes uniquement si elles servent au travail en cours. Choisir le plus petit ensemble pertinent ; ne pas charger tous les skills pour chaque tâche. Pour les changements visuels, vérifier le résultat dans l'interface et tenir compte du mobile, du clavier et de la réduction des animations. Pour une tâche de logique serveur sans interface, éviter les skills de design.

| Skill installé | À utiliser automatiquement quand… |
| --- | --- |
| `accessibility` | on améliore ou audite l'accès clavier, les lecteurs d'écran, les contrastes ou WCAG. |
| `beautiful-shadows` | on ajuste l'élévation et les ombres des cartes, panneaux ou contrôles. |
| `better-interface` | on demande une revue générale de qualité d'interface. |
| `design-review` | on critique une capture, une page ou un composant avant correction ou livraison. |
| `emil-design-eng` | on polit les composants, les états interactifs et les animations d'interface. |
| `frontend-design` | on construit ou remanie une interface web avec une direction visuelle intentionnelle. |
| `shadcn` | on intervient sur des composants shadcn ou un projet muni de `components.json`. |
| `ui-ux-pro-max` | on conçoit, développe, corrige ou vérifie une interface, son design system, sa navigation ou son responsive. Utiliser son outil de recherche local pour les décisions concernées. |
| `taste-skill` | on crée ou remanie une landing page, un portfolio ou une page de présentation de marque. |
| `humanizer` | on réécrit ou relit du texte destiné aux utilisateurs, la documentation ou une communication pour retirer les tournures artificielles sans changer les faits. |
| `hyperframes` | on crée, modifie, inspecte ou rend une vidéo, un motion graphic ou une composition HyperFrames ; c'est le point d'entrée des skills vidéo. |
| `hyperframes-animation` | une composition HyperFrames requiert des mouvements, transitions ou adaptateurs d'animation. |
| `hyperframes-audio` | une composition HyperFrames requiert mixage, voix, effets ou automatisation audio. |
| `hyperframes-cli` | on initialise, vérifie, prévisualise, rend ou diagnostique un projet HyperFrames. |
| `hyperframes-core` | on écrit ou modifie la structure et la chronologie HTML d'une composition HyperFrames. |
| `hyperframes-creative` | on définit le concept, le script, le rythme ou la direction visuelle d'une vidéo HyperFrames. |
| `hyperframes-keyframes` | on écrit des animations à images clés compatibles avec la recherche temporelle HyperFrames. |
| `hyperframes-registry` | on cherche des blocs, composants ou traitements réutilisables HyperFrames. |
| `hyperframes-studio` | on organise ou utilise le projet dans HyperFrames Studio. |
| `media-use` | une production HyperFrames a besoin d'images, vidéo, icônes, voix, musique, sous-titres ou traitements média. |

Pour une animation de l'application (par exemple l'ouverture d'un booster), utiliser les skills d'interface. Réserver HyperFrames à un livrable vidéo ou à un projet HyperFrames. Dans une tâche vidéo, commencer par `hyperframes`, puis charger seulement les domaines qu'il indique. Les workflows vidéo spécialisés peuvent être installés à la demande si la tâche le nécessite.

Les nouvelles sources, versions et licences des skills tiers sont consignées dans `.agents/skills/SOURCES.md`. Les règles ci-dessus s'appliquent automatiquement aux prochaines tâches ouvertes sur ce repo.
