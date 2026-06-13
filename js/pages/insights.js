// SMART INSIGHTS (bonus #1) — auto findings + product intelligence.
import { el, fmtGBP, fmtPct, fmtNum } from "../utils.js";
import { filterSales, filterByDate, summarise, byPlatform, saleProfit } from "../finance.js";
import { buildInsights, productCatalog } from "../insights.js";
import { filters } from "../filters.js";
import { filterBar } from "../components/filterbar.js";
import { sectionHead, rankList } from "../components/widgets.js";
import { dataTable } from "../components/table.js";
import { barChart } from "../charts.js";

let sortMode = "profit";

export default {
  title: "Smart Insights",
  sub: "What's working — and what isn't",
  render(ctx) {
    const { content, header, state } = ctx;
    header.append(filterBar());

    const sales = filterSales(state.sales, filters);
    const expenses = filterByDate(state.expenses, filters.range);
    const sum = summarise(sales, expenses);
    const { insights, catalog } = buildInsights(sales, expenses, sum);

    // insight cards
    content.append(sectionHead("Insights", "Generated from your data"));
    const grid = el("div", { class: "grid cols-2 page-section" });
    for (const it of insights) {
      grid.append(el("div", { class: "insight" },
        el("div", { class: `i-ico ${it.kind}` }, it.icon),
        el("div", { class: "i-body" }, el("div", { class: "i-title" }, it.title), el("div", { class: "i-text", html: it.text }))));
    }
    content.append(grid);

    // top products bar chart + best margin list
    const topProfit = [...catalog].sort((a, b) => b.profit - a.profit).slice(0, 10);
    const barCanvas = el("canvas");
    const barCard = el("div", { class: "card chart-card" },
      el("div", { class: "chart-head" }, el("h3", {}, "Top products by profit")),
      el("div", { class: "chart-wrap lg" }, barCanvas));
    const marginList = [...catalog].filter((c) => c.units >= 2).sort((a, b) => b.margin - a.margin).slice(0, 8);
    const marginCard = el("div", { class: "card pad" }, sectionHead("Best margins", "≥2 units"),
      rankList(marginList.map((c) => ({ name: c.name, value: c.margin })), { valueFmt: (v) => fmtPct(v) }));
    content.append(el("div", { class: "grid cols-2 page-section" }, barCard, marginCard));
    requestAnimationFrame(() => { if (topProfit.length) barChart(barCanvas, topProfit.map((c) => c.name), topProfit.map((c) => c.profit)); });

    // full product catalogue
    const tabBtn = (mode, label) => el("button", { class: sortMode === mode ? "active" : "", onclick: () => { sortMode = mode; redraw(); } }, label);
    const tabs = el("div", { class: "pill-tab" }, tabBtn("profit", "Profit"), tabBtn("revenue", "Revenue"), tabBtn("units", "Units"), tabBtn("margin", "Margin"));
    content.append(el("div", { class: "section-head" }, el("h2", {}, "Product catalogue"), tabs));
    const host = el("div"); content.append(host);

    const columns = [
      { key: "name", label: "Product", sortVal: (r) => r.name, render: (r) => el("span", { style: "font-weight:600" }, r.name) },
      { key: "units", label: "Units", num: true, sortVal: (r) => r.units, render: (r) => fmtNum(r.units) },
      { key: "revenue", label: "Revenue", num: true, sortVal: (r) => r.revenue, render: (r) => fmtGBP(r.revenue) },
      { key: "profit", label: "Profit", num: true, sortVal: (r) => r.profit, render: (r) => el("span", { class: "pos-num" }, fmtGBP(r.profit)) },
      { key: "profitPerUnit", label: "£/unit", num: true, sortVal: (r) => r.profitPerUnit, render: (r) => fmtGBP(r.profitPerUnit) },
      { key: "margin", label: "Margin", num: true, sortVal: (r) => r.margin, render: (r) => fmtPct(r.margin) },
    ];
    function redraw() {
      host.replaceChildren(dataTable({ rows: catalog, columns, initialSort: { key: sortMode, dir: "desc" }, emptyText: "No products in range." }));
      // reflect active tab
      content.querySelectorAll(".pill-tab button").forEach((b) => b.classList.toggle("active", b.textContent.toLowerCase().startsWith(sortMode.slice(0, 4))));
    }
    redraw();
  },
};
