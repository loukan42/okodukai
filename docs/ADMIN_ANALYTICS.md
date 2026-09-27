# Statistiques d’administration

Cette page est réservée au compte du propriétaire de l’application. Le rôle `PARENT_ADMIN` d’un foyer ne donne pas cet accès.

## Mise en service

### Base locale

Définir `PLATFORM_ADMIN_EMAIL` dans la configuration locale de l'API, puis lancer `npm run admin:bootstrap-local --workspace apps/api`. Cette commande crée une seule fois le compte parent, son foyer local et son droit d'administration. Elle refuse une base distante et n'écrase jamais un compte existant. Le mot de passe aléatoire est enregistré dans `apps/api/.env.local`, ignoré par Git. La base locale n'est pas copiée lors d'un push Git.

### Autres bases

1. Appliquer la migration `20260927150000_platform_admin` sur la base concernée.
2. Vérifier l'identité du propriétaire du compte déjà créé et définir son adresse dans `PLATFORM_ADMIN_EMAIL` sur l'API. La création par mot de passe ne vérifie pas encore l'e-mail. Depuis un environnement relié à cette base, lancer `npm run admin:grant --workspace apps/api -- --allow-password-account` pour un compte créé par mot de passe ; omettre l'option si Google est associé. Le script retire le droit à tout ancien administrateur global avant de l'attribuer à ce compte. Il ne modifie pas le mot de passe.
3. Recharger l'application ou se reconnecter. Le lien **Administration** apparaît en premier dans la navigation parent ; sur téléphone, il est libellé **Admin**.

L'attribution est ponctuelle : les builds suivants ne changent pas les droits administrateur.

La page affiche les nombres globaux de parents, de profils enfant, de familles, de quêtes créées et de validations. Elle permet aussi de voir les créations et actions des 7, 30 ou 90 derniers jours. Chaque validation d’une quête récurrente est comptée séparément. Les périodes sont des fenêtres glissantes, calculées à l’heure de la requête.

Elle affiche également une liste paginée des comptes parents : adresse e-mail et date d'inscription, 25 comptes par page. Cette liste sert à la gestion et à l'assistance des comptes. Elle n'affiche aucun profil enfant ni activité individuelle.

## Données et accès

L'API `/admin/analytics` ne renvoie que des nombres et la période de calcul. L'API `/admin/users` ne sélectionne que l'e-mail et la date de création des comptes parents ; elle ne renvoie ni identifiant interne, ni mot de passe, ni donnée d'enfant. Aucune nouvelle collecte d'événements ni cookie de mesure d'audience n'est ajouté. Les réponses HTTP portent `Cache-Control: private, no-store` et le droit d'accès est revérifié en base à chaque appel.

Ces vues utilisent les données opérationnelles existantes. L'écran de connexion précise désormais que l'administrateur peut consulter l'e-mail pour gérer les comptes. Il reste à publier une notice de confidentialité complète décrivant les finalités, la base juridique retenue, les destinataires, les droits des personnes et les durées de conservation des données source. Ces choix relèvent du responsable de traitement. Les petits effectifs globaux peuvent encore permettre des déductions : maintenir cet accès strictement limité au propriétaire.

Références : [minimisation des données, CNIL](https://www.cnil.fr/fr/minimiser-les-donnees-collectees) et [durées de conservation, CNIL](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
