# Ardoise

Partage de dépenses entre amis, façon Tricount : un groupe par événement, qui a payé, pour qui, et qui doit quoi à qui.

- Un groupe = un lien secret à envoyer aux participants (pas de compte à créer).
- Chaque personne choisit « qui elle est » dans le groupe ; ce choix reste sur son téléphone.
- Tout est sur Firebase : la page (Firebase Hosting) et les données (Realtime Database).
- Installable sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »).

## Mise en ligne

Prérequis : Node.js installé (https://nodejs.org).

```bash
npm install -g firebase-tools   # une seule fois
firebase login                  # une seule fois
git clone https://github.com/Bibiop123/Ardoise.git
cd Ardoise
firebase deploy
```

`firebase deploy` publie la page **et** les règles de sécurité de la base (`database.rules.json`).
Pour une mise à jour : `git pull` puis `firebase deploy`.

L'appli est ensuite disponible sur https://base-bonfire.web.app

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | page |
| `app.js` | logique de l'appli |
| `style.css` | design |
| `config.js` | configuration Firebase (chargée automatiquement sur Firebase Hosting) |
| `firebase.json`, `.firebaserc` | déploiement Firebase |
| `database.rules.json` | règles de sécurité à coller dans Firebase |
| `manifest.webmanifest`, `icon-*` | installation sur téléphone |
