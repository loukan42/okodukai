---
workflow: product-launch-video
flow: automation
storyboard: no
length: 30s
aspect: 16:9
language: fr
destination: broadcast TV (France) + web
audience: parents d'enfants de 8-12 ans
angle: elevator pitch
message: Okodukai, le premier compte de votre enfant. Sans argent réel.
---

Demande (28/09/2026) : motion design dynamique de 30 s, fonctionnalités clefs en mode elevator pitch, qualité
professionnelle diffusable à la TV. Références de style : 1600.agency (vidéos taap.it et GojiBerry) — une idée
par seconde, phrases mot à mot avec le mot-clé en couleur, flash plein cadre couleur marque + logo, UI
reconstruite qui s'assemble bloc par bloc, curseur qui clique, profondeur et flou de bougé, fin « tout converge
dans une pilule CTA que le curseur clique ». Transposé à l'identité Okodukai (nuit / parchemin / or, vallée 3D,
cartes), pas au look SaaS blanc.

Décisions :
- v2 distincte de `videos/okodukai-pitch` (v1 du 26/09, conservée). Positionnement aligné sur la landing
  actuelle : « Le premier compte de votre enfant ».
- Nouveau script (`SCRIPT.md`), voix ElevenLabs Marishnou enregistrée par l'utilisateur ; piste témoin Windows
  (Hortense) en attendant, remplacée par `assets/vo/vo-N.*` dès réception.
- CTA : okodukai.fr (domaine en production depuis le 27/09).
- Specs diffusion : 1920×1080, 25 i/s progressif, rendu supersamplé 4K ; audio 48 kHz stéréo,
  −23 LUFS intégré, true peak ≤ −3 dBTP (PAD France). Zones de sécurité titre 90 %.
- Musique synthétisée en attendant une piste sous licence (remplaçable : `assets/music.wav`).
- Pièces virtuelles uniquement, jamais d'équivalence en euros, montants de démonstration (foyer Emma).
