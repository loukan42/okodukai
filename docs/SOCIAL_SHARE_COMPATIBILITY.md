# Compatibilité du partage social

Vérifié conceptuellement le 27 septembre 2026. Matrice matérielle iOS réelle non exécutée sur la machine Windows de développement.

| Environnement | Texte / URL | Fichier vidéo | Fallback |
| --- | --- | --- | --- |
| Chrome Android | Oui (Web Share) | Souvent oui | Télécharger + copier |
| PWA Android | Oui | Souvent oui | Idem |
| Safari iOS | Oui | Variable selon version | Télécharger + copier + instruction Story |
| PWA iOS | Oui | Variable | Idem |
| Chrome / Edge desktop | Lien / intentions | Rare | Télécharger |
| Firefox desktop | Lien | Rare | Télécharger |
| Safari desktop | Lien | Rare | Télécharger |

## Plateformes

| Plateforme | Parcours MVP |
| --- | --- |
| Instagram | Fichier natif si possible, sinon téléchargement + légende |
| TikTok | Idem, pas d’OAuth |
| WhatsApp / Telegram / SMS / e-mail | Intentions URL officielles + texte |
| X / LinkedIn / Facebook | Intentions de partage de lien documentées |
| Messenger | Copie de légende (pas d’app_id Facebook dans le MVP) |

## Documentation de référence

- [Web Share API](https://developer.mozilla.org/docs/Web/API/Navigator/share)
- [canShare](https://developer.mozilla.org/docs/Web/API/Navigator/canShare)

Ne jamais afficher « Publié sur … » sans confirmation API officielle.
