// OVERVIEW — the decorated stats dashboard.
import { el, fmtGBP, fmtPct, fmtNum, PLATFORM_COLORS, PLATFORMS, toast } from "../utils.js";
import { filterSales, filterByDate, summarise, monthlySeries, byPlatform, saleProfit } from "../finance.js";
import { productCatalog } from "../insights.js";
import { filters } from "../filters.js";
import { filterBar } from "../components/filterbar.js";
import { statCard, sectionHead, rankList, emptyState } from "../components/widgets.js";
import { trendChart, doughnutChart, stackedPlatformChart } from "../charts.js";
import { importSeed } from "../store.js";
import { openSaleForm, openExpenseForm } from "../components/forms.js";

export default {
  title: "Overview",
  sub: "Your business at a glance",
  render(ctx) {
    const { content, header, state } = ctx;

    // header actions
    header.append(filterBar());
    const actions = el("div", { class: "chip-group" },
      el("button", { class: "btn sm", onclick: () => openExpenseForm() }, "＋ Expense"),
      el("button", { class: "btn sm primary", onclick: () => openSaleForm() }, "＋ Sale"));
    header.append(actions);

    // empty / first run
    if (state.sales.length === 0 && state.expenses.length === 0 && !state.seeded) {
      const importBtn = el("button", { class: "btn primary", onclick: async () => {
        importBtn.disabled = true; importBtn.textContent = "Importing…";
        try { await importSeed(); toast("Imported your spreadsheet data 🎉"); }
        catch (e) { console.error(e); toast("Import failed — " + (e.message || e), "err"); importBtn.disabled = false; importBtn.textContent = "Import my spreadsheet data"; }
      } }, "Import my spreadsheet data");
      content.append(emptyState("📦", "Welcome to your tracker",
        "Bring in everything from your Business Tracker spreadsheet (464 sales + 54 expenses), or start fresh by adding your first sale.", importBtn));
      return;
    }

    // ----- filtered datasets -----
    const sales = filterSales(state.sales, filters);
    const expenses = filterByDate(state.expenses, filters.range);
    const sum = summarise(sales, expenses);

    // ===== HERO: net profit + breakdown =====
    const hero = el("div", { class: "hero" },
      el("div", { class: "glow a" }), el("div", { class: "glow b" }),
      el("div", { class: "eyebrow" }, "True net profit" + (filters.preset !== "all" ? " · " + rangeLabel() : "")),
      el("div", { class: "big" + (sum.netProfit < 0 ? " neg" : "") }, fmtGBP(sum.netProfit)),
      el("div", { class: "muted", style: "position:relative;font-size:13px" },
        "Gross profit − expenses (filament excluded, so it's never double-counted)"),
      el("div", { class: "row" },
        heroItem("Revenue", fmtGBP(sum.revenue)),
        heroItem("Gross profit", fmtGBP(sum.grossProfit), "pos"),
        heroItem("Expenses (excl. filament)", fmtGBP(sum.nonFilamentExpenses), "negv"),
        heroItem("Avg margin", fmtPct(sum.avgMargin))));

    // breakdown card (waterfall list)
    const breakdown = el("div", { class: "card pad" },
      el("h3", { style: "font-size:15px;margin-bottom:10px" }, "How net profit is built"),
      el("div", { class: "breakdown" },
        bRow("💰", "Revenue", `${sum.orders} orders`, sum.revenue, "pos"),
        bRow("🧵", "− Landing cost", "per-sale cost of goods (mostly filament)", -sum.landingCost, "neg"),
        bRow("📈", "= Gross profit", fmtPct(sum.avgMargin) + " margin", sum.grossProfit, sum.grossProfit >= 0 ? "pos" : "neg"),
        bRow("💸", "− Expenses excl. filament", "equipment, packaging, wages…", -sum.nonFilamentExpenses, "neg"),
        bRowTotal("Net profit", sum.netProfit)),
      el("div", { class: "note-box", style: "margin-top:14px" },
        el("span", { html: `Your filament purchases of <b>${fmtGBP(sum.filamentSpend)}</b> in this range are tracked under <a href="#/filament">Filament</a> — not subtracted here, because landing cost already covers filament used.` })));

    content.append(el("div", { class: "grid cols-2 page-section" }, hero, breakdown));

    // ===== KPI ROW =====
    const prevSum = previousPeriodSummary(state);
    const kpis = el("div", { class: "grid kpis page-section" },
      statCard({ label: "Revenue", ico: "💷", value: fmtGBP(sum.revenue), accent: "blue", delta: prevSum ? pctChange(sum.revenue, prevSum.revenue) : undefined, sub: prevSum ? undefined : `${fmtNum(sum.orders)} orders` }),
      statCard({ label: "Gross profit", ico: "📈", value: fmtGBP(sum.grossProfit), accent: "green", delta: prevSum ? pctChange(sum.grossProfit, prevSum.grossProfit) : undefined }),
      statCard({ label: "Net profit", ico: "✅", value: fmtGBP(sum.netProfit), accent: sum.netProfit >= 0 ? "purple" : "red", delta: prevSum ? pctChange(sum.netProfit, prevSum.netProfit) : undefined }),
      statCard({ label: "Orders", ico: "📦", value: fmtNum(sum.orders), accent: "amber", sub: `Avg ${fmtGBP(sum.avgOrder)}/order` }),
      statCard({ label: "Avg margin", ico: "🎯", value: fmtPct(sum.avgMargin), accent: "green", sub: "across all sales" }));
    content.append(kpis);

    // ===== TREND CHART =====
    const series = monthlySeries(sales, expenses).map((m) => ({ ...m, label: shortMonth(m.key) }));
    const trendCanvas = el("canvas");
    const trendCard = el("div", { class: "card chart-card" },
      el("div", { class: "chart-head" },
        el("h3", {}, "Revenue & profit over time"),
        el("div", { class: "legend" },
          legendItem("#6ea8fe", "Revenue"), legendItem("#36d399", "Gross profit"), legendItem("#c47bff", "Net profit"))),
      el("div", { class: "chart-wrap lg" }, trendCanvas));
    content.append(el("div", { class: "page-section" }, trendCard));

    // ===== SPLIT: platform doughnut + monthly stacked =====
    const plats = byPlatform(sales);
    const dCanvas = el("canvas");
    const platformCard = el("div", { class: "card chart-card" },
      el("div", { class: "chart-head" }, el("h3", {}, "Revenue by platform")),
      el("div", { class: "chart-wrap" }, dCanvas),
      el("div", { class: "legend", style: "margin-top:12px;justify-content:center" },
        ...plats.map((p) => legendItem(PLATFORM_COLORS[p.platform] || "#7d8aa8", `${p.platform} · ${fmtGBP(p.revenue)}`))));

    const stackCanvas = el("canvas");
    const stackCard = el("div", { class: "card chart-card" },
      el("div", { class: "chart-head" }, el("h3", {}, "Monthly revenue by platform")),
      el("div", { class: "chart-wrap" }, stackCanvas));

    content.append(el("div", { class: "grid cols-2 page-section" }, platformCard, stackCard));

    // ===== top products + platform table =====
    const catalog = productCatalog(sales).sort((a, b) => b.profit - a.profit).slice(0, 8);
    const topCard = el("div", { class: "card pad" },
      sectionHead("Top products by profit", `${catalog.length ? "" : "No products yet"}`),
      rankList(catalog.map((c) => ({ name: c.name, value: c.profit }))));

    const platTable = el("div", { class: "card pad" },
      sectionHead("Platform performance"),
      platformTable(plats));

    content.append(el("div", { class: "grid cols-2 page-section" }, topCard, platTable));

    // draw charts after in DOM
    requestAnimationFrame(() => {
      if (series.length) trendChart(trendCanvas, series);
      if (plats.length) doughnutChart(dCanvas, plats.map((p) => p.platform), plats.map((p) => p.revenue), plats.map((p) => PLATFORM_COLORS[p.platform] || "#7d8aa8"));
      drawStacked(stackCanvas, sales);
    });
  },
};

// ---------- helpers ----------
function heroItem(k, v, cls) { return el("div", { class: "item" }, el("div", { class: "k" }, k), el("div", { class: "v " + (cls || "") }, v)); }
function bRow(ico, label, desc, amt, cls) {
  return el("div", { class: "b-row" },
    el("div", { class: "bar-ico", style: "background:var(--surface-2)" }, ico),
    el("div", { class: "b-label" }, el("div", { class: "t" }, label), el("div", { class: "d" }, desc)),
    el("div", { class: "b-amt " + (cls || "") }, (amt < 0 ? "−" : "") + fmtGBP(Math.abs(amt))));
}
function bRowTotal(label, amt) {
  return el("div", { class: "b-row total" },
    el("div", { class: "bar-ico", style: "background:var(--grad)" }, "🏁"),
    el("div", { class: "b-label" }, el("div", { class: "t" }, label)),
    el("div", { class: "b-amt " + (amt >= 0 ? "pos" : "neg") }, fmtGBP(amt)));
}
function legendItem(color, label) {
  return el("div", { class: "li" }, el("span", { class: "sw", style: `background:${color}` }), label);
}
function platformTable(plats) {
  const t = el("table", { class: "data" });
  t.innerHTML = "<thead><tr><th>Platform</th><th class='num'>Orders</th><th class='num'>Revenue</th><th class='num'>Profit</th><th class='num'>Margin</th></tr></thead>";
  const tb = el("tbody");
  for (const p of plats) {
    tb.append(el("tr", {},
      el("td", {}, el("span", { class: `badge platform-${p.platform}` }, el("span", { class: "dot" }), p.platform)),
      el("td", { class: "num" }, fmtNum(p.orders)),
      el("td", { class: "num" }, fmtGBP(p.revenue)),
      el("td", { class: "num pos-num" }, fmtGBP(p.profit)),
      el("td", { class: "num" }, fmtPct(p.margin))));
  }
  if (!plats.length) tb.append(el("tr", { class: "empty-row" }, el("td", { colspan: "5" }, "No sales in range")));
  t.append(tb);
  return el("div", { class: "table-wrap" }, t);
}
function drawStacked(canvas, sales) {
  const months = [...new Set(sales.map((s) => (s.date || "").slice(0, 7)).filter(Boolean))].sort();
  if (!months.length) return;
  const datasets = PLATFORMS.map((p) => ({
    label: p,
    data: months.map((m) => sales.filter((s) => s.platform === p && (s.date || "").startsWith(m)).reduce((a, s) => a + (Number(s.revenue) || 0), 0)),
    backgroundColor: PLATFORM_COLORS[p], borderRadius: 4, stack: "rev",
  })).filter((d) => d.data.some((v) => v > 0));
  stackedPlatformChart(canvas, months.map(shortMonth), datasets);
}
const shortMonth = (key) => { const [y, m] = key.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][(+m) - 1] + " " + y.slice(2); };
const pctChange = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
function rangeLabel() {
  const r = filters.range;
  return (r.start || "…") + " → " + (r.end || "…");
}
// Previous comparable period (only for fixed-length presets)
function previousPeriodSummary(state) {
  const r = filters.range;
  if (!r.start || !r.end) return null;
  const len = (new Date(r.end) - new Date(r.start)) / 86400000;
  if (len <= 0) return null;
  const prevEnd = new Date(new Date(r.start) - 86400000).toISOString().slice(0, 10);
  const prevStart = new Date(new Date(r.start) - (len + 1) * 86400000).toISOString().slice(0, 10);
  const range = { start: prevStart, end: prevEnd };
  const sales = filterSales(state.sales, { ...filters, range });
  const expenses = filterByDate(state.expenses, range);
  return summarise(sales, expenses);
}
