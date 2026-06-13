// Login screen + the "Firebase not configured yet" setup screen.
import { el, clear, toast } from "./utils.js";
import { login, resetPassword, authErrorMessage } from "./auth.js";

export function renderLogin(root) {
  clear(root);
  const errBox = el("div", { class: "login-err", style: "display:none" });
  const email = el("input", { class: "input", type: "email", autocomplete: "username", placeholder: "you@example.com" });
  const pass = el("input", { class: "input", type: "password", autocomplete: "current-password", placeholder: "••••••••" });
  const btn = el("button", { class: "btn primary", style: "width:100%;justify-content:center", type: "submit" }, "Sign in");

  const showErr = (m) => { errBox.textContent = m; errBox.style.display = "block"; };

  const form = el("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      errBox.style.display = "none";
      if (!email.value || !pass.value) return showErr("Enter your email and password.");
      btn.disabled = true; btn.textContent = "Signing in…";
      try { await login(email.value, pass.value); }
      catch (err) { showErr(authErrorMessage(err)); btn.disabled = false; btn.textContent = "Sign in"; }
    },
  },
    el("div", { class: "field" }, el("label", {}, "Email"), email),
    el("div", { class: "field" }, el("label", {}, "Password"), pass),
    errBox, btn);

  const forgot = el("a", { href: "#", onclick: async (e) => {
    e.preventDefault();
    if (!email.value) return showErr("Type your email above first, then click reset.");
    try { await resetPassword(email.value); toast("Password reset email sent."); }
    catch (err) { showErr(authErrorMessage(err)); }
  } }, "Forgot password?");

  const card = el("div", { class: "login-card" },
    el("div", { class: "login-brand" },
      el("div", { class: "mark" }, "📦"),
      el("div", {},
        el("h1", { html: "<span style='background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent'>Jimbo</span> Business Tracker" }),
        el("div", { class: "sub" }, "Private dashboard · sign in to continue"))),
    el("h2", {}, "Welcome back"),
    el("p", { class: "lede" }, "Sign in with the account you created in Firebase."),
    form,
    el("div", { class: "login-foot" }, forgot));

  root.append(el("div", { class: "login-wrap" }, card));
  setTimeout(() => email.focus(), 50);
}

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
      el("li", { html: "In Firebase: <b>Authentication → Get started → Email/Password → Enable</b>. Then <b>Users → Add user</b> to create your login." }),
      el("li", { html: "<b>Firestore Database → Create database</b>, then paste the contents of <code>firestore.rules</code> into the Rules tab and Publish." }),
      el("li", { html: "Reload this page — you'll get the login screen. Full step-by-step is in <code>README.md</code>." })),
    el("p", { class: "muted", style: "margin-bottom:6px" }, "Your config will look like:"),
    el("pre", {}, example));
  root.append(el("div", { class: "config-screen" },
    el("div", { class: "login-brand", style: "justify-content:center;margin-bottom:18px" },
      el("div", { class: "mark", style: "font-size:30px" }, "📦"),
      el("div", { class: "name", style: "font-family:Sora;font-weight:800;font-size:20px" }, "Jimbo Business Tracker")),
    card));
}
