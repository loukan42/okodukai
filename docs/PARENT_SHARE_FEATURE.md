# Fonctionnalité parent — partage organique

## UX

- Carte dismissible sur `/parent` après la première quête validée du foyer (`hasValidatedQuest`).
- Masquage 21 jours via `localStorage` (`okodukai:share-card`).
- Accès permanent : `/parent/compte` → « Faire connaître Okodukai ».
- Modale : preview, formats, partage natif, téléchargement, copie lien/texte, intentions plateforme.
- Absent de l’espace enfant.

## Architecture

| Couche | Emplacement |
| --- | --- |
| Manifeste / formats | `apps/web/src/share/campaign.ts` |
| Captions | `apps/web/src/share/captions.ts` |
| UTM | `apps/web/src/share/utm.ts` |
| Capacités / partage | `apps/web/src/share/capabilities.ts`, `shareService.ts` |
| Analytics client | `apps/web/src/share/analytics.ts` → `POST /share/events` |
| UI | `components/share/ParentShareCard.tsx`, `ParentShareModal.tsx` |
| Assets | `apps/web/public/social/parent-organic-v1/` |

## Capacités

1. `navigator.share` + fichiers si `canShare({ files })`.
2. Sinon : téléchargement + copie texte + copie lien.
3. Instagram / TikTok : téléchargement + légende + instruction courte (pas de « publié »).

## Analytics

Table `ShareEvent` : `name`, `campaignId`, `format`, `platform`, `createdAt`. Aucun `userId` / `householdId`. Totaux dans `/admin/analytics` → section partage.

## Vie privée

Vidéo générique (Lina, données fictives). Notice dans la modale. Aucune récompense liée au partage.
