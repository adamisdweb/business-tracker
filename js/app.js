// Bootstrap: decide between config screen / login / app, and wire auth → store.
import { isConfigured } from "./firebase.js";
import { renderLogin, renderConfigScreen } from "./login.js";

const root = document.getElementById("app");

async function boot() {
  if (!isConfigured) { renderConfigScreen(root); return; }

  // Only import auth/store once we know Firebase initialised.
  const { onAuth } = await import("./auth.js");
  const { attach, detach } = await import("./store.js");
  const { mountShell } = await import("./layout.js");
  const { startRouter } = await import("./router.js");

  let shellUid = null;
  onAuth((user) => {
    if (user) {
      if (shellUid !== user.uid) {
        attach(user.uid);
        mountShell(root, user);
        shellUid = user.uid;
        startRouter();
      }
    } else {
      shellUid = null;
      detach();
      renderLogin(root);
    }
  });
}

boot().catch((e) => {
  console.error(e);
  root.innerHTML = `<div class="config-screen"><div class="card pad">
    <h2>⚠️ Couldn't start</h2>
    <p class="muted">${String(e && e.message || e)}</p>
    <p class="muted">Check <code>js/firebase-config.js</code> and your internet connection.</p></div></div>`;
});
