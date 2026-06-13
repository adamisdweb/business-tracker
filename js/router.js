// Hash router. Re-renders the active page on navigation, data change, or
// filter change. Pages export `{ title, sub, render(ctx) }`.
import { getContentEl, getHeaderActions, setHeader, setActiveNav } from "./layout.js";
import { getState, subscribe, isReady } from "./store.js";
import { onFilterChange } from "./filters.js";
import { destroyAll } from "./charts.js";
import { clear, el } from "./utils.js";

import overview from "./pages/overview.js";
import sales from "./pages/sales.js";
import expenses from "./pages/expenses.js";
import insights from "./pages/insights.js";
import filament from "./pages/filament.js";
import goals from "./pages/goals.js";
import tax from "./pages/tax.js";
import settings from "./pages/settings.js";

const PAGES = { overview, sales, expenses, insights, filament, goals, tax, settings };
let started = false;
let rafPending = false;

function currentRoute() {
  const r = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
  return PAGES[r] ? r : "overview";
}

function render() {
  const route = currentRoute();
  const page = PAGES[route];
  setActiveNav(route);
  setHeader(page.title, typeof page.sub === "function" ? page.sub(getState()) : page.sub);

  const content = getContentEl();
  const header = getHeaderActions();
  if (!content) return;
  destroyAll();
  clear(content);

  if (!isReady()) {
    content.append(el("div", { class: "boot-splash", style: "min-height:50vh" },
      el("div", { class: "boot-logo" }, "📦"), el("div", { class: "boot-text" }, "Syncing your data…")));
    return;
  }

  const ctx = { content, header, state: getState() };
  try { page.render(ctx); }
  catch (e) {
    console.error("page render error", e);
    content.append(el("div", { class: "card pad" },
      el("h3", {}, "Something went wrong rendering this page"),
      el("pre", { style: "white-space:pre-wrap;color:#ff9eb0;font-size:12px" }, String(e && e.stack || e))));
  }
}

// Batch re-renders triggered by rapid Firestore snapshots.
function scheduleRender() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; render(); });
}

export function startRouter() {
  if (!started) {
    window.addEventListener("hashchange", render);
    subscribe(scheduleRender);
    onFilterChange(scheduleRender);
    started = true;
  }
  if (!location.hash) location.hash = "#/overview";
  render();
}
