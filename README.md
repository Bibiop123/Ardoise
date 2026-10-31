# Ardoise

Partage de dépenses entre amis, façon Tricount : un groupe par événement, qui a payé, pour qui, et qui doit quoi à qui.

- Un groupe = un lien secret à envoyer aux participants (pas de compte à créer).
- Chaque personne choisit « qui elle est » dans le groupe ; ce choix reste sur son téléphone.
- Tout est sur Firebase : la page (Firebase Hosting) et les données (Realtime Database).
- Installable sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »).

## Mise en ligne

Automatique : chaque modification poussée sur la branche `main` est publiée sur https://l-ar-7a10a.web.app
par GitHub Actions (`.github/workflows/firebase-deploy.yml`).

Les règles de sécurité de la base (`database.rules.json`) ne sont publiées qu'à la main, quand elles changent :

```
npx firebase-tools deploy --only database --project l-ar-7a10a
```

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | page |
| `app.js` | logique de l'appli |
| `style.css` | design |
| `config.js` | adresse de la base Firebase |
| `firebase.json`, `.firebaserc` | déploiement Firebase |
| `database.rules.json` | règles de sécurité de la base |
| `.github/workflows/` | mise en ligne automatique |
| `manifest.webmanifest`, `icon-*` | installation sur téléphone |
