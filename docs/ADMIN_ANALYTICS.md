# Statistiques d’administration

Cette page est réservée au compte du propriétaire de l’application. Le rôle `PARENT_ADMIN` d’un foyer ne donne pas cet accès.

## Mise en service

### Base locale

`npm run admin:bootstrap-local --workspace apps/api` crée une seule fois le compte parent `loucore@gmail.com`, son foyer local et son droit d'administration. La commande refuse une base distante et n'écrase jamais un compte existant. Son mot de passe aléatoire est enregistré dans `apps/api/.env.local`, qui est ignoré par Git. Cette base locale n'est pas copiée lors d'un push Git.

### Autres bases

1. Appliquer la migration `20260927150000_platform_admin` sur la base concernée.
2. Vérifier que le compte parent `loucore@gmail.com` existe déjà et que Google lui est associé (création avec Google ou association depuis **Compte**). Cela confirme la possession de cette adresse, car la création par mot de passe ne vérifie pas encore l’e-mail. Lancer ensuite `npm run admin:grant --workspace apps/api -- loucore@gmail.com` avec la `DATABASE_URL` de cette base. Le script refuse une autre adresse et retire le droit à tout ancien administrateur global avant de l’attribuer au compte choisi.
3. Se déconnecter puis se reconnecter, ou rafraîchir l’application. L’onglet **Administration** apparaît dans l’espace parent.

La page affiche les nombres globaux de parents, de profils enfant, de familles, de quêtes créées et de validations. Elle permet aussi de voir les créations et actions des 7, 30 ou 90 derniers jours. Chaque validation d’une quête récurrente est comptée séparément. Les périodes sont des fenêtres glissantes, calculées à l’heure de la requête.

## Données et accès

L’API ne renvoie que des nombres et la période de calcul. Aucun nom, adresse, identifiant, âge, titre de quête ou ligne d’activité individuelle n’est envoyé à cet écran. Aucune nouvelle collecte d’événements ni cookie de mesure d’audience n’est ajouté. La réponse HTTP porte `Cache-Control: private, no-store` et le droit d’accès est revérifié en base à chaque appel.

Ces mesures utilisent les données opérationnelles existantes. Avant la mise en production, documenter cette finalité statistique dans l’information fournie aux familles, sa base légale et les durées de conservation des données source. Les petits effectifs globaux peuvent encore permettre des déductions : maintenir cet accès strictement limité au propriétaire.

Références : [minimisation des données, CNIL](https://www.cnil.fr/fr/minimiser-les-donnees-collectees) et [durées de conservation, CNIL](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
