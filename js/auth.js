// Authentication wrapper (email/password).
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { auth } from "./firebase.js";

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const currentUser = () => auth.currentUser;

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
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts — try again in a moment.",
    "auth/network-request-failed": "Network error — check your connection.",
    "auth/operation-not-allowed": "Email/Password sign-in isn't enabled in Firebase yet.",
  };
  return map[code] || err?.message || "Something went wrong signing in.";
}
