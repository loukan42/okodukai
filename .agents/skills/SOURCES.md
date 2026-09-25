# Sources des skills tiers

Sources récupérées le 25 septembre 2026. Les dossiers de `.agents/skills/` sont copiés dans le repo pour permettre leur découverte automatique par les agents. Les licences complètes sont dans `_licenses/` ; `humanizer/LICENSE` est également conservée.

| Source | Révision Git | Dossiers installés | Licence |
| --- | --- | --- | --- |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `dcc40ff5133ef78276117db0cc34e7b83cc8aeba` | `ui-ux-pro-max` depuis `.claude/skills/ui-ux-pro-max` | MIT |
| [taste-skill](https://github.com/leonxlnx/taste-skill) | `c184364c58658b2f131b4ae8bd3d206cabb3deee` | `taste-skill` depuis `skills/taste-skill` | MIT |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | `02147b8d152ffaccc5357a48f1f87e4569792f70` | ensemble core officiel : `hyperframes`, `hyperframes-animation`, `hyperframes-audio`, `hyperframes-cli`, `hyperframes-core`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-registry`, `hyperframes-studio`, `media-use` | Apache-2.0 |
| [humanizer](https://github.com/blader/humanizer) | `9862685f575c65a8247f90369951df1b3416e3d6` | `humanizer` depuis la racine, sans le dépôt Git imbriqué ni les instructions de maintenance du dépôt source | MIT |

Adaptations locales : les commandes d'exemple de `ui-ux-pro-max/SKILL.md` visent le script installé dans ce repo plutôt que le chemin d'un plugin Claude ; le nom déclaré dans `taste-skill/SKILL.md` correspond au dossier du skill. Les espaces sur les lignes vides du script `ui-ux-pro-max/scripts/design_system.py` ont été normalisés pour satisfaire `git diff --check`. Les autres fichiers de skill sont repris sans changement intentionnel.
