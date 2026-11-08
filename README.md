# Ardoise

Partage de dépenses entre amis, façon Tricount : un groupe par événement, qui a payé, pour qui, et qui doit quoi à qui.

- Chacun crée un mini profil (prénom, photo, code de 4 à 6 chiffres) et retrouve ses groupes sur tous ses appareils.
- Le premier profil créé est l'administrateur : il peut redonner un code à un ami qui l'a oublié (Mon profil → Administration).
- Seuls les membres d'un groupe peuvent le voir et le modifier ; le lien d'invitation permet de rejoindre un groupe.
- Tout est sur Firebase : la page (Firebase Hosting) et les données (Realtime Database).
- Installable sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »).

## Mise en ligne

Automatique : chaque modification poussée sur la branche `main` est publiée sur https://l-ar-7a10a.web.app
par GitHub Actions (`.github/workflows/firebase-deploy.yml`).

Les règles de sécurité de la base (`database.rules.json`) sont publiées automatiquement quand elles changent. Pour les publier à la main :

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

## Appli Android (APK)

L'APK est fabriqué automatiquement par GitHub (onglet **Actions → Fabriquer l'APK**) quand le dossier `android-app/` change,
ou à la main avec le bouton **Run workflow**.

Lien de téléchargement, toujours la dernière version :
https://github.com/Bibiop123/Ardoise/releases/latest/download/ardoise.apk

L'APK ouvre https://l-ar-7a10a.web.app : les mises à jour du site arrivent sans le réinstaller.
Il est signé avec une clé fixe (`android-app/android/app/ardoise.keystore`), donc chaque nouvel APK s'installe par-dessus l'ancien.

Pour le fabriquer sur un PC Windows : double-clic sur `android-app/build-apk.bat`.
