// Small shared helpers: formatting, dates, DOM, item-name normalisation.

// ---------- currency / numbers ----------
export const fmtGBP = (n, opts = {}) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP",
    minimumFractionDigits: opts.dp ?? 2, maximumFractionDigits: opts.dp ?? 2,
  }).format(v);
};
// Compact for axis ticks: £1.2k
export const fmtGBPk = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) return "£" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return "£" + v.toFixed(0);
};
export const fmtPct = (n, dp = 1) => `${(Number(n) || 0).toFixed(dp)}%`;
export const fmtNum = (n) => new Intl.NumberFormat("en-GB").format(Number(n) || 0);

// ---------- dates ----------
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const parseISO = (s) => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const monthKey = (iso) => (iso || "").slice(0, 7); // YYYY-MM
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
};
export const fmtDate = (iso) => {
  const d = parseISO(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const addDays = (iso, n) => {
  const d = parseISO(iso); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const startOfMonthISO = (iso) => (iso || todayISO()).slice(0, 7) + "-01";
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

// UK tax year containing a date: 6 Apr YYYY → 5 Apr YYYY+1
export const ukTaxYearOf = (iso) => {
  const d = parseISO(iso);
  const y = d.getFullYear();
  const beforeApr6 = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6);
  const startYear = beforeApr6 ? y - 1 : y;
  return {
    key: `${startYear}/${startYear + 1}`,
    start: `${startYear}-04-06`,
    end: `${startYear + 1}-04-05`,
    label: `6 Apr ${startYear} – 5 Apr ${startYear + 1}`,
  };
};

// ---------- item-name normalisation (for grouping a messy product list) ----------
const WORD_FIX = {
  boomark: "Bookmark", boookmark: "Bookmark", bookmark: "Bookmark",
  micheal: "Michael", myres: "Myers", vorhees: "Voorhees",
  topper: "Topper", keychain: "Keychain", coaster: "Coaster",
  balisong: "Balisong", filament: "Filament",
};
export function normaliseItem(raw) {
  let s = (raw || "").trim().replace(/\s+/g, " ");
  if (!s) return "Unknown";
  // collapse "(x5)" / trailing counts for grouping
  const words = s.split(" ").map((w) => {
    const low = w.toLowerCase().replace(/[^a-z]/g, "");
    if (WORD_FIX[low]) return WORD_FIX[low];
    return w;
  });
  return words.join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export const groupKey = (raw) => normaliseItem(raw).toLowerCase();

// Rows that are not real product sales (stall fees, freebies, card flips).
export const isPitchFee = (item) => /pitch\s*fee/i.test(item || "");
export const isNonProductRow = (item) =>
  isPitchFee(item) || /pokemon|£\d+\s*cards/i.test(item || "");

// ---------- DOM helpers ----------
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
export const clear = (node) => { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
export const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const debounce = (fn, ms = 200) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
export const uid = () => "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);

// platform palette (also used by charts)
export const PLATFORM_COLORS = {
  eBay: "#f5af19", Vinted: "#36d399", Bootsale: "#c47bff", Etsy: "#ff7a59", Other: "#7d8aa8",
};
export const PLATFORMS = ["eBay", "Vinted", "Bootsale", "Etsy", "Other"];
export const STATUSES = ["Delivered", "Dispatched", "Packed", "Cancelled"];
export const EXPENSE_CATEGORIES = ["Equipment", "Filament", "Packaging", "Accessories", "Tools", "Software", "Wages", "Other"];
export const CATEGORY_COLORS = {
  Equipment: "#6ea8fe", Filament: "#c47bff", Packaging: "#45d0e6", Accessories: "#ffc35a",
  Tools: "#ff7a59", Software: "#36d399", Wages: "#ff6b81", Other: "#7d8aa8",
};

// ---------- toasts ----------
export function toast(msg, kind = "ok") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const t = el("div", { class: `toast ${kind}` }, msg);
  root.append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2600);
  setTimeout(() => t.remove(), 2950);
}
