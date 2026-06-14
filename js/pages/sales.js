// SALES — list, search, add/edit/delete, export.
import { el, fmtGBP, fmtPct, fmtDate, fmtNum, debounce, toast, STATUSES } from "../utils.js";
import { filterSales, filterByDate, summarise, saleProfit, saleMargin } from "../finance.js";
import { filters } from "../filters.js";
import { filterBar } from "../components/filterbar.js";
import { dataTable } from "../components/table.js";
import { platformBadge, statCard } from "../components/widgets.js";
import { openSaleForm } from "../components/forms.js";
import { confirmDialog } from "../components/modal.js";
import { deleteSale, updateSale, addSale } from "../store.js";
import { exportCSV } from "../components/export.js";

let search = "";

export default {
  title: "Sales",
  sub: "Every order, in one place",
  render(ctx) {
    const { content, header, state } = ctx;
    header.append(filterBar());
    header.append(el("button", { class: "btn sm primary", onclick: () => openSaleForm() }, "＋ Add sale"));

    let sales = filterSales(state.sales, filters);
    const expenses = filterByDate(state.expenses, filters.range);
    const sum = summarise(sales, expenses);

    // KPI strip
    content.append(el("div", { class: "grid kpis page-section" },
      statCard({ label: "Orders", ico: "📦", value: fmtNum(sum.orders), accent: "amber" }),
      statCard({ label: "Revenue", ico: "💷", value: fmtGBP(sum.revenue), accent: "blue" }),
      statCard({ label: "Gross profit", ico: "📈", value: fmtGBP(sum.grossProfit), accent: "green" }),
      statCard({ label: "Avg margin", ico: "🎯", value: fmtPct(sum.avgMargin), accent: "purple" })));

    // toolbar: search + export
    const searchInput = el("input", { class: "input compact", type: "search", placeholder: "Search item…", value: search, style: "min-width:220px" });
    searchInput.addEventListener("input", debounce((e) => { search = e.target.value; redraw(); }, 180));
    const exportBtn = el("button", { class: "btn sm", onclick: () => exportSales(sales) }, "⬇ Export CSV");
    const toolbar = el("div", { class: "section-head" },
      el("h2", {}, `${fmtNum(sales.length)} sales`),
      el("div", { class: "chip-group" }, searchInput, exportBtn));
    content.append(toolbar);

    const tableHost = el("div");
    content.append(tableHost);

    const columns = [
      { key: "date", label: "Date", sortVal: (r) => r.date, render: (r) => fmtDate(r.date) },
      { key: "item", label: "Item", sortVal: (r) => r.item, render: (r) => el("span", { style: "font-weight:600" }, r.item) },
      { key: "platform", label: "Platform", sortVal: (r) => r.platform, render: (r) => platformBadge(r.platform) },
      { key: "status", label: "Status", sortVal: (r) => r.status, render: (r) => statusSelect(r) },
      { key: "printed", label: "Printed", sortVal: (r) => (r.printed ? 1 : 0), render: (r) => printedToggle(r) },
      { key: "revenue", label: "Revenue", num: true, sortVal: (r) => r.revenue, render: (r) => fmtGBP(r.revenue) },
      { key: "landingCost", label: "Landing", num: true, sortVal: (r) => r.landingCost, render: (r) => fmtGBP(r.landingCost) },
      { key: "profit", label: "Profit", num: true, sortVal: (r) => saleProfit(r), render: (r) => { const p = saleProfit(r); return el("span", { class: p >= 0 ? "pos-num" : "neg-num" }, fmtGBP(p)); } },
      { key: "margin", label: "Margin", num: true, sortVal: (r) => saleMargin(r), render: (r) => fmtPct(saleMargin(r)) },
    ];

    function redraw() {
      const q = search.trim().toLowerCase();
      const rows = q ? sales.filter((s) => (s.item || "").toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q)) : sales;
      tableHost.replaceChildren(dataTable({
        rows, columns, initialSort: { key: "date", dir: "desc" },
        emptyText: "No sales match your filters.",
        rowActions: (r) => [
          el("button", { class: "btn icon sm ghost", title: "Duplicate this sale", onclick: async (e) => {
            const b = e.currentTarget; b.disabled = true;
            try {
              await addSale({ date: r.date, item: r.item, revenue: r.revenue, landingCost: r.landingCost, platform: r.platform, status: r.status, printed: r.printed, notes: r.notes });
              toast(`Copied “${r.item}”`);
            } catch (err) { console.error(err); toast("Copy failed", "err"); b.disabled = false; }
          } }, "⧉"),
          el("button", { class: "btn icon sm ghost", title: "Edit", onclick: () => openSaleForm(r) }, "✏️"),
          el("button", { class: "btn icon sm ghost", title: "Delete", onclick: async () => {
            if (await confirmDialog({ title: "Delete sale?", message: `Delete “${r.item}” (${fmtGBP(r.revenue)})? This can't be undone.` })) {
              try { await deleteSale(r.id); toast("Sale deleted"); } catch (e) { toast("Delete failed", "err"); }
            }
          } }, "🗑"),
        ],
      }));
    }
    redraw();
  },
};

// Inline quick-edit controls so status / printed can be changed straight from the table.
const STATUS_COLOR = { Delivered: "var(--green)", Dispatched: "var(--cyan)", Packed: "var(--amber)", Cancelled: "var(--red)" };

function statusSelect(r) {
  const sel = el("select", {
    class: "input compact",
    style: `width:auto;padding:5px 26px 5px 9px;font-size:12.5px;font-weight:700;color:${STATUS_COLOR[r.status] || "var(--text)"}`,
    onchange: async (e) => {
      const v = e.target.value;
      sel.style.color = STATUS_COLOR[v] || "var(--text)";
      try { await updateSale(r.id, { ...r, status: v }); toast("Status → " + v); }
      catch (err) { console.error(err); toast("Update failed", "err"); }
    },
  });
  STATUSES.forEach((s) => { const o = el("option", { value: s }, s); if (s === r.status) o.selected = true; sel.append(o); });
  return sel;
}

function printedToggle(r) {
  return el("button", {
    class: "badge " + (r.printed ? "status-Delivered" : "cat"),
    style: "cursor:pointer;border-style:solid",
    title: "Click to toggle printed",
    onclick: async () => {
      try { await updateSale(r.id, { ...r, printed: !r.printed }); }
      catch (err) { console.error(err); toast("Update failed", "err"); }
    },
  }, r.printed ? "✓ Printed" : "Not printed");
}

function exportSales(sales) {
  const rows = sales.map((s) => ({
    Date: s.date, Item: s.item, Revenue: s.revenue, "Landing Cost": s.landingCost,
    Profit: (s.revenue - s.landingCost).toFixed(2), Platform: s.platform, Status: s.status,
    Printed: s.printed ? "Yes" : "No", Notes: s.notes || "",
  }));
  exportCSV("sales", rows);
  toast(`Exported ${rows.length} sales`);
}
