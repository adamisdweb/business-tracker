// SETTINGS — account, data import/export, the profit rule, danger zone.
import { el, fmtGBP, fmtNum, toast } from "../utils.js";
import { summarise } from "../finance.js";
import { sectionHead } from "../components/widgets.js";
import { confirmDialog } from "../components/modal.js";
import { importSeed, clearAllData } from "../store.js";
import { logout, currentUser } from "../auth.js";
import { exportCSV } from "../components/export.js";

export default {
  title: "Settings",
  sub: "Account & data",
  render(ctx) {
    const { content, state } = ctx;
    const user = currentUser();
    const sum = summarise(state.sales, state.expenses);

    // account
    content.append(el("div", { class: "card pad page-section" },
      sectionHead("Account"),
      el("div", { class: "muted", style: "margin-bottom:12px" }, "Signed in as ", el("b", {}, user?.email || "—")),
      el("button", { class: "btn", onclick: () => logout() }, "⎋ Sign out")));

    // the profit rule
    content.append(el("div", { class: "card pad page-section" },
      sectionHead("How your profit is calculated"),
      el("div", { class: "note-box" },
        el("div", { html: "<b>Net cash profit = Revenue − all money spent</b> (counted once)" }),
        el("div", { style: "margin-top:8px;line-height:1.65" },
          "The headline is a <b>cash</b> figure — what you've actually banked. The Overview waterfall walks it through: " +
          "<b>Gross profit</b> (revenue − filament used in sold items − stall fees) shows your pricing health; then running " +
          "costs and the filament you've <b>bought but not yet used</b> come off to reach net. " +
          "Per-sale <b>landing cost</b> drives product margins; filament is only ever counted once — when you buy it — so it's never double-counted."),
        el("div", { class: "faint", style: "margin-top:10px" },
          `Current totals — Revenue ${fmtGBP(sum.revenue)} · Gross ${fmtGBP(sum.grossProfit)} · Operating ${fmtGBP(sum.operatingProfit)} · Filament unused ${fmtGBP(sum.unusedFilament)} · Net cash ${fmtGBP(sum.netProfit)}`))));

    // data: import / export
    const importBtn = el("button", { class: "btn", onclick: async () => {
      if (!(await confirmDialog({ title: "Import spreadsheet data?", message: "This adds the original 464 sales + 54 expenses from your spreadsheet. Re-running won't create duplicates (it uses fixed IDs).", confirmLabel: "Import", danger: false }))) return;
      importBtn.disabled = true; importBtn.textContent = "Importing…";
      try { await importSeed(); toast("Imported spreadsheet data 🎉"); }
      catch (e) { toast("Import failed — " + (e.message || e), "err"); } finally { importBtn.disabled = false; importBtn.textContent = "Re-import spreadsheet data"; }
    } }, "Re-import spreadsheet data");

    content.append(el("div", { class: "card pad page-section" },
      sectionHead("Your data", `${fmtNum(state.sales.length)} sales · ${fmtNum(state.expenses.length)} expenses`),
      el("div", { class: "chip-group" },
        el("button", { class: "btn", onclick: () => { exportCSV("sales-all", state.sales.map((s) => ({ Date: s.date, Item: s.item, Revenue: s.revenue, LandingCost: s.landingCost, Profit: (s.revenue - s.landingCost).toFixed(2), Platform: s.platform, Status: s.status, Printed: s.printed ? "Yes" : "No", Notes: s.notes || "" }))); toast("Sales exported"); } }, "⬇ Export all sales"),
        el("button", { class: "btn", onclick: () => { exportCSV("expenses-all", state.expenses.map((e) => ({ Date: e.date, Description: e.description, Amount: e.amount, Category: e.category, Notes: e.notes || "" }))); toast("Expenses exported"); } }, "⬇ Export all expenses"),
        importBtn)));

    // danger zone
    content.append(el("div", { class: "card pad", style: "border-color:rgba(255,107,129,.35)" },
      sectionHead("Danger zone"),
      el("p", { class: "muted", style: "margin-top:0" }, "Permanently delete every sale and expense in your account. Export first if you want a backup."),
      el("button", { class: "btn danger", onclick: async () => {
        if (!(await confirmDialog({ title: "Delete ALL data?", message: `This removes all ${state.sales.length} sales and ${state.expenses.length} expenses. There is no undo.`, confirmLabel: "Delete everything" }))) return;
        try { await clearAllData(); toast("All data deleted"); } catch (e) { toast("Delete failed", "err"); }
      } }, "🗑 Delete all data")));
  },
};
