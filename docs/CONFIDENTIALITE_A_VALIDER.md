# Notice de confidentialité — texte préparatoire

Ce document n'est pas publié dans l'application. Il rassemble les faits vérifiés dans le code et les décisions que le responsable du traitement doit confirmer avant la mise en ligne de `/confidentialite`. Les champs entre crochets ne sont pas des coordonnées de contact utilisables.

L'application ne comporte pas de champ destiné aux données sensibles au sens du RGPD. Une consigne à l'inscription demande désormais de ne pas en saisir dans les profils, quêtes ou objectifs. Ces champs libres pourraient malgré tout en recevoir. L'e-mail du parent, les noms de profils et l'activité des enfants restent des données personnelles : cette consigne ne remplace pas la notice d'information.

## Informations à confirmer

1. Nom ou raison sociale, adresse postale publique et adresse e-mail de contact du responsable du traitement.
2. Durée de conservation des données du compte et du foyer après une demande de suppression, ainsi que celle des journaux de sécurité et des tentatives de connexion. Le code ne prévoit aujourd'hui aucune purge automatique de ces données.
3. Prestataires de production et pays d'hébergement effectifs pour le site, l'API, la base de données et les notifications. Vercel sert le site et l'API ; le fournisseur de la base n'est pas identifié par le dépôt.
4. Bases juridiques retenues pour la fourniture du service, la sécurité, l'administration du service et les notifications facultatives. Proposition à faire valider : exécution du service demandé par le parent pour le compte et le contenu familial ; intérêt légitime pour la sécurité et l'administration ; consentement pour les notifications du navigateur. Le consentement parental éventuel pour les traitements d'un mineur doit être examiné selon chaque finalité.
5. Procédure opérationnelle d'accès, de rectification, d'effacement et d'export des données. Il n'existe actuellement ni bouton de suppression de compte ni export complet dans l'application.

## Texte proposé pour la page publique, après validation

**Responsable du traitement.** [Nom ou raison sociale], [adresse postale], [adresse e-mail]. Cette adresse permet aux parents d'exercer leurs droits et de poser une question sur les données de leur famille.

**À quoi sert Okodukai.** Le parent crée un foyer et des profils enfants pour utiliser une tirelire et des activités pédagogiques en pièces virtuelles. Ces pièces n'ont aucune valeur monétaire. Le parent décide des règles et peut consulter l'activité des enfants de son foyer. L'administrateur du service peut consulter les adresses e-mail des comptes parents pour gérer le service ; ses statistiques sont agrégées.

**Données utilisées.** Pour le compte parent : nom d'affichage, adresse e-mail, mot de passe et code parent conservés sous forme d'empreintes, et identifiant Google stable si cette connexion facultative est utilisée. Okodukai ne conserve ni mot de passe Google, ni photo de profil, ni accès Gmail, ni jeton Google. Pour chaque enfant : nom d'affichage, tranche d'âge, personnage et cadre choisis, code PIN sous forme d'empreinte, progression et données créées dans le foyer (quêtes, récompenses, objectifs, pièces virtuelles, cartes, apprentissage et simulations pédagogiques). Okodukai ne demande pas la date de naissance exacte ni des coordonnées de paiement.

**Connexion et sécurité.** Les cookies `okodukai_session` et `okodukai_device` servent à reconnaître la session et l'appareil familial. Leur durée maximale est respectivement de 30 jours et de 365 jours. Le premier permet l'accès au profil connecté ; le second protège le choix du profil enfant sur un appareil déjà autorisé par un parent. L'application conserve aussi des compteurs de tentatives de connexion et des journaux d'administration. Les liens d'invitation enfant sont à usage unique et expirent au bout de 24 heures.

**Notifications.** Si elles sont activées, Okodukai conserve l'abonnement technique du navigateur (adresse du service push et clés nécessaires) et la langue de la notification. Le parent contrôle les notifications pédagogiques facultatives. Un abonnement expiré est retiré quand le service push signale son expiration.

**Destinataires et transferts.** Les parents du foyer accèdent aux données de leurs enfants. L'administrateur du service accède aux informations nécessaires à l'administration et aux statistiques prévues pour ce rôle. [Prestataires, rôles et éventuels transferts hors EEE à compléter après vérification des contrats et des lieux de traitement.]

**Base juridique et conservation.** [Finalités, bases juridiques confirmées et durées pour chaque catégorie à compléter. Une durée annoncée ici doit correspondre à une procédure de suppression réellement appliquée, sauvegardes comprises.]

**Vos droits.** Un parent peut demander l'accès, la rectification, l'effacement, la limitation ou la portabilité des données de son foyer selon les conditions applicables, et s'opposer aux traitements fondés sur l'intérêt légitime. Il peut retirer son accord pour un traitement fondé sur le consentement. Contacter [adresse e-mail vérifiée] en précisant la demande et l'adresse du compte. Le responsable peut demander une vérification d'identité proportionnée avant de transmettre ou de supprimer des données. Une réclamation peut être adressée à la [CNIL](https://www.cnil.fr/fr/agir).

## Vérifications techniques avant publication

- Définir et mettre en œuvre la purge ou la procédure manuelle correspondant aux durées annoncées, y compris les données liées à un foyer, les compteurs, les journaux et les sauvegardes.
- Contrôler les contrats et les régions de Vercel, de la base de données et du fournisseur de notifications ; documenter les transferts éventuels.
- Publier la page en français et en anglais, accessible depuis l'accueil, la connexion et le compte parent ; garder les deux versions alignées.
- Faire valider le contenu final par le responsable du traitement.

Références : [information des personnes (CNIL)](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [durées de conservation (CNIL)](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees), [droits des personnes (CNIL)](https://www.cnil.fr/fr/respecter-les-droits-des-personnes), [données des mineurs (CNIL)](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans).
