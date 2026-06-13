// EXPENSES — list, search, add/edit/delete, export, category split.
import { el, fmtGBP, fmtDate, fmtNum, fmtPct, debounce, toast, CATEGORY_COLORS, EXPENSE_CATEGORIES } from "../utils.js";
import { filterByDate, groupBy, sum } from "../finance.js";
import { filters } from "../filters.js";
import { filterBar } from "../components/filterbar.js";
import { dataTable } from "../components/table.js";
import { catBadge, statCard, sectionHead, rankList } from "../components/widgets.js";
import { openExpenseForm } from "../components/forms.js";
import { confirmDialog } from "../components/modal.js";
import { deleteExpense } from "../store.js";
import { doughnutChart } from "../charts.js";
import { exportCSV } from "../components/export.js";

let search = "";

export default {
  title: "Expenses",
  sub: "Everything you've spent",
  render(ctx) {
    const { content, header, state } = ctx;
    header.append(filterBar({ platforms: false, cancelled: false }));
    header.append(el("button", { class: "btn sm primary", onclick: () => openExpenseForm() }, "＋ Add expense"));

    const expenses = filterByDate(state.expenses, filters.range);
    const total = sum(expenses, (e) => e.amount);
    const filament = sum(expenses.filter((e) => e.category === "Filament"), (e) => e.amount);
    const nonFil = total - filament;

    content.append(el("div", { class: "grid kpis page-section" },
      statCard({ label: "Total spent", ico: "💸", value: fmtGBP(total), accent: "red" }),
      statCard({ label: "Filament (inventory)", ico: "🧵", value: fmtGBP(filament), accent: "purple", sub: "tracked separately" }),
      statCard({ label: "Costs hitting profit", ico: "📉", value: fmtGBP(nonFil), accent: "amber", sub: "excl. filament" }),
      statCard({ label: "Entries", ico: "🧮", value: fmtNum(expenses.length), accent: "blue" })));

    // category split chart + ranking
    const byCat = [...groupBy(expenses, (e) => e.category).entries()]
      .map(([category, rows]) => ({ category, amount: sum(rows, (e) => e.amount) }))
      .sort((a, b) => b.amount - a.amount);
    const dCanvas = el("canvas");
    const splitCard = el("div", { class: "card chart-card" },
      el("div", { class: "chart-head" }, el("h3", {}, "Spend by category")),
      el("div", { class: "chart-wrap" }, dCanvas));
    const rankCard = el("div", { class: "card pad" }, sectionHead("Where the money goes"),
      rankList(byCat.map((c) => ({ name: c.category, value: c.amount }))));
    content.append(el("div", { class: "grid cols-2 page-section" }, splitCard, rankCard));
    requestAnimationFrame(() => { if (byCat.length) doughnutChart(dCanvas, byCat.map((c) => c.category), byCat.map((c) => c.amount), byCat.map((c) => CATEGORY_COLORS[c.category] || "#7d8aa8")); });

    // toolbar
    const searchInput = el("input", { class: "input compact", type: "search", placeholder: "Search…", value: search, style: "min-width:200px" });
    searchInput.addEventListener("input", debounce((e) => { search = e.target.value; redraw(); }, 180));
    content.append(el("div", { class: "section-head" },
      el("h2", {}, `${fmtNum(expenses.length)} expenses`),
      el("div", { class: "chip-group" }, searchInput,
        el("button", { class: "btn sm", onclick: () => { exportCSV("expenses", expenses.map((e) => ({ Date: e.date, Description: e.description, Amount: e.amount, Category: e.category, Notes: e.notes || "" }))); toast(`Exported ${expenses.length} expenses`); } }, "⬇ Export CSV"))));

    const tableHost = el("div");
    content.append(tableHost);

    const columns = [
      { key: "date", label: "Date", sortVal: (r) => r.date, render: (r) => fmtDate(r.date) },
      { key: "description", label: "Description", sortVal: (r) => r.description, render: (r) => el("span", { style: "font-weight:600" }, r.description) },
      { key: "category", label: "Category", sortVal: (r) => r.category, render: (r) => catBadge(r.category) },
      { key: "amount", label: "Amount", num: true, sortVal: (r) => r.amount, render: (r) => fmtGBP(r.amount) },
    ];
    function redraw() {
      const q = search.trim().toLowerCase();
      const rows = q ? expenses.filter((e) => (e.description || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q)) : expenses;
      tableHost.replaceChildren(dataTable({
        rows, columns, initialSort: { key: "date", dir: "desc" },
        emptyText: "No expenses match.",
        rowActions: (r) => [
          el("button", { class: "btn icon sm ghost", title: "Edit", onclick: () => openExpenseForm(r) }, "✏️"),
          el("button", { class: "btn icon sm ghost", title: "Delete", onclick: async () => {
            if (await confirmDialog({ title: "Delete expense?", message: `Delete “${r.description}” (${fmtGBP(r.amount)})?` })) {
              try { await deleteExpense(r.id); toast("Expense deleted"); } catch (e) { toast("Delete failed", "err"); }
            }
          } }, "🗑"),
        ],
      }));
    }
    redraw();
  },
};
