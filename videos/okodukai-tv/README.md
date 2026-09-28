# Okodukai — spot TV 30 s (v2)

Motion design 1920 × 1080, 25 i/s, français. Remplace la v1 (`../okodukai-pitch`, conservée).
Positionnement : « Le premier compte de votre enfant. Sans argent réel. » Brief : `BRIEF.md`,
voix off : `SCRIPT.md`, découpage : `STORYBOARD.md`.

## Livrables (`renders/`)

| Fichier | Usage |
|---|---|
| `okodukai-tv-30s-PAD-1080p25-ProRes422HQ.mov` | Master diffusion : ProRes 422 HQ, PCM 24 bits 48 kHz, −23 LUFS, TP ≤ −3 dBTP, TC 10:00:00:00 |
| `okodukai-tv-30s-PAD-1080p25.mp4` | Même master en H.264 40 Mb/s (régies qui acceptent le MP4) |
| `okodukai-tv-30s-web-1080p.mp4` | Web / réseaux, −14 LUFS |
| `okodukai-tv-4k.mp4` | Rendu source 3840 × 2160 (supersampling des masters 1080p) |

Les masters vidéo et les WAV mixés restent locaux (fichiers générés, non versionnés). Les sources, scripts et
planches contact sont versionnés pour permettre la reprise.

## Contrôle du rendu (28/09/2026)

- [Planche contact du MP4 PAD](renders/contact-sheet-1s.jpg) : une image par seconde, extraite du master H.264
  final. Les sept scènes, le compteur final « 105 cartes » et la signature ont été revus ; aucune image noire
  détectée sur les 750 images (`blackdetect`, seuil 0,08 s).
- Les trois masters 1080p contiennent chacun 750 images, à 25 i/s progressives et 30,000 s, en BT.709.
  ProRes : 4:2:2 10 bits et PCM 24 bits/48 kHz ; MP4 : H.264 et AAC stéréo 48 kHz.
- Mesure indépendante `ebur128=peak=true` : masters TV −23,0 LUFS et pic vrai −11,2 dBTP ; version web
  −14,0 LUFS et pic vrai −2,2 dBTP.
- `npm run check` n'a pas pu être relancé pendant cette reprise : la version HyperFrames 0.8.81 n'est pas en
  cache npm et la session est hors ligne. La revue ci-dessus porte sur les fichiers déjà rendus.

**Ces rendus utilisent encore la voix témoin Windows Hortense et la musique synthétisée** (voir
`audio_meta.json`). Ils servent à valider l'image et le mixage ; avant diffusion, remplacer la voix par les sept
prises Marishnou et décider de la musique définitive, puis régénérer et contrôler les masters.

## Reconstruire

```bash
node tools/mix.mjs      # musique + design sonore + voix → assets/soundtrack(-web).wav, masters loudness
PATH="../okodukai-pitch/node_modules/ffmpeg-static:../okodukai-pitch/node_modules/ffprobe-static/bin/win32/x64:$PATH" \
  npx hyperframes@0.8.81 render --fps 25 --quality delivery --resolution 4k --output renders/okodukai-tv-4k.mp4
node tools/master.mjs   # ProRes + MP4 TV + MP4 web depuis le rendu 4K
```

`npx hyperframes@0.8.81 preview --background` ouvre le Studio. `npx hyperframes@0.8.81 check` : les seules
alertes restantes sont voulues (compteurs à défilement masqués par leur fenêtre, mot fantôme « Placements »
décoratif à faible contraste).

## Voix off

`assets/vo-guide/` est une **piste témoin** (voix Windows Hortense) qui sert au calage. Pour la version finale :
générer les 7 répliques de `SCRIPT.md` sur ElevenLabs (voix Marishnou), les déposer en
`assets/vo/vo-1.wav` … `vo-7.wav` (ou .mp3), puis relancer `mix.mjs`, le rendu et `master.mjs`. Le mixeur
détecte les fichiers, retire les silences et place chaque réplique sur sa fenêtre.

## Musique

La musique est une composition originale synthétisée (`tools/mix.mjs`, 125 BPM, ré majeur, aucun échantillon
externe). Pour une diffusion TV, une piste sous licence est recommandée : la déposer en `assets/music.wav`
(30 s, calée au temps 0, idéalement 125 BPM : les coupes tombent sur les temps 2,88 · 7,20 · 12,00 · 15,36 ·
18,72 · 23,04 · 26,88) ; le design sonore et la voix restent générés par-dessus.

## Avant diffusion

- Visa ARPP (publicité TV) : à demander par l'annonceur ou l'agence média.
- Les montants (10 pièces, 70 → 90, 100 → 138) sont ceux du foyer de démonstration ; pièces virtuelles,
  aucune équivalence en euros, placements présentés comme simulation.
- Vérifier les exigences techniques de la régie (certaines demandent XDCAM HD422 MXF ou un slate/décompte ;
  le ProRes HQ est le format pivot usuel).
