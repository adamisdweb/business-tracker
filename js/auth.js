// Authentication wrapper (Google sign-in, locked to one account).
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase.js";
import { ALLOWED_EMAIL } from "./firebase-config.js";

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const currentUser = () => auth.currentUser;

// Is this user permitted? (matches the allow-listed email, case-insensitive)
export const isAllowedEmail = (user) =>
  !!user && (!ALLOWED_EMAIL || (user.email || "").toLowerCase() === ALLOWED_EMAIL.toLowerCase());

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  if (!isAllowedEmail(cred.user)) {
    await fbSignOut(auth);
    const e = new Error("This Google account isn't authorised for this tracker.");
    e.code = "app/not-authorised";
    throw e;
  }
  return cred.user;
}

// Kept available in case you re-enable email/password in Firebase.
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}
export const logout = () => fbSignOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

// Turn Firebase error codes into friendly text.
export function authErrorMessage(err) {
  const code = err?.code || "";
  const map = {
    "app/not-authorised": "This Google account isn't authorised. Sign in with the account set up for this tracker.",
    "auth/popup-closed-by-user": "Sign-in window closed before finishing — give it another go.",
    "auth/cancelled-popup-request": "Another sign-in is already in progress.",
    "auth/popup-blocked": "Your browser blocked the popup — allow popups for this site and retry.",
    "auth/unauthorized-domain": "This web address isn't in Firebase's authorised domains yet (Authentication → Settings → Authorized domains).",
    "auth/operation-not-allowed": "Google sign-in isn't enabled in Firebase yet (Authentication → Sign-in method → Google → Enable).",
    "auth/network-request-failed": "Network error — check your connection.",
    "auth/too-many-requests": "Too many attempts — try again in a moment.",
    "auth/invalid-credential": "Email or password is incorrect.",
  };
  return map[code] || err?.message || "Something went wrong signing in.";
}
