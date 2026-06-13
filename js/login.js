// Login screen (Google sign-in) + the "Firebase not configured yet" setup screen.
import { el, clear } from "./utils.js";
import { loginWithGoogle, authErrorMessage } from "./auth.js";

const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

export function renderLogin(root, opts = {}) {
  clear(root);
  const errBox = el("div", { class: "login-err", style: opts.error ? "" : "display:none" }, opts.error || "");
  const showErr = (m) => { errBox.textContent = m; errBox.style.display = "block"; };

  const btn = el("button", {
    class: "btn", style: "width:100%;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:none;font-weight:700;padding:12px",
    onclick: async () => {
      errBox.style.display = "none";
      btn.disabled = true; btn.innerHTML = "Signing in…";
      try {
        await loginWithGoogle();
        // success → onAuth in app.js swaps to the dashboard
      } catch (err) {
        showErr(authErrorMessage(err));
        btn.disabled = false; btn.replaceChildren(gIcon(), document.createTextNode("Continue with Google"));
      }
    },
  });
  btn.append(gIcon(), document.createTextNode("Continue with Google"));

  const card = el("div", { class: "login-card" },
    el("div", { class: "login-brand" },
      el("div", { class: "mark" }, "📦"),
      el("div", {},
        el("h1", { html: "<span style='background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent'>Jimbo</span> Business Tracker" }),
        el("div", { class: "sub" }, "Private dashboard · sign in to continue"))),
    el("h2", {}, "Welcome back"),
    el("p", { class: "lede" }, "This tracker is private — sign in with your authorised Google account."),
    errBox,
    btn,
    el("div", { class: "login-foot" }, "🔒 Only your account can access this data."));

  root.append(el("div", { class: "login-wrap" }, card));
}

function gIcon() { const s = el("span", { style: "display:inline-flex" }); s.innerHTML = GOOGLE_ICON; return s; }

export function renderConfigScreen(root) {
  clear(root);
  const example = `export const firebaseConfig = {
  apiKey: "AIza…",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234…:web:abcd…",
};`;
  const card = el("div", { class: "card pad" },
    el("h2", { style: "font-size:22px;margin-bottom:6px" }, "🔧 One-time Firebase setup"),
    el("p", { class: "muted", style: "margin-top:0" }, "Your tracker is ready — it just needs to be connected to your own free Firebase project so your data is private and synced. This takes about 5 minutes, once."),
    el("ol", {},
      el("li", { html: "Go to <a href='https://console.firebase.google.com' target='_blank' rel='noopener'>console.firebase.google.com</a> and create a project (free)." }),
      el("li", { html: "Click the <b>&lt;/&gt;</b> Web icon to add a web app. Firebase shows you a <code>firebaseConfig</code> block." }),
      el("li", { html: "Paste those values into <code>js/firebase-config.js</code> in this folder, replacing the <code>PASTE_…</code> placeholders." }),
      el("li", { html: "In Firebase: <b>Authentication → Get started → Sign-in method → Google → Enable</b>." }),
      el("li", { html: "<b>Firestore Database → Create database</b>, then paste the contents of <code>firestore.rules</code> into the Rules tab and Publish." }),
      el("li", { html: "Reload this page — you'll get the Google sign-in screen. Full step-by-step is in <code>README.md</code>." })),
    el("p", { class: "muted", style: "margin-bottom:6px" }, "Your config will look like:"),
    el("pre", {}, example));
  root.append(el("div", { class: "config-screen" },
    el("div", { class: "login-brand", style: "justify-content:center;margin-bottom:18px" },
      el("div", { class: "mark", style: "font-size:30px" }, "📦"),
      el("div", { class: "name", style: "font-family:Sora;font-weight:800;font-size:20px" }, "Jimbo Business Tracker")),
    card));
}
