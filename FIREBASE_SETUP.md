# Vocabulary Lab — Firebase activation

The PWA and cloud-sync code are already included. Complete these one-time Firebase Console steps to turn on cross-device sync.

1. Create or select a Firebase project.
2. Project settings → Your apps → add a Web app.
3. Copy the `firebaseConfig` values into `firebase-config.js`.
4. Authentication → Sign-in method → enable **Email/Password**.
5. Authentication → Settings → Authorized domains → add `cge1.github.io` if it is not already listed.
6. Firestore Database → create a database.
7. Firestore Database → Rules → replace the rules with the contents of `firestore.rules`, then publish.
8. Open the GitHub Pages site, choose **Account**, create an account, and sign in on each device with the same email/password.

## Data model

Each signed-in user stores one private document at:

`users/{uid}`

It contains the Vocabulary Lab state (studied words, wrong words, totals, and test history). The included security rules only permit an authenticated user to read or write the document whose ID matches that user's Firebase Auth UID.

## PWA install

- iPhone/iPad: Safari → Share → Add to Home Screen.
- Android/Chrome: use **Install App** when shown, or browser menu → Install app / Add to Home screen.
