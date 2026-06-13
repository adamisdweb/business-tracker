// UK TAX-YEAR SUMMARY (bonus #4). Estimate only — not accounting advice.
import { el, fmtGBP, fmtPct, ukTaxYearOf, todayISO, toast } from "../utils.js";
import { summarise } from "../finance.js";
import { statCard, sectionHead } from "../components/widgets.js";
import { saveSettings } from "../store.js";
import { exportCSV } from "../components/export.js";

let selectedKey = null;

export default {
  title: "Tax Year",
  sub: "UK self-assessment helper",
  render(ctx) {
    const { content, header, state } = ctx;

    // distinct tax years present in the data (+ current)
    const keys = new Set([ukTaxYearOf(todayISO()).key]);
    for (const s of state.sales) if (s.date) keys.add(ukTaxYearOf(s.date).key);
    for (const e of state.expenses) if (e.date) keys.add(ukTaxYearOf(e.date).key);
    const years = [...keys].sort().reverse();
    if (!selectedKey || !keys.has(selectedKey)) selectedKey = years[0];

    const sel = el("select", { class: "input compact", onchange: (e) => { selectedKey = e.target.value; ctx.rerender ? ctx.rerender() : location.reload(); } });
    // we can't easily re-run; rebuild manually instead:
    sel.replaceChildren(...years.map((k) => { const o = el("option", { value: k }, `${k} tax year`); if (k === selectedKey) o.selected = true; return o; }));
    sel.addEventListener("change", () => { selectedKey = sel.value; rebuild(); });
    header.append(sel);

    const host = el("div");
    content.append(host);

    const rate = state.settings.taxRatePct ?? 20;
    const allowance = state.settings.taxFreeAllowance ?? 1000;

    function rebuild() {
      sel.value = selectedKey;
      const ty = ukTaxYearOf(selectedKey.split("/")[0] + "-06-01"); // any date inside; recompute properly:
      const start = selectedKey.split("/")[0] + "-04-06";
      const end = (parseInt(selectedKey.split("/")[1])) + "-04-05";
      const inRange = (d) => d >= start && d <= end;
      const sales = state.sales.filter((s) => s.date && inRange(s.date) && s.status !== "Cancelled");
      const expenses = state.expenses.filter((e) => e.date && inRange(e.date));
      const sum = summarise(sales, expenses);

      const taxableProfit = Math.max(0, sum.netProfit);
      const allowableCosts = sum.revenue - sum.netProfit; // cash basis: money spent this year
      const overAllowance = sum.revenue > allowance;
      const estTax = taxableProfit * (rate / 100);

      host.replaceChildren();

      // hero set-aside
      host.append(el("div", { class: "hero", style: "margin-bottom:18px" },
        el("div", { class: "glow a" }), el("div", { class: "glow b" }),
        el("div", { class: "eyebrow" }, `${selectedKey} · 6 Apr ${selectedKey.split("/")[0]} – 5 Apr ${selectedKey.split("/")[1]}`),
        el("div", { class: "big" }, fmtGBP(estTax)),
        el("div", { class: "muted", style: "position:relative;font-size:13px" }, `Suggested amount to set aside for tax (estimate at ${rate}% on ${fmtGBP(taxableProfit)} profit)`),
        el("div", { class: "row" },
          item("Revenue", fmtGBP(sum.revenue)),
          item("Allowable costs", fmtGBP(allowableCosts), "negv"),
          item("Net taxable profit", fmtGBP(taxableProfit), "pos"),
          item("Orders", String(sum.orders)))));

      host.append(el("div", { class: "grid kpis page-section" },
        statCard({ label: "Turnover (revenue)", ico: "💷", value: fmtGBP(sum.revenue), accent: "blue" }),
        statCard({ label: "Net profit", ico: "📈", value: fmtGBP(sum.netProfit), accent: "green" }),
        statCard({ label: `Estimated tax @ ${rate}%`, ico: "🧾", value: fmtGBP(estTax), accent: "amber" }),
        statCard({ label: "Take-home after tax", ico: "💚", value: fmtGBP(taxableProfit - estTax), accent: "purple" })));

      // allowance note
      host.append(el("div", { class: "note-box page-section" },
        el("div", { html: overAllowance
          ? `Your turnover of <b>${fmtGBP(sum.revenue)}</b> is above the <b>£${allowance.toLocaleString()}</b> trading allowance, so this is likely declarable self-employment income. You can deduct your actual costs (as above) <i>or</i> claim the £${allowance.toLocaleString()} allowance — whichever is better.`
          : `Your turnover of <b>${fmtGBP(sum.revenue)}</b> is under the <b>£${allowance.toLocaleString()}</b> trading allowance — you may not need to declare it. Check your total across all side income.` }),
        el("div", { style: "margin-top:8px", class: "faint" }, "⚠️ This is a rough estimate to help you plan — not tax advice. Confirm with HMRC or an accountant. Profit is on a cash basis: filament and other costs are deducted in the year you pay for them, counted once.")));

      // export
      host.append(el("div", { class: "card pad" },
        sectionHead("Export this tax year"),
        el("p", { class: "muted", style: "margin-top:0" }, "Download a clean summary for your records or your accountant."),
        el("button", { class: "btn primary", onclick: () => {
          exportCSV(`tax-summary-${selectedKey.replace("/", "-")}`, [
            { Metric: "Tax year", Value: selectedKey },
            { Metric: "Period", Value: `6 Apr ${selectedKey.split("/")[0]} - 5 Apr ${selectedKey.split("/")[1]}` },
            { Metric: "Turnover (revenue)", Value: sum.revenue.toFixed(2) },
            { Metric: "Expenses paid (incl. filament bought)", Value: sum.expensesTotal.toFixed(2) },
            { Metric: "Stall / pitch fees", Value: sum.pitchFees.toFixed(2) },
            { Metric: "Allowable costs (cash basis)", Value: allowableCosts.toFixed(2) },
            { Metric: "Net taxable profit", Value: taxableProfit.toFixed(2) },
            { Metric: `Estimated tax @ ${rate}%`, Value: estTax.toFixed(2) },
            { Metric: "Take-home after tax", Value: (taxableProfit - estTax).toFixed(2) },
          ]);
          toast("Tax summary exported");
        } }, "⬇ Export tax summary")));

      // settings
      const rateInput = el("input", { class: "input", type: "number", step: "1", min: "0", max: "100", value: rate });
      const allowInput = el("input", { class: "input", type: "number", step: "50", min: "0", value: allowance });
      const saveBtn = el("button", { class: "btn primary", onclick: async () => {
        saveBtn.disabled = true;
        try { await saveSettings({ taxRatePct: parseFloat(rateInput.value) || 0, taxFreeAllowance: parseFloat(allowInput.value) || 0 }); toast("Saved — reopening"); selectedKey = sel.value; rebuild(); }
        catch (e) { toast("Save failed", "err"); } finally { saveBtn.disabled = false; }
      } }, "Save");
      host.append(el("div", { class: "card pad", style: "margin-top:18px" }, sectionHead("Estimate settings"),
        el("div", { class: "form-grid" },
          el("div", {}, el("label", {}, "Tax rate (%)"), rateInput),
          el("div", {}, el("label", {}, "Trading allowance (£)"), allowInput),
          el("div", { class: "full" }, saveBtn))));
    }

    rebuild();
  },
};
function item(k, v, cls) { return el("div", { class: "item" }, el("div", { class: "k" }, k), el("div", { class: "v " + (cls || "") }, v)); }
