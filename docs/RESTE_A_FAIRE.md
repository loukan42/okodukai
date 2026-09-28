# Reste à faire : passation (26 septembre 2026)

## Point d'étape du 27 septembre 2026 : domaine okodukai.fr configuré

- Le domaine acheté sur OVH est relié au projet Vercel `okodukai` : `okodukai.fr` et `www.okodukai.fr`
  affichent tous deux « Valid Configuration » côté Vercel et servent directement l'environnement Production
  (plus de redirection croisée entre les deux). Certificat SSL généré.
- Trois erreurs de configuration ont été corrigées côté OVH/Vercel : un enregistrement AAAA résiduel sur
  `okodukai.fr` qui bloquait la validation Vercel, `okodukai.fr` configuré par erreur en redirection 308 vers
  `www.okodukai.fr` (inversé : c'est `www` qui doit être secondaire), et une faute de frappe dans la cible du
  CNAME de `www.okodukai.fr` (`vercel-dns-07.com` au lieu de `vercel-dns-017.com`).
- Vérifié par `curl` (résolution DNS système), par Cloudflare/Google DNS publics, et par le propriétaire en
  navigation privée : les deux domaines renvoient le site réel. Un navigateur déjà ouvert avant la correction
  peut garder une ancienne résolution DNS en cache ; un redémarrage du navigateur suffit à la purger.
- Finition du 28 septembre : les balises canonical, Open Graph et Twitter utilisent `https://okodukai.fr`.
  Le sujet VAPID par défaut utilise aussi ce domaine. La page d'accueil, l'image de partage, le favicon et
  `/api/health` répondent sur le domaine public (HTTP 200, base et secret JWT opérationnels).
- Contrôle après déploiement : les nouvelles balises sont bien servies sur `okodukai.fr` ; `www`,
  `/inscription` et la route de l'invitation enfant répondent. L'image sociale, les icônes iOS/PWA et le
  favicon ont le bon type de contenu. Sans session, `/api/auth/me`, `/api/admin/users` et `/api/child/me`
  répondent 401 ; un lien enfant invalide répond 404. Un parcours connecté de production n'a pas été
  exécuté sans compte de test dédié. L'écran d'inscription s'affiche en navigateur aux largeurs 375, 768
  et 1280 px sans débordement. La connexion Google est indisponible dans la configuration de production
  observée ; l'entrée par e-mail et mot de passe reste proposée. Le texte d'introduction ne promet plus
  Google tant que son bouton ne peut pas apparaître.

## Bilan du 27 septembre 2026 : refonte enfant livrée

- Finition du 28 septembre : les quatorze autres personnages disposent désormais, comme Emma et Lucas, des six poses de jeu. Les 70 nouvelles vues ont été contrôlées côte à côte ; la place et le profil ont été revus à 375, 768 et 1280 px. Lors de la création d'un objectif libre, l'enfant choisit parmi neuf illustrations peintes. Les anciens objectifs sans choix gardent leur poteau ; aucune pièce n'est créée par ce choix.
- La barre « Démo » permet de choisir un niveau de 1 à 30 pour l'enfant connecté, ou de revenir au niveau réel. Cet aperçu reste dans l'onglet : la vallée, l'arbre et le profil suivent le niveau choisi ; l'XP, les boosters et les cadres enregistrés ne changent pas. Le calcul de l'aperçu vient de l'API de développement. Le sélecteur n'est pas livré dans le build de production.
- `node apps/web/scripts/capture-demo-levels.mjs` contrôle les seuils 1/5/10/20/30, le retour au niveau réel et les vues à 375/768/1280 px. Captures : `docs/screenshots/demo-level-*`. Le script vérifie que l'XP en base ne change pas.
- Le visuel `images/metadescription.png` fourni pour les réseaux sociaux est publié en JPEG optimisé avec les balises Open Graph et Twitter. Le coffre `images/favicon.png` remplace le favicon, l'icône iOS et les icônes PWA. Les URL des balises sociales utilisent désormais `https://okodukai.fr`.

- Ajout après la revue finale : trois cadres de portrait cosmétiques aux niveaux 5, 10 et 20. Le choix est conservé sur le profil enfant et vérifié côté API. Captures à 375, 768 et 1280 px : `child-portrait-frames-*`. Les 16 portraits et l'arbre d'XP restent en place.

- La vallée navigable, ses quatre paliers peints, les 16 personnages en pied, l'arbre qui grandit avec l'XP, les huit catégories de quêtes illustrées, les lieux intérieurs, le coffre, la boutique, la collection et la bibliothèque sont intégrés. Le parent peut prêter son téléphone avec retour protégé par PIN ou envoyer une invitation unique à l'enfant sur son propre appareil.
- Captures contrôlées à 375, 768 et 1280 px : `child-experience-*`, `child-character-*` et les 15 `child-valley-tier-*` dans `docs/screenshots/`. Les cinq paliers gardent les lieux cliquables, le HUD visible et aucun débordement. Les objets du journal sont tous chargés et lisibles aux trois largeurs.
- Vérifications finales : `npm run build` réussi (typecheck shared, API et web) ; `npm test --workspace apps/api` réussi (82 tests, dont l'aperçu de niveau). Le build contient la carte sociale, les favicons, l'icône iOS et les icônes PWA. Le dépôt ne définit ni script `lint` ni configuration ESLint/Biome ; aucun lint dédié n'a été lancé. Les variantes WebP 1920/1080 du fond et des calques ont leur largeur annoncée et le même cadrage.
- Limites connues : les titres de quêtes et récompenses écrits par une famille restent dans leur langue de saisie. Les neuf illustrations d'objectif couvrent un catalogue fermé ; un titre libre peut ne correspondre parfaitement à aucune image. Ces choix de contenu sont sans incidence sur le PIN ni sur les valeurs serveur. Les autres chantiers généraux du produit ci-dessous restent indépendants de cette refonte.

## Point d'étape du 27 septembre 2026 : les huit catégories de quêtes sont illustrées

- Créativité, école, jardin et animaux disposent maintenant d'objets propres : boîte de peinture, cartable, arrosoir et matériel de soin. Les huit catégories du journal ont donc chacune un objet distinct. Les sources transparentes, WebP 180/360/540 et correspondances dans `Quests.tsx` sont versionnés.
- Les captures `docs/screenshots/child-experience-quests-{375,768,1280}.png` montrent les huit catégories dans une fixture visuelle sans écriture en base. Le script fait défiler et décode chaque illustration différée avant de vérifier qu'elle charge. Aucun débordement horizontal ; build web vert. La fixture montre des gains fictifs uniquement pour la revue graphique.
- La revue finale est consignée dans le bilan ci-dessus et `CHILD_DESIGN_AUDIT.md`.

## Point d'étape du 27 septembre 2026 : les quatre paliers de la vallée sont livrés

- Les paliers 5, 10, 20 et 30 ont chacun un calque peint complet pour le cadrage paysage et portrait. Les huit scènes successives ont été produites depuis `hub-wide.png` ou `hub-tall.png` ; un essai portrait au mauvais cadrage a été écarté. Le hameau existant reste le palier 1. Les ajouts cumulés sont lanternes et fanion, échoppe et potager, maisonnettes et pont, puis nouvelle lisière. `Home.tsx` active les quatre calques, choisis par le niveau renvoyé par `/child/me`.
- Les sources intégrales et les calques transparents sont dans `apps/web/art/source/child/`, les WebP optimisés dans `apps/web/public/assets/backgrounds/`. L'extraction a modifié 1,8 à 29,3 % de chaque scène, sous le seuil d'un tiers du brief. Les aperçus de calque posé sur le fond ont été inspectés ; les lieux initiaux, le personnage et les chemins restent lisibles.
- `node apps/web/scripts/capture-child-valley-tiers.mjs` a contrôlé les cinq paliers à 375, 768 et 1280 px : calque aligné, non cliquable, cibles de lieu utilisables, HUD visible et aucun débordement. Les 15 captures sont dans `docs/screenshots/child-valley-tier-*.png` et ont été revues visuellement. Build web vert. `docs/BRIEF_CODEX_VALLEE_PALIERS.md` est exécuté ; le garder comme procédure de régénération.
- Les autres catégories de quête et la revue finale sont consignées au début du document.

## Point d'étape du 27 septembre 2026 : vallée par paliers, architecture prête, illustrations à produire

- Le propriétaire a relancé la vallée qui grandit avec le niveau. L'accueil enfant pose désormais un calque transparent par palier (5, 10, 20, 30) sur le fond `child-hub-*`, sous les lieux et le personnage, non cliquable et masqué aux lecteurs d'écran. Le palier vient du niveau renvoyé par `/child/me` ; aucune logique côté API. Un calque complet par palier, sans empilement.
- À cette étape, aucun calque n'était encore illustré. Les quatre paliers ont depuis été livrés et activés ; voir le point d'étape ci-dessus.
- Outils livrés : `optimize-child-art.mjs` produit `backgrounds/hub-tier-<palier>-{wide,tall}-*.webp` quand la source existe et refuse un calque opaque ou mal cadré ; `extract-hub-tier-layer.mjs` tire le calque d'une scène complète éditée par le générateur ; `capture-child-valley-tiers.mjs` capture les cinq paliers à 375/768/1280 px avec un niveau remplacé dans le navigateur seulement. Zones libres, contenu de chaque palier et consignes de génération : `docs/BRIEF_CODEX_VALLEE_PALIERS.md`.
- Vérifié avec un calque de test jetable (contours du fond en rouge, non versionné) : alignement exact aux trois largeurs, lieux et personnage cliquables, HUD intact, pas de débordement. Extraction testée sur une édition simulée (teinte décalée, grain, JPEG, autre résolution). Build web vert.
- Décision du propriétaire : le hameau du fond actuel reste le palier 1, sans campement redessiné.
- `docs/BRIEF_CODEX_VALLEE_PALIERS.md` a été exécuté dans Codex après le retour du quota ; il reste la référence pour régénérer les calques.

## Point d'étape du 27 septembre 2026 : objets des quêtes courantes

- Le journal montre une illustration selon la catégorie de chaque quête renvoyée par l'API. Maison, autonomie, apprentissage et entraide ont quatre nouveaux objets cohérents ; le type habitude ou grande quête reste identifiable par le bord de la fiche. Les numéros de fiche arbitraires ont été retirés. Les chaînes de catégorie sont en français et en anglais.
- Captures `docs/screenshots/child-experience-quests-{375,768,1280}.png`, avec fixture visuelle en lecture seule : le foyer local n'avait plus de quêtes actives pour Emma. Images chargées, pas de débordement horizontal ; build web vert. Les récompenses affichées dans ces captures sont fictives et ne servent qu'à la revue graphique.
- Les quatre autres catégories disposent désormais de leurs propres objets (voir le point d'étape ci-dessus). Le serveur donne un booster toutes les trois quêtes validées : une fiche individuelle ne promet donc pas de booster.

## Point d'étape du 27 septembre 2026 : liste des comptes parents dans l'administration

- La page Administration affiche les e-mails et dates d'inscription des comptes parents, 25 par page. L'API `/admin/users` sélectionne uniquement ces champs, relit le droit admin en base à chaque requête et interdit la mise en cache, y compris pour les accès refusés. Les enfants et l'activité individuelle ne figurent pas dans cette liste.
- L'écran de connexion informe les parents que l'administrateur peut consulter leur e-mail pour gérer les comptes. Tableau vérifié dans Chrome avec un admin local à 375 et 1280 px, sans débordement horizontal. Builds API/web et test d'accès admin verts.
- À compléter pour la conformité RGPD : notice de confidentialité publique, base juridique des finalités, durées de conservation et modalités d'exercice des droits. Ces choix demandent les informations du responsable de traitement ; voir `docs/ADMIN_ANALYTICS.md`.
- Le texte préparatoire et l'inventaire des données vérifiées sont dans `docs/CONFIDENTIALITE_A_VALIDER.md`.
  La publication attend l'identité et les coordonnées du responsable, les durées retenues, les prestataires
  effectifs et une procédure d'exercice des droits. Ne pas publier les champs de ce brouillon tels quels.
- L'inscription demande maintenant de ne pas saisir de données sensibles (santé, convictions, vie intime)
  dans les profils, quêtes ou objectifs. Aucun champ ne les demande ; les champs libres peuvent toutefois
  en recevoir. Cette consigne ne remplace pas la notice RGPD attendue.

## Point d'étape du 27 septembre 2026 : roster complet de personnages en pied

- Les 14 portraits autres qu'Emma et Lucas ont chacun une illustration en pied fidèle au visage, à la coiffure et aux vêtements du portrait, dans la lumière de la vallée. Leurs PNG sources et les WebP 256/512/768 sont versionnés ; les régénérer avec `node apps/web/scripts/optimize-child-art.mjs`. Une première composition horizontale du portrait 16 a été rejetée avant intégration.
- Le personnage sélectionné apparaît sur la place, le profil, les leçons et lors de la récompense. Emma et Lucas gardent leurs six poses ; les 14 autres personnages utilisent la pose repos sur ces écrans.
- Contrôlés dans le navigateur à 375, 768 et 1280 px pour les portraits 01, 04, 07, 10, 11, 12 et 16 sur la place et le profil, avec `apps/web/scripts/capture-child-characters.mjs`. Captures dans `docs/screenshots/child-character-*`. Les images verticales qui débordaient du profil sur tablette sont recadrées par le conteneur de figure ; aucun débordement horizontal.
- Le roster en pied est complet. Les autres limites de la refonte sont décrites dans `CHILD_ASSET_PLAN.md` et `CHILD_UI_REDESIGN.md` ; les variantes de décor par palier sont livrées au point d'étape ci-dessus.

## Point d'étape du 27 septembre 2026 : administration et accès visible

- Le compte administrateur local existe ; l'attribution du droit au compte de production existant a été observée dans les journaux de build Vercel. Le script retire ce droit aux autres comptes lors de l'attribution. Le build API n'attribue plus de droit admin automatiquement lors des déploiements suivants.
- Le lien **Administration** est le premier onglet de la navigation parent pour ce compte, libellé **Admin** sur mobile. La session est relue quand l'application redevient visible. Vérification dans Chrome avec le compte local à 375 et 1280 px : lien visible, actif et accessible au clavier.
- Les scripts d'administration et le gestionnaire d'erreurs API affichent des messages génériques sans e-mail personnel, commande à exécuter ni détail de base de données. Les réponses de session et de statistiques interdisent le cache. `docs/ADMIN_ANALYTICS.md` décrit la configuration actuelle sans adresse personnelle.
- Builds API et web verts ; 81 tests API verts. Google et les notifications push restent à reprendre séparément selon la décision du propriétaire.

## Point d'étape du 27 septembre 2026 (soir) : téléphones de démo lisibles sur mobile

- **Écrans de téléphone illisibles dans la landing** (dernier point de l'audit) : plutôt qu'un recadrage
  par chapitre (coûteux à vérifier à l'aveugle), le mockup lui-même est agrandi sur téléphone — hero
  (`.lp-hero-product`, 38vw/170px max → 44vw/195px max) et « Son premier compte » (`.lp-story-stage`
  54svh → 64svh, `.lp-story-phone` 92% → 97% de hauteur). Contrôlé à 375 px sur plusieurs chapitres
  (quêtes, coffre, observatoire) : texte net, pas de débordement. Build web vert.
- Ajout d'une règle dans `CLAUDE.md` : toute session doit surveiller son quota et ne jamais laisser le
  dépôt dans un état à moitié fini (tests/build non vérifiés, travail non poussé, passation pas à jour).
- `.claude/launch.json` ajouté (api : `npm run dev:api` port 4000, web : `npm run dev:web` port 5173)
  pour prévisualiser directement avec le navigateur intégré.

## Point d'étape du 27 septembre 2026 (fin d'après-midi) : dernières décisions de l'audit

Décisions du propriétaire (QCM) : moyenne du foyer pour le repère de prix, clore et archiver les
anciennes parties en unités école, simplifier les textes du coffre maintenant, vallée par paliers
reportée. Historique Git (e-mail en clair, commits antérieurs à la sécurisation) : ne rien faire.

- **Repère de prix boutique** : `GET /household/earnings-reference` (moyenne par semaine des quêtes et
  de l'argent de poche du foyer sur les 4 dernières semaines, tous enfants confondus, sans les cadeaux) ;
  affiché sous le prix dans le formulaire de récompense (`RewardsManage.tsx`), mis à jour en direct.
- **Clôture des anciennes parties en unités école** : `closeLegacySchoolRun` (`lib/invest.ts`) clôt, au
  premier accès à `GET /child/invest`, toute partie MIROIR encore en cours jamais financée par le
  portefeuille (`fundedAmount: null`) ; elle reste consultable dans « Mes parties ». Le verger
  (ASSURANCE_VIE) n'est jamais concerné, il garde ses unités école par choix de produit. Un bandeau
  explique le changement à l'enfant une seule fois (`legacyClosed` dans la réponse, jamais stocké côté
  client : redevient faux dès qu'il n'y a plus rien à clore).
- **Textes du coffre pour 8-9 ans** : le graphique de projection et la phrase de règle de « Ma prime de
  lundi » (`VaultPrimeCard.tsx`) passent derrière un « En savoir plus » replié ; le titre et la phrase
  courte restent visibles. Vérifié dans le navigateur (foyer de démo, Emma).
- **Vallée par paliers** : reportée (décision du propriétaire), `data-world-tier` reste posé sans
  variante visuelle.
- Tests API : 81/81 verts (2 nouveaux : clôture des vieilles parties, repère de prix). Build web vert.
  Vérifié en navigateur sur le foyer de démo (prix qui se recalcule, bandeau replié du coffre).

## Point d'étape du 27 septembre 2026 (après-midi) : rythme des boosters, XP par difficulté, sécurité

- **Rythme des boosters tranché** : un booster de quête toutes les trois quêtes validées (au lieu d'une à
  chaque fois), plus toujours un par niveau. Compteur : nombre de `QuestCompletion` `VALIDEE` du foyer
  pour l'enfant, pas de nouveau champ. Tous les textes qui promettaient « 1 booster » par quête (fiche de
  quête enfant, formulaire et tableau de bord parent, univers, landing) ont été corrigés ou retirés.
- **XP par difficulté tranché** : le parent choisit Facile/Moyenne/Importante/Exceptionnelle
  (+10/15/25/40 XP), le serveur calcule l'XP et ignore toute valeur envoyée par le client
  (`XP_BY_DIFFICULTY` dans `routes/quests.ts`) ; l'ancien champ XP libre a disparu du formulaire.
- **Sécurité** : les scripts `admin:grant`/`admin:bootstrap-local` et `apps/api/vercel.json` ne contiennent
  plus l'e-mail du propriétaire ni de commande en clair ; ils lisent `PLATFORM_ADMIN_EMAIL` (variable
  ajoutée sur Vercel, projet `okodukai-api`, environnement Production (posée en autonomie via Claude in
  Chrome). L'e-mail reste visible dans l'historique Git antérieur à ce point d'étape (réécriture
  d'historique non faite, à décider). Redéploiement Vercel pas déclenché : se fera au prochain push, ou
  à la main si besoin plus tôt.
- **Mobile** : nav parent qui passait sur 2-3 rangées sur téléphone (grille à colonnes fixes) repassée en
  une seule ligne défilante ; libellés à 10-11 px remontés à 12 (HUD vallée, onglets « Mon trésor »,
  place, quêtes) ; boutons de la barre parent enfant à 44 px.
- Tests API : 79/79 verts ; build web vert.

**Restent de l'audit** (non traités cette session, plus incertains ou plus coûteux à faire à l'aveugle) :
repère de prix dans la boutique (la récompense n'est pas liée à un enfant précis, à trancher) ; alléger
les textes du coffre/observatoire pour les 8-9 ans (récriture éditoriale + vérifier la hauteur d'écran) ;
clore les anciennes parties en « unités école » (touche aux données) ; vallée qui grandit aux paliers
(demande de nouveaux assets 3D) ; écrans de téléphone illisibles dans la démo de la landing (le mockup
réduit toute la maquette 390 px, il faudrait recadrer sur la zone utile — change selon le chapitre,
à vérifier en navigateur).

## Point d'étape du 27 septembre 2026 (matin) : anglais, XP, mobile, audit

- **Site et API en anglais**. La langue est un réglage de la famille (`Household.locale`, migration `20260927130000_household_locale`) : choisie dans l'en-tête des écrans de création du compte (le compte créé prend la langue de l'écran), puis dans l'en-tête parent (`PUT /household/locale`). L'espace enfant n'a pas de choix de langue et suit celle du foyer (`/auth/me`). Avant connexion : choix de l'appareil sur la landing, `?lang=en` dans l'adresse. Textes du site : objets `defineCopy({ fr, en })` à côté de chaque écran (`apps/web/src/i18n`), formats de dates et de nombres par `i18n/format.ts`. L'API lit l'en-tête `X-Locale` (`apps/api/src/lib/i18n.ts`) : messages d'erreur traduits dans `lib/i18n/errors.ts` (ajouter chaque nouveau message), contenus (univers, 105 cartes, badges, modules) dans `lib/i18n/content.ts`, encarts T01-T46 dans `lib/finance/tips.ts` (table `EN`), questions dans `lib/finance/questionsEn.ts`. Restent en français : ce que le parent écrit, le foyer de démonstration, l'outil Démo, le manifeste PWA.
- **Migration** `20260927120000_push_locale` (langue de l'appareil pour « Ton relevé est prêt. » / « Your statement is ready. ») appliquée en local. `prisma generate` a échoué en local parce que le serveur API tenait le moteur ouvert : relancer `npm run db:migrate` ou `npx prisma generate` serveur arrêté. Les types générés sont déjà à jour.
- **XP utile** : chaque niveau gagné donne un booster de niveau (`sourceType: "level_up"`, `sourceId: level:N`, une seule fois, ligne enfant verrouillée), certains niveaux un titre (`lib/levels.ts`, codes affichés par `apps/web/src/lib/levels.ts`). Profil : `components/XpGuide.tsx` ; accueil : prochaine récompense ; fête des quêtes : passage de niveau ; formulaire de quête parent : aide sur l'XP.
- **Corrections** : texte grisé des chapitres de la landing sur mobile, phrase des placements coupée, contraste de la section confiance, « Certaines quêtes » corrigé en « Chaque quête », statuts bruts des quêtes parent, argent de poche par défaut 500 → 10, page parent « Enfants » en sections repliables, correction de solde en formulaire idempotent (plus de `window.prompt`), coffre réorganisé (action d'abord, un seul encart à la fois), dates de la projection, mots du carnet à découvrir, « Tout sélectionner » sur les univers (`PUT /household/universes`).
- **Onglet enfant « Mon trésor »** (« My treasure ») à la place de « Mon argent » : les pièces sont virtuelles. La route reste `/enfant/argent`.
- **Audit** complet (serious game, éducation, finance, pédiatrie) avec les décisions à prendre : https://claude.ai/artifact/DWEZtfNyBpDs23mq68YnNg (rythme des boosters, XP selon la difficulté, textes pour les 8-9 ans, repère de prix en boutique, fin des « unités école », vallée par paliers).
- Captures de la landing : `node apps/web/scripts/capture-parent-dashboard.mjs fr|en` régénère le tableau de bord parent montré dans chaque langue. Tests API : 75/75 verts ; build web vert.

## Point d’étape du 27 septembre 2026 — refonte enfant en cours

- L'XP fait désormais pousser l'arbre d'aventure : cinq formes illustrées aux niveaux 1/5/10/20/30, une croissance graduelle entre deux formes, une brève réaction après un gain réellement renvoyé par le serveur. HUD et profil l'affichent ; l'XP et les récompenses restent sous autorité serveur. Captures 375/768/1280 dans `docs/screenshots/child-experience-*`.
- Reprise de 04 h 05 : galerie, chambre du trésor, observatoire, bibliothèque et échoppe disposent de décors distincts. Deux personnages en pied avec poses repos/victoire, quatre illustrations de récompenses et quatre scènes pédagogiques sont intégrés. Les sources PNG et le script `apps/web/scripts/optimize-child-art.mjs` sont versionnés ; les WebP sont servis en tailles adaptées.
- Journal de quêtes illustré, bibliothèque et leçons visuelles, échoppe à objets, personnage sur la place et dans le profil. Les nouvelles chaînes du hub, du journal, de la boutique, du profil, du PIN et du passage parent/enfant ont une version française et anglaise.
- Revue en navigateur à 375, 768 et 1280 px ; les captures sont dans `docs/screenshots/child-*`. Les plaques de la place ne sont plus cachées par la navigation ; nom complet dans le HUD mobile et quatre onglets d'argent visibles. `docs/CHILD_UI_REDESIGN.md`, `CHILD_MOTION.md` et `CHILD_DESIGN_AUDIT.md` décrivent les décisions et limites.
- Emma et Lucas disposent désormais chacun des six poses prévues, utilisées sur la place, le profil, dans les leçons et à la validation. Les détails des leçons ont été vérifiés en capture à 375/768/1280 px. Restent pour une complétude graphique stricte : personnages en pied pour les 14 autres portraits, calques visuels des paliers 5/10/20/30 et objets uniques pour les objectifs libres dont le titre n'est connu qu'à la création. Le registre de compte et le chemin illustré des objectifs sont livrés. Les contenus rédigés par le foyer restent dans leur langue d'origine. Le catalogue d'images de cartes existant reste inchangé.
- Les vues d'album reprennent le décor de galerie ; les états vides du compte, de l'historique et des cartes montrent des objets illustrés. Les captures 375/768/1280 de collection et d'album sont dans `docs/screenshots/child-experience-*`. Le dernier coup sur le cristal du booster annonce correctement la rupture.
- La boutique montre désormais des objets distincts pour les dix récompenses courantes du foyer de démonstration, dont le dessert séparé de la glace ; une planche générée trop répétitive a été rejetée avant intégration. Captures du journal, du coffre, de la boutique et de l'observatoire à 375/768/1280 px dans `docs/screenshots/child-experience-*`. Les récompenses libres du parent gardent un pictogramme de catégorie tant qu'elles n'ont pas d'illustration dédiée.
- Accueil enfant remplacé par la Vallée d’Okodukai, avec fonds WebP distincts pour ordinateur et mobile, lieux cliquables, HUD et accès aux quêtes. Un profil enfant permet de choisir un avatar du roster existant.
- Le parent peut définir un PIN parent, passer sur l’espace d’un enfant sur le même téléphone, puis revenir avec ce PIN. Il peut aussi créer un lien à usage unique valable 24 h pour le téléphone personnel de l’enfant ; l’enfant entre son PIN habituel. Le lien ne donne jamais accès au compte parent.
- Migration `20260927090000_child_device_access` appliquée en local ; elle doit être appliquée sur les autres bases au déploiement. Tests API : 74/74 verts. Build complet des trois workspaces : vert. Accueil et dialogue parent vérifiés en navigateur à 375 px et sur ordinateur.
- Direction et inventaire : `CHILD_ART_DIRECTION.md`, `CHILD_ASSET_PLAN.md`, `CHILD_UI_REDESIGN.md`, `CHILD_MOTION.md`, `CHILD_DESIGN_AUDIT.md` et `ASSET_REGISTRY.md`. Ce point d’étape ne clôt pas les limites graphiques listées ci-dessus.
- Une reprise automatique de cette tâche est programmée après la remise à zéro du quota à 04 h 05 (Europe/Paris) le 27 septembre. Elle doit vérifier le quota, finir la refonte, relancer les validations et pousser les étapes terminées sur `main`.

Point de reprise pour la prochaine session (locale ou cloud). Tout ce qui est listé comme **fait** est
sur `main`. Lire aussi `CLAUDE.md` (règles produit) et `AGENTS.md` (skills).

---

## 0. Reprendre en local

```bash
git pull origin main
npm install                 # dépendances ajoutées : three, express-async-errors, web-push
npm run db:up               # Postgres Docker (si pas déjà lancé)
npm run db:migrate          # applique les migrations (onboarding, coffre, placements, verger)
npm run db:seed             # recrée le foyer de démo « Famille Martin » (Emma 8-9, Lucas 10-12)
npm run dev:api             # API : http://localhost:4000 (santé : /health)
npm run dev:web             # site : http://localhost:5173
```

- En dev, le bouton **Démo** (en bas à droite) connecte en un clic un parent ou un enfant de démo.
- Tests API : `cd apps/api && set -a && . ./.env && set +a && npx vitest run` (68 tests, tous verts
  au 26/09). Types : `npx tsc --noEmit -p apps/api` et `npm run build --workspace apps/web`.
- Pour voir des relevés de placements sans attendre : reculer `startedAt` de la partie en base, par
  exemple `UPDATE "SimulationRun" SET "startedAt" = now() - interval '4 days' WHERE "childId" = '…';`.

## Où en est-on (26/09, fin de journée)

P1, P2 et P3 sont faits (détail dans chaque section). Ce qui reste demande le propriétaire :
- **Mise en production** de la branche `feat/p1-securite-solidite` (pas encore poussée) : `migrate deploy`
  appliquera les nouvelles migrations, dont le `DROP TABLE` des tables `Simulation{Scenario,Portfolio,Transaction}`
  (inutilisées). Vérifier aussi qu'un déploiement de prévisualisation de l'API ne vise pas la base de production.
- **Variables Vercel** : `PROXY_SECRET` (projets web et API), `CRON_SECRET`, `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (projet API). Voir §P1 et §P2 ci-dessous.
- ~~Stockage des images de cartes~~ : tranché le 26/09, WebP optimisés versionnés et servis par le site (voir
  `CLAUDE.md`), contenu importé à chaque déploiement de production.

## 1. Production (Vercel) : à vérifier par le propriétaire

1. **Projet web** : variable `API_ORIGIN` = URL du projet API (sinon `VITE_API_URL` existante). Le site
   relaie `/api/*` via `apps/web/api/proxy.js` : le cookie de session est « first-party ».
2. **Projet API** : `DATABASE_URL` et `JWT_SECRET` obligatoires (sans `JWT_SECRET`, l'API répond 503).
   Le build lance maintenant `prisma generate && prisma migrate deploy` (`apps/api/vercel.json`).
   - Si le build échoue avec **P3005** (base créée sans historique de migrations) :
     `npx prisma migrate resolve --applied 20260925193030_init` avec la `DATABASE_URL` de prod, puis
     relancer le déploiement.
   - Si la base passe par un pooler (PgBouncer), `migrate deploy` peut exiger une URL directe
     (`directUrl` dans `schema.prisma`).
3. Contrôle : `https://okodukai.fr/api/health` doit renvoyer `"database":"ok"` et
   `"jwtSecret":"ok"`.
4. Les images de cartes et les anciens avatars (Héros de la classe) sont **gitignorés** : en prod, les
   cartes n'ont pas d'image. Il faut un vrai stockage (S3, Supabase storage propre à Okodukai ou Git
   LFS) : décision à prendre (voir `CLAUDE.md`).

## 2. Décisions en attente du propriétaire

| Sujet | Options | Où |
| --- | --- | --- |

Tranché le 26/09 : **visuel du booster** (on garde l'illustration dorée, habillée Okodukai : logo + ruban
d'univers) ; **boosters par univers** : le ruban porte le nom de l'univers (variante de couleur possible,
voir `ASSET_PLAN.md`).

Règle projet : pour tout choix entre deux éléments, **montrer les propositions** (images) et laisser
le propriétaire trancher. Le 26/09, le propriétaire a demandé d'avancer en autonomie et de trancher seul.

---

## 3. Fait (résumé)

- **Compte** : écran unique « Votre compte Okodukai » (`/inscription`, `/connexion` →
  `POST /auth/continue` : connexion si l'e-mail existe, création sinon), puis accueil
  Famille → Enfants → Prêt (`/accueil/*`), garde tant que l'accueil n'est pas terminé.
- **Art** : studio 3D dans le repo (three.js + Chromium headless → WebP), bible mise à jour
  (`docs/ART_BIBLE.md` §2, §9, §10, §13), registre `docs/ASSET_REGISTRY.md`. Assets : pièce, coffre
  (6 états), parchemin, bourse, sablier, pousse à pièces, tableau d'aventurier, vallée heure dorée et
  crépuscule (desktop + mobile), 12 avatars SVG, logo en WebP.
- **Écrans habillés** : landing (hero 3D animé, plateau de la boucle, relevé exemple), compte et accueil,
  accueil enfant, quêtes, collection (crépuscule), Mon argent.
- **Mission financière** (voir `docs/BANKING_UX.md`, `docs/SAVINGS_VAULT_SPEC.md`, `docs/DATA_MODEL.md`,
  `docs/QA_PLAN.md`) :
  - « Mon argent » : Mon compte (livret, semaine), Historique (relevé jour par jour, signes écrits,
    filtres 10-12, fiche Avant · Mouvement · Après), Mon coffre (transferts idempotents avec aperçu,
    objectifs en cascade, règles de retrait fixées par le parent, demandes de retrait validées au
    tableau de bord parent).
  - « Investir » : observatoire branché sur le moteur `finsim-1.0.0` (partie figée, relevés en
    rattrapage, rien du futur côté client), onboarding 6 étapes, atelier de répartition, bilans sobres,
    arbitrage au prochain relevé, fin de partie avec scénario révélé ; 8-9 : jetons et mots, jamais de
    % ; 10-12 : %, courbe honnête, risque de la répartition.
  - Verger du temps long (assurance-vie simulée, 10-12) : frais d'exemple, versements programmés,
    relevés « belle récolte / un hiver », effet marché séparé des versements.
  - Bibliothèque : modules corrigés par le serveur (plus d'XP sur `correct: true` envoyé par le
    client) + leçons chiffrées 10-12 (boule de neige, frais, liste du marché).
  - Réglages parent par enfant : règle du coffre, placements (activés, rythme Rapide/Standard/Long,
    partie de 5 ou 10 ans).

---

## 4. Reste à faire, par priorité

### P1 : sécurité et solidité (fait le 26/09, branche `feat/p1-securite-solidite`)

Fait : limitation des essais en base (`AuthThrottle`, `lib/throttle.ts`, voir `DATA_MODEL.md`
§Connexion), XP des placements (+20 première répartition, +20 bilan final lu, `FINANCE_LEARNING`),
suppression des anciennes tables du simulateur. **Au prochain déploiement**, `migrate deploy` applique
3 migrations, dont un `DROP TABLE` des tables `Simulation{Scenario,Portfolio,Transaction}` (inutilisées).

Suites faites le 26/09 :

1. **Limite par adresse** : le relais `apps/web/api/proxy.js` transmet l'adresse du visiteur signée
   (HMAC, `PROXY_SECRET`) ; l'API limite à 30 essais par 15 min et par adresse (connexion, sortie du mode
   enfant, PIN). **À faire par le propriétaire** : définir la même variable `PROXY_SECRET` (chaîne
   aléatoire) sur les projets Vercel web **et** API ; sans elle, pas de limite par adresse.
2. **Appareil familial** : la liste des profils et la connexion par PIN exigent un cookie signé posé quand
   un parent se connecte sur l'appareil (et rafraîchi par `/auth/me` : rien à refaire pour un parent déjà
   connecté). Un appareil jamais connecté en parent voit « Connectez-vous d'abord en tant que parent ».
3. L'XP de première répartition est donnée à la validation ; quand Q04 existera (P2.2), la donner
   après Q04 comme le prévoit `FINANCIAL_EDUCATION.md` §7.1.

### P2 : mission financière (compléments)

**Tout P2 est fait (26/09)** : 1 encarts T01-T46 (journal serveur, file de priorité) · 2 questions Q01-Q16
corrigées par le serveur, Q04 à l'onboarding, « Mon carnet » · 3 fiche support · 4 bilan final complet et « Mes
parties » · 5 versements programmés sous plafond parent · 6 vue parent (« Ce que {prénom} sait expliquer »,
dernier bilan, prochain échange, note assurance-vie) · 7 pause parentale · 8 « Tout ce que je possède » et « Mon mois
en pièces » · 9 niveau pédagogique · 10 argent de poche automatique (rattrapage idempotent) et cadeaux · 11 objectifs
reliés à la boutique (vérifié côté serveur) et réordonnables · 12 « Ton relevé est prêt. » (voir mise en service
ci-dessous). La liste d'origine est gardée pour mémoire.

**Mise en service des notifications (à faire par le propriétaire, projet API Vercel)** :
1. `npx web-push generate-vapid-keys`, puis variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et
   `VAPID_SUBJECT` (une URL ou un `mailto:` de contact). Sans ces clés, rien n'est envoyé (la pastille
   « Ton bilan est prêt » de l'app reste).
2. Variable `CRON_SECRET` (chaîne aléatoire) : Vercel Cron appelle `/internal/cron/statements` avec ce secret.
3. `apps/api/vercel.json` programme la tâche une fois par jour à 16 h 30 UTC (après le relevé de 17 h, avant
   20 h, heure de Paris). Sur l'offre gratuite Vercel, une tâche par jour au plus ; le rythme Rapide
   (4 relevés par jour) reste prévenu au plus une fois par jour, comme le demande la spec.

Spécifications : `docs/INVESTMENT_UX.md`, `docs/FINANCIAL_EDUCATION.md`, `docs/INSURANCE_LIFE_SIMULATION.md`.

1. **Encarts pédagogiques contextuels** (T01 à T46) avec journal serveur « vu une fois par enfant »,
   au plus un encart par écran, file de priorité (réassurance d'abord) : `FINANCIAL_EDUCATION.md` §5.
   Aujourd'hui, seuls quelques encarts sont écrits en dur dans les écrans.
2. **Vérifications de compréhension** (Q01…, dont Q04 « Ton placement école a baissé. Et tes pièces ? »
   à l'étape 6 de l'onboarding) : §9.
3. **Fiche support** (E8) : page par support avec sa part, son évolution, son risque, la durée
   recommandée (sablier), les frais (10-12), « dans la vraie vie ».
4. **Fin de partie complète** (E16) : frise des décisions, « Et avec d'autres choix ? »
   (`alternativeOutcomes`, 10-12, phrase obligatoire « Personne ne pouvait savoir à l'avance »),
   archive « Mes parties » consultable, jamais de comparaison de valeur entre parties.
5. **Versements programmés dans l'observatoire** (E11, 10-12) avec plafond parent ; aujourd'hui
   seulement dans le verger.
6. **Vue parent des placements** (P2) : l'observatoire en lecture seule dans l'espace parent (l'API
   `GET /household/children/:id/invest` existe) + la note au parent sur l'assurance-vie (bénéficiaires,
   décision D6-A : jamais évoqué côté enfant).
7. **Pauses parentales** (vacances) : le moteur les gère (`clockState({ pauses })`), à stocker et à
   exposer dans les réglages parent.
8. **« Tout ce que je possède »** (patrimoine, 10-12) et le volet « Mon mois en pièces » dans les bilans.
9. **Niveau pédagogique** réglable par le parent (Découverte / Approfondi), prioritaire sur l'âge.
10. **Argent régulier et cadeaux** : types de transaction dédiés (et versement hebdomadaire
    automatique optionnel) ; aujourd'hui le parent passe par « + Pièces ».
11. **Objectifs** : relier un objectif à une récompense de la boutique (`rewardId` existe déjà),
    réordonner les objectifs.
12. **Notifications** « Ton bilan est prêt. » (au plus une par jour en Rapide, jamais la nuit, jamais la
    valeur dans le texte) ; aujourd'hui seulement la pastille dans l'app.

### P3 : direction artistique (fait le 26/09)

- **Ouverture de booster** refaite au niveau de la référence « summon » demandée par le propriétaire :
  ciel animé (canvas), cercle d'invocation, cristal à briser (3 touches ou appui long), annonce Épique /
  Légendaire avec bandeau, retournement carte par carte (rayons, onde, reflet holo, pluie d'étoiles),
  « Nouvelle ! » décidé par le serveur, récapitulatif, enchaînement des boosters, sons synthétisés
  coupables, vibrations. `components/booster/*`, `styles/booster.css`. Aperçu par rareté dans la barre
  Démo (rien n'est crédité).
- **Sachet de booster** : décision du propriétaire, on garde l'illustration dorée, habillée du logo et
  d'un ruban au nom de l'univers (`BoosterPack.tsx`). Pile de boosters dans la collection.
- **Boutique** : échoppe 3D (`scenes/shop.js`) en en-tête ; deux colonnes sur téléphone.
- **Parent** : bandeau vallée discret sur le tableau de bord. **États vides** illustrés (enfant).
- **Motion** : fête des quêtes validées (pièces qui volent, XP, booster), lanternes de l'observatoire.
- **Revue** à 375, 768 et 1280 px (captures Playwright) : collection en deux colonnes sur téléphone,
  cases à cocher des univers, libellés trop longs. `docs/ASSET_PLAN.md` liste les assets restants.

---

## 5. Studio 3D : mémo

- Scènes : `apps/web/scripts/art/studio/scenes/*.js` (coin, chest, props, board, valley). Plateau
  commun et matières : `lib/stage.js`, `lib/textures.js`, `lib/coins.js`.
- Construire : `npm run art:studio --workspace apps/web -- <filtre>` (liste dans `studio/build.mjs`).
- Revue : `node apps/web/scripts/art/studio/sheet.mjs <scène> <sortie.png> '<[params]>'`.
- Chromium requis : sur Mac, `npx playwright install chromium`, ou `CHROMIUM_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Chaque nouvel asset : ajouter une ligne dans `docs/ASSET_REGISTRY.md`.

## 6. Points de vigilance

- Les nouvelles parties miroir sont financées par des pièces virtuelles transférées du compte de
  l'enfant. Les unités école des anciennes parties et du verger restent séparées ; ne pas les
  additionner aux pièces. Aucun euro ni vrai placement financier n'entre dans l'application.
- Toute valeur financière affichée vient du serveur ; ne jamais envoyer `seed`, `scenario` ou
  `marketPath` au client avant la fin d'une partie (test : `invest.e2e.test.ts`).
- Toute écriture au ledger passe par `recordWalletTransaction` (verrou `FOR UPDATE` + clé d'idempotence).
- Suivi de progression : indiquer l'avancement tous les ~25 % avec les minutes restantes (`CLAUDE.md`).
