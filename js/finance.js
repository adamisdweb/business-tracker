// ===========================================================================
//  FINANCE ENGINE
//  The single source of truth for every money calculation in the app.
//
//  THE GOLDEN RULE (anti double-counting):
//  ----------------------------------------------------------------------
//  • Each sale's `landingCost` already represents the FILAMENT consumed by
//    that item. Summed across sales, that IS the cost of filament used.
//  • The Expenses sheet ALSO contains "Filament" rows — but those are
//    filament you BOUGHT (inventory), not filament consumed per sale.
//  • Counting both would subtract filament twice. So:
//
//        Net Profit = (Revenue − Landing Cost) − Expenses EXCLUDING Filament
//
//    Filament is expensed through landing cost as it is used; the Filament
//    expense category is tracked for cash-flow / inventory only.
//  ----------------------------------------------------------------------
// ===========================================================================
import { sum, isPitchFee } from "./utils.js";
export { sum } from "./utils.js"; // re-export so pages can pull it from finance

export const saleProfit = (s) => (Number(s.revenue) || 0) - (Number(s.landingCost) || 0);
export const saleMargin = (s) => {
  const r = Number(s.revenue) || 0;
  return r > 0 ? (saleProfit(s) / r) * 100 : 0;
};

// Filter helpers -----------------------------------------------------------
export function filterByDate(rows, range) {
  if (!range || (!range.start && !range.end)) return rows;
  return rows.filter((r) => {
    if (range.start && r.date < range.start) return false;
    if (range.end && r.date > range.end) return false;
    return true;
  });
}
export function filterSales(sales, f = {}) {
  let out = sales;
  out = filterByDate(out, f.range);
  if (f.platforms && f.platforms.size) out = out.filter((s) => f.platforms.has(s.platform));
  if (f.excludeCancelled) out = out.filter((s) => s.status !== "Cancelled");
  return out;
}

// Core summary over a set of sales + expenses ------------------------------
export function summarise(sales, expenses) {
  const revenue = sum(sales, (s) => s.revenue);
  const landingCost = sum(sales, (s) => s.landingCost);
  const grossProfit = revenue - landingCost;               // = Σ sale profit
  const orders = sales.filter((s) => (Number(s.revenue) || 0) > 0).length;

  const expensesTotal = sum(expenses, (e) => e.amount);
  const filamentSpend = sum(expenses.filter((e) => e.category === "Filament"), (e) => e.amount);
  const nonFilamentExpenses = expensesTotal - filamentSpend;

  // The headline number — filament NOT subtracted twice.
  const netProfit = grossProfit - nonFilamentExpenses;

  return {
    revenue, landingCost, grossProfit, orders,
    avgOrder: orders ? revenue / orders : 0,
    avgMargin: revenue ? (grossProfit / revenue) * 100 : 0,
    expensesTotal, filamentSpend, nonFilamentExpenses, netProfit,
  };
}

// Group helpers ------------------------------------------------------------
export function groupBy(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

export function byPlatform(sales) {
  const map = groupBy(sales, (s) => s.platform || "Other");
  return [...map.entries()].map(([platform, rows]) => ({
    platform,
    revenue: sum(rows, (s) => s.revenue),
    profit: sum(rows, (s) => saleProfit(s)),
    orders: rows.filter((s) => (Number(s.revenue) || 0) > 0).length,
    margin: sum(rows, (s) => s.revenue) ? (sum(rows, (s) => saleProfit(s)) / sum(rows, (s) => s.revenue)) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

// Time series by month (revenue, profit, expenses, net) --------------------
export function monthlySeries(sales, expenses) {
  const map = new Map();
  const touch = (k) => { if (!map.has(k)) map.set(k, { key: k, revenue: 0, grossProfit: 0, expenses: 0, filament: 0 }); return map.get(k); };
  for (const s of sales) {
    const m = touch((s.date || "").slice(0, 7));
    m.revenue += Number(s.revenue) || 0;
    m.grossProfit += saleProfit(s);
  }
  for (const e of expenses) {
    const m = touch((e.date || "").slice(0, 7));
    m.expenses += Number(e.amount) || 0;
    if (e.category === "Filament") m.filament += Number(e.amount) || 0;
  }
  return [...map.values()]
    .filter((m) => m.key)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((m) => ({ ...m, net: m.grossProfit - (m.expenses - m.filament) }));
}

// Daily revenue series (for a sparkline / area chart) ----------------------
export function dailySeries(sales) {
  const map = groupBy(sales, (s) => s.date);
  return [...map.entries()]
    .map(([date, rows]) => ({ date, revenue: sum(rows, (s) => s.revenue), profit: sum(rows, (s) => saleProfit(s)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Filament: bought (expenses) vs used (landing cost, excluding pitch fees) --
export function filamentStats(sales, expenses, allExpenses) {
  const bought = sum((allExpenses || expenses).filter((e) => e.category === "Filament"), (e) => e.amount);
  const used = sum(sales.filter((s) => !isPitchFee(s.item)), (s) => s.landingCost);
  const remaining = bought - used;
  return { bought, used, remaining };
}
