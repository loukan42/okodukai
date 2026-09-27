# Connexion avec Google

Okodukai utilise le bouton Google Identity Services. Le navigateur reçoit un jeton d’identité et l’envoie à l’API ; l’API le vérifie avec la bibliothèque officielle Google avant de créer une session Okodukai. Aucun accès Gmail, mot de passe Google, photo de profil ou jeton Google n’est conservé. Les données enregistrées sont l’identifiant stable Google (`sub`), l’adresse e-mail vérifiée et le nom d’affichage.

## Configuration nécessaire

1. Dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials), créer un projet et configurer l’écran de consentement OAuth. Si l’application est en mode test, ajouter les comptes de test autorisés.
2. Créer un **ID client OAuth** de type **Application Web**. Ajouter les origines JavaScript autorisées : `http://localhost:5173` pour le développement et l’origine HTTPS publique du site pour la production. Le flux utilisé est le bouton popup, donc aucune URI de redirection n’est nécessaire.
3. Définir `GOOGLE_CLIENT_ID` avec cet ID sur le projet **API** Vercel et dans `apps/api/.env` pour le développement local. Le site reçoit l’ID public par `GET /auth/google/client` : aucune variable ni secret Google n’est nécessaire côté web.
4. Redéployer l’API et le site. Ouvrir `/inscription` ou `/connexion` pour vérifier le bouton officiel. Un client ID non configuré laisse la connexion e-mail et mot de passe disponible et affiche un message d’indisponibilité à la place du bouton.

## Comptes existants

Un parent qui possède déjà un compte e-mail/mot de passe se connecte avec ce mot de passe, ouvre **Compte**, puis associe le compte Google ayant la même adresse e-mail. Une tentative de connexion Google avant cette association n’ouvre pas le compte existant. Le lien entre les deux comptes reste ensuite stable grâce au `sub` Google, même si l’adresse Google change.

Un nouveau parent peut créer son foyer directement avec Google. Il peut définir le code parent d’un téléphone partagé en confirmant son identité avec Google ; le retour depuis l’espace enfant accepte ce code ou Google.

Le droit d’administration global sur une base distante reste une attribution manuelle sur un compte **existant**. La procédure de `docs/ADMIN_ANALYTICS.md` permet aussi l’attribution à un compte créé par mot de passe, après vérification de son propriétaire, avant la configuration Google. La base locale dispose d'une commande d'initialisation séparée. Aucun domaine ni adresse e-mail Google ne reçoit ce droit automatiquement.

## Confidentialité et exploitation

Informer les familles que la connexion Google est facultative et quelles données de compte elle apporte à Okodukai. Mettre à jour la notice de confidentialité avant l’activation publique. Pour diagnostiquer une panne, vérifier que l’ID client API correspond au client Web Google et que l’origine exacte du site figure dans les origines autorisées.

Références : [bouton Google Identity Services](https://developers.google.com/identity/gsi/web/guides/display-button), [vérification des jetons](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [configuration de l’ID client](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
