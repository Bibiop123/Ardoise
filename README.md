# Ardoise

Partage de dépenses entre amis, façon Tricount : un groupe par événement, qui a payé, pour qui, et qui doit quoi à qui.

- Un groupe = un lien secret à envoyer aux participants (pas de compte à créer).
- Chaque personne choisit « qui elle est » dans le groupe ; ce choix reste sur son téléphone.
- Tout est sur Firebase : la page (Firebase Hosting) et les données (Realtime Database).
- Installable sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »).

## Mise en ligne (Windows, PowerShell)

Prérequis : Node.js LTS installé (https://nodejs.org).

1. Télécharger ce dépôt (Code → Download ZIP) et le décompresser.
2. Ouvrir PowerShell dans le dossier décompressé.
3. Lancer :

```
npx firebase-tools login
npx firebase-tools deploy
```

`deploy` publie la page **et** les règles de sécurité de la base (`database.rules.json`) sur le projet Firebase `l-ar-7a10a`.

L'appli est ensuite disponible sur https://l-ar-7a10a.web.app

Pour une mise à jour : re-télécharger le ZIP, puis `npx firebase-tools deploy`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | page |
| `app.js` | logique de l'appli |
| `style.css` | design |
| `config.js` | adresse de la base Firebase |
| `firebase.json`, `.firebaserc` | déploiement Firebase |
| `database.rules.json` | règles de sécurité de la base (publiées par `deploy`) |
| `manifest.webmanifest`, `icon-*` | installation sur téléphone |
