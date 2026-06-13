// App shell: sidebar nav + topbar + content host.
import { el, clear } from "./utils.js";
import { logout } from "./auth.js";

export const NAV = [
  { group: "Track" },
  { route: "overview", label: "Overview", ico: "📊" },
  { route: "sales", label: "Sales", ico: "🧾" },
  { route: "expenses", label: "Expenses", ico: "💸" },
  { group: "Analyse" },
  { route: "insights", label: "Smart Insights", ico: "💡" },
  { route: "filament", label: "Filament", ico: "🧵" },
  { route: "goals", label: "Goals", ico: "🎯" },
  { route: "tax", label: "Tax Year", ico: "🇬🇧" },
];

let contentEl = null, headerTitleEl = null, headerSubEl = null, headerActionsEl = null, sidebarEl = null;

export function mountShell(root, user) {
  clear(root);

  // ----- sidebar -----
  const nav = el("nav", { class: "sidebar", id: "sidebar" });
  nav.append(el("div", { class: "brand" },
    el("div", { class: "mark" }, "📦"),
    el("div", {},
      el("div", { class: "name", html: "<span>Jimbo</span> Tracker" }),
      el("div", { class: "tag" }, "Business HQ"))));

  for (const item of NAV) {
    if (item.group) { nav.append(el("div", { class: "nav-label" }, item.group)); continue; }
    const a = el("a", { class: "nav-item", href: `#/${item.route}`, dataset: { route: item.route } },
      el("span", { class: "ico" }, item.ico), el("span", {}, item.label));
    nav.append(a);
  }
  nav.append(el("div", { class: "spacer" }));
  nav.append(el("a", { class: "nav-item", href: "#/settings", dataset: { route: "settings" } },
    el("span", { class: "ico" }, "⚙️"), el("span", {}, "Settings")));

  const avatar = (user.email || "?").slice(0, 1).toUpperCase();
  const chip = el("div", { class: "user-chip" },
    el("div", { class: "avatar" }, avatar),
    el("div", { class: "email", title: user.email }, user.email),
    el("button", { class: "btn icon ghost", title: "Sign out", onclick: () => logout() }, "⎋"));
  nav.append(chip);
  sidebarEl = nav;

  // ----- main -----
  const menuBtn = el("button", { class: "btn icon menu-btn", onclick: toggleSidebar }, "☰");
  headerTitleEl = el("div", { class: "page-title" }, "");
  headerSubEl = el("div", { class: "page-sub" }, "");
  headerActionsEl = el("div", { class: "filterbar", id: "header-actions" });
  const topbar = el("div", { class: "topbar" },
    menuBtn,
    el("div", {}, headerTitleEl, headerSubEl),
    el("div", { class: "spacer" }),
    headerActionsEl);
  contentEl = el("div", { class: "content", id: "content" });
  const main = el("main", { class: "main" }, topbar, contentEl);

  root.append(el("div", { class: "shell" }, nav, main));
}

export function toggleSidebar() {
  if (!sidebarEl) return;
  const open = sidebarEl.classList.toggle("open");
  let scrim = document.querySelector(".scrim");
  if (open && !scrim) {
    scrim = el("div", { class: "scrim", onclick: toggleSidebar });
    document.body.append(scrim);
  } else if (!open && scrim) scrim.remove();
}

export const getContentEl = () => contentEl;
export const getHeaderActions = () => clear(headerActionsEl);
export function setHeader(title, sub) {
  if (headerTitleEl) headerTitleEl.textContent = title || "";
  if (headerSubEl) headerSubEl.textContent = sub || "";
}
export function setActiveNav(route) {
  if (!sidebarEl) return;
  sidebarEl.querySelectorAll(".nav-item").forEach((a) =>
    a.classList.toggle("active", a.dataset.route === route));
  // close mobile drawer on navigate
  if (sidebarEl.classList.contains("open")) toggleSidebar();
}
