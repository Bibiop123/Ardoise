# Ardoise

Partage de dépenses entre amis, façon Tricount : un groupe par événement, qui a payé, pour qui, et qui doit quoi à qui.

- Un groupe = un lien secret à envoyer aux participants (pas de compte à créer).
- Chaque personne choisit « qui elle est » dans le groupe ; ce choix reste sur son téléphone.
- Les données sont stockées dans Firebase Realtime Database, la page est hébergée sur GitHub Pages.
- Installable sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »).

## Mise en route

1. **Règles Firebase** : dans la console Firebase, *Realtime Database → Règles*, colle le contenu de `database.rules.json` puis *Publier*.
   Ces règles n'autorisent l'accès qu'à un groupe dont on connaît l'identifiant (le lien), et interdisent de lister tous les groupes.
2. **Adresse de la base** : vérifie que l'adresse en haut de l'onglet *Data* correspond à celle de `config.js`.
3. **GitHub Pages** : *Settings → Pages → Deploy from a branch → main / (root)*.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | page |
| `app.js` | logique de l'appli |
| `style.css` | design |
| `config.js` | adresse de la base Firebase |
| `database.rules.json` | règles de sécurité à coller dans Firebase |
| `manifest.webmanifest`, `icon-*` | installation sur téléphone |
