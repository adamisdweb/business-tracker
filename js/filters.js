// Global filter state shared across pages (date range, platforms, status).
import { PLATFORMS, todayISO } from "./utils.js";

const listeners = new Set();

export const filters = {
  preset: "all",                       // all | 30d | 90d | mtd | ytd | tax | custom
  range: { start: null, end: null },
  platforms: new Set(PLATFORMS),       // all on by default
  // Count every row by default — pitch fees & cancelled orders are real costs.
  excludeCancelled: false,
};

export function onFilterChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { for (const fn of listeners) fn(filters); }

export function setPreset(preset) {
  filters.preset = preset;
  const today = todayISO();
  const d = new Date();
  if (preset === "all") filters.range = { start: null, end: null };
  else if (preset === "7d") filters.range = { start: shift(today, -6), end: today };
  else if (preset === "30d") filters.range = { start: shift(today, -29), end: today };
  else if (preset === "90d") filters.range = { start: shift(today, -89), end: today };
  else if (preset === "mtd") filters.range = { start: today.slice(0, 7) + "-01", end: today };
  else if (preset === "ytd") filters.range = { start: `${d.getFullYear()}-01-01`, end: today };
  else if (preset === "tax") {
    const beforeApr6 = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6);
    const sy = beforeApr6 ? d.getFullYear() - 1 : d.getFullYear();
    filters.range = { start: `${sy}-04-06`, end: `${sy + 1}-04-05` };
  }
  notify();
}
export function setCustomRange(start, end) {
  filters.preset = "custom";
  filters.range = { start: start || null, end: end || null };
  notify();
}
export function togglePlatform(p) {
  if (filters.platforms.has(p)) filters.platforms.delete(p);
  else filters.platforms.add(p);
  if (filters.platforms.size === 0) filters.platforms.add(p); // never empty
  notify();
}
export function setAllPlatforms(on) {
  filters.platforms = on ? new Set(PLATFORMS) : new Set([PLATFORMS[0]]);
  notify();
}
export function setExcludeCancelled(v) { filters.excludeCancelled = v; notify(); }

function shift(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.toISOString().slice(0, 10);
}

export const PRESETS = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "mtd", label: "This month" },
  { key: "ytd", label: "This year" },
  { key: "tax", label: "Tax year" },
];
