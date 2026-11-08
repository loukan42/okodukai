# Démarrer en local

Depuis la racine, installer les dépendances npm et lancer PostgreSQL avec Docker. Préparer la configuration locale de l’API avant d’appliquer les migrations. Démarrer ensuite l’API et le web dans deux terminaux.

```sh
npm install
npm run db:up
npm run db:migrate
npm run dev:api
npm run dev:web
```
