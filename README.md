# Vocabulary Lab

A mobile-friendly English vocabulary learning website with synonym tests, pronunciation, progress tracking, wrong-word review, PWA installation, and optional Firebase cloud sync.

## Live site

GitHub Pages URL (after Pages is enabled):

`https://cge1.github.io/vocabulary-lab/`

## PWA / phone app

The repository includes:

- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`
- `pwa.js`

On supported Android/desktop browsers, use **Install App**. On iPhone/iPad Safari, use **Share -> Add to Home Screen**.

## Firebase cloud sync setup

The website already contains the login and synchronization code. To activate it:

1. Create a Firebase project at https://console.firebase.google.com/.
2. In **Project settings -> General -> Your apps**, add a **Web app**.
3. Copy the Firebase web configuration values into `firebase-config.js`.
4. In **Authentication -> Sign-in method**, enable **Email/Password**.
5. Create a **Cloud Firestore** database.
6. Replace the Firestore rules with the contents of `firestore.rules` and publish them.
7. Make sure `cge1.github.io` is present in **Authentication -> Settings -> Authorized domains** if Firebase does not add it automatically.

The Firebase web configuration is not a secret. Access is protected by Firebase Authentication and the Firestore security rules.

## Sync model

When signed in, the app synchronizes:

- studied words
- wrong words
- mastered/removal state
- test history
- per-device question and correct-answer totals

Each browser/device receives a local anonymous device ID. Per-device counters are merged in Firestore so activity from a computer and phone is accumulated rather than overwritten.

When signed out, the app remains fully usable in local mode.

## Data services

- Definitions/pronunciation: Free Dictionary API
- Synonym fallback: Datamuse
- Browser speech fallback: Web Speech API

Previously viewed dictionary entries are cached locally by the app.
