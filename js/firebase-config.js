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
  apiKey: "AIzaSyDscgetDSA0kBfSsW4Nubr2ZGdNUfh4wMc",
  authDomain: "poxys-business-tracker.firebaseapp.com",
  projectId: "poxys-business-tracker",
  storageBucket: "poxys-business-tracker.firebasestorage.app",
  messagingSenderId: "821979565486",
  appId: "1:821979565486:web:204e6dab1c3cb72e718c3f",
  measurementId: "G-CRDX27P42Y",
};

// Only this Google account is allowed to sign in and see the data.
// (Anyone else who tries Google sign-in is immediately rejected.)
// Set to "" to allow any signed-in Google account.
export const ALLOWED_EMAIL = "adammounir1111@gmail.com";
