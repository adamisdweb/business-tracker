// ===========================================================================
//  FIREBASE CONFIG  —  PASTE YOUR KEYS HERE
// ===========================================================================
// 1. Go to https://console.firebase.google.com  →  create a project (free).
// 2. Add a Web App (the </> icon).  Firebase shows you a `firebaseConfig` object.
// 3. Copy those values into the object below (replace every PASTE_... line).
// 4. In the console:  Build → Authentication → Get started → enable
//    "Email/Password".  Then Users → Add user → create YOUR login.
// 5. Build → Firestore Database → Create database (Production mode).
//    Then paste the contents of `firestore.rules` (in this folder) into the
//    Rules tab and Publish.  That locks the data to your account only.
//
// These keys are NOT secret — Firebase web keys are safe to ship in the
// browser. Your data is protected by the login + the Firestore rules.
// ===========================================================================

export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};
