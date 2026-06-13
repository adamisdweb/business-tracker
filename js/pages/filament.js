// FILAMENT RUNWAY (bonus #2) — filament bought vs used, remaining value, runway.
import { el, fmtGBP, fmtPct, daysBetween, todayISO, isPitchFee, toast } from "../utils.js";
import { filamentStats, sum } from "../finance.js";
import { statCard, sectionHead } from "../components/widgets.js";
import { saveSettings } from "../store.js";

export default {
  title: "Filament",
  sub: "Inventory & runway",
  render(ctx) {
    const { content, state } = ctx;
    const sales = state.sales;
    const expenses = state.expenses;
    const fil = filamentStats(sales, expenses);

    // burn rate: filament used per week across the active selling window
    const used = sales.filter((s) => !isPitchFee(s.item));
    const dates = used.map((s) => s.date).filter(Boolean).sort();
    const first = dates[0] || todayISO();
    const last = dates[dates.length - 1] || todayISO();
    const weeks = Math.max(1, daysBetween(first, todayISO()) / 7);
    const weeklyBurn = fil.used / weeks;
    const runwayWeeks = weeklyBurn > 0 ? fil.remaining / weeklyBurn : Infinity;

    const reorder = state.settings.filamentReorderLevel ?? 50;
    const low = fil.remaining < reorder;

    // headline banner
    const pctUsed = fil.bought > 0 ? Math.min(100, (fil.used / fil.bought) * 100) : 0;
    const banner = el("div", { class: "hero", style: "margin-bottom:18px" },
      el("div", { class: "glow a" }), el("div", { class: "glow b" }),
      el("div", { class: "eyebrow" }, "Filament you still have, by value"),
      el("div", { class: "big" + (fil.remaining < 0 ? " neg" : "") }, fmtGBP(Math.max(0, fil.remaining))),
      el("div", { class: "muted", style: "position:relative;font-size:13px" },
        fil.remaining < 0
          ? "You've used more filament value than recorded purchases — log recent filament buys to keep this accurate."
          : `At your current pace you've got roughly ${runwayWeeks === Infinity ? "∞" : Math.round(runwayWeeks)} weeks of filament left.`),
      el("div", { class: "row" },
        item("Bought (all time)", fmtGBP(fil.bought)),
        item("Used (landing cost)", fmtGBP(fil.used), "negv"),
        item("Weekly burn", fmtGBP(weeklyBurn)),
        item("Runway", runwayWeeks === Infinity ? "—" : `${Math.round(runwayWeeks)} wks`)));
    content.append(banner);

    // usage progress
    const track = el("div", { class: "runway-track" }, el("i", { style: `width:${pctUsed}%;background:${low ? "var(--red)" : "var(--grad)"}` }));
    content.append(el("div", { class: "card pad page-section" },
      sectionHead("Filament used vs bought"),
      track,
      el("div", { class: "muted", style: "margin-top:10px;font-size:13px" },
        `You've consumed ${fmtPct(pctUsed)} of the filament value you've purchased.`),
      low ? el("div", { class: "note-box", style: "margin-top:12px;border-color:rgba(255,107,129,.4);background:var(--red-soft)" },
        el("span", { html: `🛒 <b>Time to restock.</b> Remaining filament value (${fmtGBP(fil.remaining)}) is below your reorder level of ${fmtGBP(reorder)}.` }))
        : el("div", { class: "note-box", style: "margin-top:12px;border-color:rgba(54,211,153,.35);background:var(--green-soft)" },
          el("span", { html: `✅ Filament stock is healthy — above your ${fmtGBP(reorder)} reorder level.` }))));

    // gauges
    content.append(el("div", { class: "grid kpis page-section" },
      statCard({ label: "Filament purchased", ico: "🧵", value: fmtGBP(fil.bought), accent: "purple" }),
      statCard({ label: "Filament used", ico: "🔥", value: fmtGBP(fil.used), accent: "amber", sub: `${used.length} prints` }),
      statCard({ label: "Avg filament / sale", ico: "📐", value: fmtGBP(used.length ? fil.used / used.length : 0), accent: "blue" }),
      statCard({ label: "Reorder level", ico: "🔔", value: fmtGBP(reorder), accent: low ? "red" : "green" })));

    // explainer + reorder setting
    const input = el("input", { class: "input compact", type: "number", step: "1", min: "0", value: reorder, style: "width:120px" });
    const saveBtn = el("button", { class: "btn sm primary", onclick: async () => {
      saveBtn.disabled = true;
      try { await saveSettings({ filamentReorderLevel: parseFloat(input.value) || 0 }); toast("Reorder level saved"); }
      catch (e) { toast("Save failed", "err"); } finally { saveBtn.disabled = false; }
    } }, "Save");
    content.append(el("div", { class: "card pad" },
      sectionHead("Why this matters"),
      el("p", { class: "muted", style: "line-height:1.65;margin-top:0" },
        "This page is the other half of your no-double-counting rule. Filament you buy shows up as an Expense, but it isn't subtracted from profit there — instead it's drawn down here as you use it (your per-sale landing cost). So you can see how much filament value you've still got sitting on the shelf without it ever distorting your profit."),
      el("div", { class: "chip-group", style: "margin-top:10px" },
        el("span", { class: "muted" }, "Warn me when remaining filament drops below £"), input, saveBtn)));
  },
};

function item(k, v, cls) { return el("div", { class: "item" }, el("div", { class: "k" }, k), el("div", { class: "v " + (cls || "") }, v)); }
