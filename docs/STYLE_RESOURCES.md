# Ressources de style du dépôt

Les instructions installées sont sous `.agents/skills/` et indexées dans `skills-lock.json`. Elles sont lisibles par Codex dans ce dépôt et par une session ChatGPT dotée de l'accès aux fichiers ; un ChatGPT sans ce dépôt ne les charge pas automatiquement.

| Ressource | Fonction et usage ici | Dépendances / limites |
| --- | --- | --- |
| `.agents/skills/frontend-design/SKILL.md` | Direction visuelle et composition de la refonte | Aucune dépendance d'exécution. |
| `.agents/skills/emil-design-eng/SKILL.md` | Rythme des animations, réponse au pointeur, mouvement réduit | Aucune dépendance d'exécution ; cette refonte utilise CSS et React. |
| `.agents/skills/accessibility/SKILL.md` | Référence WCAG pour focus, clavier, contrastes et états | Audit manuel et navigateur nécessaires. |
| `.agents/skills/beautiful-shadows/SKILL.md` | Hiérarchie des ombres neutres | Exemples Tailwind ; les principes ont été adaptés aux variables CSS du projet. |
| `.agents/skills/better-interface/SKILL.md` | Revue combinée de l'interface | Ses six compétences `better-*` requises ne sont pas présentes : workflow complet indisponible. |
| `.agents/skills/design-review/SKILL.md` | Critique structurée d'écrans | Workflow externe avec télémétrie ; non exécuté pour cette refonte. |
| `.agents/skills/shadcn/SKILL.md` | Gestion de composants shadcn/ui | Sans objet : ce projet n'a ni `components.json` ni Tailwind. |

Autres sources : `CLAUDE.md` pour les invariants produit et serveur ; `docs/ART_DIRECTION.md` pour les choix visuels ; `docs/DESIGN_SYSTEM.md` pour les tokens et composants ; `apps/web/src/styles/tokens.css` et `apps/web/src/styles/rpg.css` pour l'implémentation. Le nouveau logo source est `images/logo.png`, copié vers `apps/web/public/logo-full.png` pour Vite. Les illustrations de cartes sont sous `apps/web/public/cards/`, locales et ignorées par Git.
