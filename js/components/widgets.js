// Small presentational helpers shared across pages.
import { el, fmtGBP, fmtPct } from "../utils.js";

export function statCard({ label, ico, value, accent = "blue", delta, deltaDir, sub }) {
  const card = el("div", { class: `stat accent-${accent}` });
  card.append(el("div", { class: "label" }, ico ? el("span", { class: "ico" }, ico) : "", label));
  card.append(el("div", { class: "value" }, value));
  if (delta != null) {
    const dir = deltaDir || (typeof delta === "number" ? (delta > 0 ? "up" : delta < 0 ? "down" : "flat") : "flat");
    const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "•";
    card.append(el("div", { class: `delta ${dir}` }, `${arrow} ${typeof delta === "number" ? fmtPct(Math.abs(delta), 1) : delta}`));
  } else if (sub) {
    card.append(el("div", { class: "delta flat" }, sub));
  }
  return card;
}

export function sectionHead(title, hint, action) {
  const head = el("div", { class: "section-head" }, el("h2", {}, title));
  if (hint) head.append(el("div", { class: "hint" }, hint));
  if (action) head.append(action);
  return head;
}

export function emptyState(icon, title, text, action) {
  const c = el("div", { class: "card pad", style: "text-align:center;padding:48px 24px" },
    el("div", { style: "font-size:42px;margin-bottom:10px" }, icon),
    el("h3", { style: "margin-bottom:6px" }, title),
    el("p", { class: "muted", style: "max-width:440px;margin:0 auto 16px" }, text));
  if (action) c.append(action);
  return c;
}

export function rankList(items, { valueFmt = fmtGBP } = {}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const list = el("div", { class: "rank-list" });
  items.forEach((it, i) => {
    const row = el("div", { class: "rank-row" },
      el("div", { class: "rk" + (i === 0 ? " top" : "") }, String(i + 1)),
      el("div", { class: "rname", title: it.name }, it.name),
      el("div", { class: "rbar" }, el("i", { style: `width:${Math.max(4, (Math.abs(it.value) / max) * 100)}%` })),
      el("div", { class: "rval" }, valueFmt(it.value)));
    list.append(row);
  });
  return list;
}

// SVG progress ring. pct 0..(can exceed 100, clamped visual)
export function progressRing(pct, { color = "var(--accent)", label = "" } = {}) {
  const r = 54, circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circ * (1 - clamped / 100);
  const wrap = el("div", { class: "ring" });
  wrap.style.setProperty("--col", color);
  wrap.innerHTML = `
    <svg width="132" height="132" viewBox="0 0 132 132">
      <circle class="ring-bg" cx="66" cy="66" r="${r}"></circle>
      <circle class="ring-fg" cx="66" cy="66" r="${r}"
        stroke-dasharray="${circ}" stroke-dashoffset="${circ}"></circle>
    </svg>
    <div class="ring-mid"><div class="pp">${Math.round(pct)}%</div><div class="pl">${label}</div></div>`;
  // animate in
  requestAnimationFrame(() => {
    const fg = wrap.querySelector(".ring-fg");
    if (fg) fg.style.strokeDashoffset = String(offset);
  });
  return wrap;
}

export const platformBadge = (p) =>
  el("span", { class: `badge platform-${p || "Other"}` }, el("span", { class: "dot" }), p || "Other");
export const statusBadge = (s) => el("span", { class: `badge status-${s || "Delivered"}` }, s || "—");
export const catBadge = (c) => el("span", { class: "badge cat" }, c || "Other");
