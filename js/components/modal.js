// Reusable modal + confirm dialog.
import { el, clear } from "../utils.js";

let escHandler = null;

export function openModal({ title, body, footer, width }) {
  closeModal();
  const root = document.getElementById("modal-root");
  const modal = el("div", { class: "modal" });
  if (width) modal.style.width = `min(${width}px, 100%)`;

  const head = el("div", { class: "m-head" },
    el("h3", {}, title || ""),
    el("button", { class: "btn icon ghost", title: "Close", onclick: closeModal }, "✕"));
  const bodyEl = el("div", { class: "m-body" });
  if (body instanceof Node) bodyEl.append(body); else bodyEl.innerHTML = body || "";
  modal.append(head, bodyEl);
  if (footer) { const f = el("div", { class: "m-foot" }); footer.forEach((b) => f.append(b)); modal.append(f); }

  const overlay = el("div", { class: "modal-overlay", onclick: (e) => { if (e.target === overlay) closeModal(); } }, modal);
  clear(root).append(overlay);

  escHandler = (e) => { if (e.key === "Escape") closeModal(); };
  document.addEventListener("keydown", escHandler);
  // focus first field
  setTimeout(() => { const f = modal.querySelector("input,select,textarea,button.primary"); f?.focus(); }, 40);
  return { modal, body: bodyEl, close: closeModal };
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (root) clear(root);
  if (escHandler) { document.removeEventListener("keydown", escHandler); escHandler = null; }
}

export function confirmDialog({ title = "Are you sure?", message, confirmLabel = "Delete", danger = true }) {
  return new Promise((resolve) => {
    const cancel = el("button", { class: "btn ghost", onclick: () => { closeModal(); resolve(false); } }, "Cancel");
    const ok = el("button", { class: `btn ${danger ? "danger" : "primary"}`, onclick: () => { closeModal(); resolve(true); } }, confirmLabel);
    openModal({ title, body: el("p", { class: "muted", style: "margin:0;line-height:1.6" }, message || ""), footer: [cancel, ok], width: 440 });
  });
}
