# Poses des quatorze personnages — source de génération

Les planches `apps/web/art/source/child/pose-sheets/adventurer-XX-poses.png` ont été produites avec l'outil intégré `image_gen`. Pour chaque planche, l'image `adventurer-XX-idle.png` du même dossier était la référence d'identité, de vêtements et de rendu. Deux premiers essais en grille 3 × 2 ont été écartés ; les quatorze sources retenues sont en grille 2 × 3, 1024 × 1536 px.

Consigne finale employée, reformulée à la marge selon le personnage :

> Use case: identity-preserve. Make a transparent 2-column x 3-row character sheet with exactly six equal cells. A single complete full-body figure must be centered in each cell, with transparent margins and no overlap. Reading order: idle, happy waving, proud hand-on-hip, thinking with hand at chin, victory with both fists raised, discovery pointing ahead. Preserve the reference child's exact face, hair, skin, outfit, shoulder satchel, trousers, boots, proportions and warm storybook 3D rendering in every pose. Same camera and scale. No scenery, background, text, cell borders, other children, cropped limbs or figures crossing into adjacent cells.

`node apps/web/scripts/optimize-child-art.mjs` extrait les cinq nouvelles poses de chaque planche, isole la silhouette principale et écrit les WebP 256/512. La pose `idle` garde sa source et ses WebP d'origine. `node apps/web/scripts/review-character-poses.mjs` régénère les deux planches de contrôle dans `docs/screenshots/`.
