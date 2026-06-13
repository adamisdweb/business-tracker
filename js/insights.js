// ===========================================================================
//  SMART INSIGHTS ENGINE  (bonus feature #1)
//  Turns the raw rows into a product catalogue, platform comparison and a set
//  of plain-English findings shown as insight cards.
// ===========================================================================
import { normaliseItem, groupKey, isPitchFee, isNonProductRow, fmtGBP, fmtPct, MONTHS } from "./utils.js";
import { saleProfit, byPlatform, monthlySeries, sum } from "./finance.js";

// Build a normalised product catalogue from sales rows.
export function productCatalog(sales) {
  const map = new Map();
  for (const s of sales) {
    if (isNonProductRow(s.item)) continue;
    const k = groupKey(s.item);
    if (!map.has(k)) map.set(k, { name: normaliseItem(s.item), units: 0, revenue: 0, profit: 0 });
    const row = map.get(k);
    row.units += 1;
    row.revenue += Number(s.revenue) || 0;
    row.profit += saleProfit(s);
  }
  return [...map.values()].map((r) => ({
    ...r,
    margin: r.revenue ? (r.profit / r.revenue) * 100 : 0,
    profitPerUnit: r.units ? r.profit / r.units : 0,
  }));
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function buildInsights(sales, expenses, summary) {
  const out = [];
  const realSales = sales.filter((s) => !isNonProductRow(s.item) && (Number(s.revenue) || 0) > 0);
  if (realSales.length < 3) {
    out.push({ kind: "info", icon: "🌱", title: "Building up your data",
      text: "Add a few more sales and expenses and this page will fill with tailored insights about your best products, platforms and timing." });
    return { insights: out, catalog: productCatalog(sales) };
  }

  const catalog = productCatalog(sales).sort((a, b) => b.profit - a.profit);

  // 1. Top profit driver
  const top = catalog[0];
  if (top) out.push({ kind: "good", icon: "🏆", title: "Your biggest earner",
    text: `<b>${top.name}</b> has brought in <b>${fmtGBP(top.profit)}</b> profit across <b>${top.units}</b> sales — that's ${fmtPct(top.profit / summary.grossProfit * 100, 0)} of all your gross profit.` });

  // 2. Best margin product (min 3 units)
  const byMargin = catalog.filter((c) => c.units >= 3).sort((a, b) => b.margin - a.margin);
  if (byMargin[0]) out.push({ kind: "good", icon: "💎", title: "Highest-margin product",
    text: `<b>${byMargin[0].name}</b> runs at a <b>${fmtPct(byMargin[0].margin)}</b> margin — your most efficient item. Lean into these for the best return on filament.` });

  // 3. Low-margin warning
  const lowMargin = catalog.filter((c) => c.units >= 3 && c.margin < 60).sort((a, b) => a.margin - b.margin);
  if (lowMargin[0]) out.push({ kind: "warn", icon: "⚠️", title: "Thin margins here",
    text: `<b>${lowMargin[0].name}</b> only returns <b>${fmtPct(lowMargin[0].margin)}</b> margin (${fmtGBP(lowMargin[0].profitPerUnit)}/sale). Worth raising the price or trimming its landing cost.` });

  // 4. Platform comparison
  const plats = byPlatform(realSales).filter((p) => p.orders > 0);
  if (plats.length >= 2) {
    const bestRev = plats[0];
    const bestMargin = [...plats].sort((a, b) => b.margin - a.margin)[0];
    out.push({ kind: "info", icon: "🛒", title: "Where you sell best",
      text: `<b>${bestRev.platform}</b> is your top channel by revenue (<b>${fmtGBP(bestRev.revenue)}</b> over ${bestRev.orders} orders). <b>${bestMargin.platform}</b> gives the fattest margin at <b>${fmtPct(bestMargin.margin)}</b>.` });
  }

  // 5. Pitch-fee impact (car-boot)
  const pitchFees = sum(sales.filter((s) => isPitchFee(s.item)), (s) => s.landingCost || Math.abs(saleProfit(s)));
  if (pitchFees > 0) {
    const boot = byPlatform(sales.filter((s) => s.platform === "Bootsale"));
    const bootProfit = boot[0]?.profit ?? 0;
    out.push({ kind: "warn", icon: "🎪", title: "Pitch fees are eating in",
      text: `You've paid <b>${fmtGBP(pitchFees)}</b> in car-boot pitch fees. They drag your Bootsale net down — net Bootsale profit after fees is <b>${fmtGBP(bootProfit)}</b>. Make sure each stall clears its pitch.` });
  }

  // 6. Best day of week
  const dow = Array(7).fill(0);
  for (const s of realSales) dow[new Date(s.date).getDay()] += Number(s.revenue) || 0;
  const bestDow = dow.indexOf(Math.max(...dow));
  if (Math.max(...dow) > 0) out.push({ kind: "info", icon: "📅", title: "Your strongest day",
    text: `<b>${DOW[bestDow]}</b> is your best sales day by revenue. Time new listings and restocks to land just before it.` });

  // 7. Month-on-month trend
  const ms = monthlySeries(realSales, []);
  if (ms.length >= 2) {
    const last = ms[ms.length - 1], prev = ms[ms.length - 2];
    const chg = prev.revenue ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0;
    const up = chg >= 0;
    out.push({ kind: up ? "good" : "warn", icon: up ? "📈" : "📉",
      title: up ? "Revenue is climbing" : "Revenue dipped",
      text: `${last.label} revenue is <b>${fmtPct(Math.abs(chg), 0)}</b> ${up ? "up on" : "down on"} ${prev.label} (${fmtGBP(last.revenue)} vs ${fmtGBP(prev.revenue)}).` });
  }

  // 8. Loss-making sales
  const losses = realSales.filter((s) => saleProfit(s) < 0);
  if (losses.length) out.push({ kind: "bad", icon: "🩹", title: "A few sales lost money",
    text: `<b>${losses.length}</b> ${losses.length === 1 ? "sale" : "sales"} sold at a loss (landing cost above revenue). Check pricing on small items like bookmarks where postage can swallow the margin.` });

  return { insights: out, catalog };
}
