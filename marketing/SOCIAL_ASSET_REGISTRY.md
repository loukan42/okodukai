# Registre d’assets — parent-organic-v1

## Vidéos

| Fichier | Format | Durée | Notes |
| --- | --- | --- | --- |
| `apps/web/public/social/parent-organic-v1/video/okodukai-story-12s.mp4` | 1080×1920 | 12,5 s | Master Story |
| `…/okodukai-story-6s.mp4` | 1080×1920 | 6 s | Cut court |
| `…/okodukai-feed-12s.mp4` | 1080×1350 | 12,5 s | Feed 4:5 |
| `…/okodukai-square-12s.mp4` | 1080×1080 | 12,5 s | Carré |
| `…/okodukai-landscape-15s.mp4` | 1920×1080 | 15 s | Paysage |
| `*-silent.mp4` | idem | idem | Sans piste audio |

## Images

| Fichier | Usage |
| --- | --- |
| `poster/okodukai-story-poster.webp` | Aperçu dashboard / modale |
| `thumbnail/okodukai-story-thumb.webp` | Miniature |
| `og/okodukai-og.jpg` | Open Graph / Twitter |

## Sources produit

- Pièce : `apps/web/public/assets/coins/okodukai-coin-192.webp`
- Logo : `apps/web/public/assets/brand/logo-full-640.webp`
- Typo : Fraunces, Manrope (Google Fonts)
- Palette : `apps/web/src/styles/tokens.css` + `docs/ART_BIBLE.md`

## Audio

Généré localement par `marketing/social-ad/scripts/render.mjs` via FFmpeg `lavfi` (sine + mix + fades).

- Licence : original Okodukai, usage commercial autorisé dans le produit.
- Aucune piste tierce, aucun sample pack.

## Pipeline

```bash
npm run social:render
```

Composition de référence (storyboard HTML) : `marketing/social-ad/composition/`.
Rendu productif : `marketing/social-ad/scripts/render.mjs` — FFmpeg (lavfi, sous-titres ASS, overlays pièce/logo, AAC). Aucune dépendance npm obligatoire pour le rendu.
