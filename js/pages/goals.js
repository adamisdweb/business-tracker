// MONTHLY GOALS & FORECAST (bonus #3).
import { el, fmtGBP, fmtPct, monthLabel, monthKey, todayISO, toast, MONTHS } from "../utils.js";
import { summarise, monthlySeries } from "../finance.js";
import { progressRing, sectionHead, statCard } from "../components/widgets.js";
import { barChart } from "../charts.js";
import { saveSettings } from "../store.js";

export default {
  title: "Goals",
  sub: "Targets & month-end forecast",
  render(ctx) {
    const { content, state } = ctx;
    const today = todayISO();
    const mk = monthKey(today);
    const monthSales = state.sales.filter((s) => (s.date || "").startsWith(mk));
    const monthExpenses = state.expenses.filter((e) => (e.date || "").startsWith(mk));
    const sum = summarise(monthSales, monthExpenses);

    const now = new Date(today);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const pace = dayOfMonth / daysInMonth;
    const projRevenue = pace > 0 ? sum.revenue / pace : 0;
    const projProfit = pace > 0 ? sum.netProfit / pace : 0;

    const revGoal = state.settings.monthlyRevenueGoal || 0;
    const profitGoal = state.settings.monthlyProfitGoal || 0;
    const revPct = revGoal ? (sum.revenue / revGoal) * 100 : 0;
    const profitPct = profitGoal ? (sum.netProfit / profitGoal) * 100 : 0;

    content.append(sectionHead(`${monthLabel(mk)} so far`, `Day ${dayOfMonth} of ${daysInMonth}`));

    // two big ring cards
    content.append(el("div", { class: "grid cols-2 page-section" },
      ringCard("Revenue", sum.revenue, revGoal, revPct, projRevenue, "#6ea8fe"),
      ringCard("Net profit", sum.netProfit, profitGoal, profitPct, projProfit, "#c47bff")));

    // quick stats
    content.append(el("div", { class: "grid kpis page-section" },
      statCard({ label: "Orders this month", ico: "📦", value: String(sum.orders), accent: "amber" }),
      statCard({ label: "Avg order", ico: "🧾", value: fmtGBP(sum.avgOrder), accent: "blue" }),
      statCard({ label: "Projected revenue", ico: "🔮", value: fmtGBP(projRevenue), accent: "blue", sub: "at current pace" }),
      statCard({ label: "Projected net profit", ico: "🔮", value: fmtGBP(projProfit), accent: "purple", sub: "at current pace" })));

    // history vs goal
    const series = monthlySeries(state.sales, state.expenses).slice(-12);
    const canvas = el("canvas");
    content.append(el("div", { class: "card chart-card page-section" },
      el("div", { class: "chart-head" }, el("h3", {}, "Net profit by month"),
        revGoal || profitGoal ? el("span", { class: "faint", style: "font-size:12.5px" }, `Goal line: ${fmtGBP(profitGoal)}`) : ""),
      el("div", { class: "chart-wrap lg" }, canvas)));
    requestAnimationFrame(() => {
      if (!series.length || !window.Chart) return;
      const labels = series.map((m) => { const [y, mm] = m.key.split("-"); return MONTHS[(+mm) - 1] + " " + y.slice(2); });
      const data = series.map((m) => Math.round(m.net));
      const ch = barChart(canvas, labels, data, { color: "#36d399" });
      // swap to vertical bars + goal line
      if (ch) {
        ch.config.options.indexAxis = "x";
        ch.data.datasets[0].backgroundColor = data.map((v) => v >= profitGoal && profitGoal ? "#36d399" : "#6ea8fe");
        if (profitGoal) ch.data.datasets.push({ type: "line", label: "Goal", data: labels.map(() => profitGoal), borderColor: "#ffc35a", borderDash: [6, 5], borderWidth: 2, pointRadius: 0 });
        ch.update();
      }
    });

    // goal settings
    const revInput = el("input", { class: "input", type: "number", step: "10", min: "0", value: revGoal });
    const profitInput = el("input", { class: "input", type: "number", step: "10", min: "0", value: profitGoal });
    const saveBtn = el("button", { class: "btn primary", onclick: async () => {
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      try { await saveSettings({ monthlyRevenueGoal: parseFloat(revInput.value) || 0, monthlyProfitGoal: parseFloat(profitInput.value) || 0 }); toast("Goals updated"); }
      catch (e) { toast("Save failed", "err"); } finally { saveBtn.disabled = false; saveBtn.textContent = "Save goals"; }
    } }, "Save goals");
    content.append(el("div", { class: "card pad" }, sectionHead("Set your monthly targets"),
      el("div", { class: "form-grid" },
        el("div", {}, el("label", {}, "Monthly revenue goal (£)"), revInput),
        el("div", {}, el("label", {}, "Monthly net profit goal (£)"), profitInput),
        el("div", { class: "full" }, saveBtn))));
  },
};

function ringCard(label, actual, goal, pct, projected, color) {
  const onTrack = projected >= goal && goal > 0;
  const remaining = Math.max(0, goal - actual);
  return el("div", { class: "card ring-card" },
    progressRing(pct, { color, label }),
    el("div", { class: "goal-meta" },
      el("div", { class: "gm-title" }, label + " goal"),
      el("div", { class: "gm-line", html: `<b>${fmtGBP(actual)}</b> of <b>${fmtGBP(goal)}</b>` }),
      goal > 0 ? el("div", { class: "gm-line muted" }, remaining > 0 ? `${fmtGBP(remaining)} to go` : "Goal smashed! 🎉") : el("div", { class: "gm-line muted" }, "Set a goal below"),
      goal > 0 ? el("div", { class: `forecast-pill` }, (onTrack ? "✅ On track · " : "⏳ Behind · ") + `projected ${fmtGBP(projected)}`) : ""));
}
