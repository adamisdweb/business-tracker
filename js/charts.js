// Chart.js helpers (Chart.js loaded as a UMD global in index.html).
import { fmtGBP, fmtGBPk } from "./utils.js";

const C = () => window.Chart;
const registry = new Map(); // canvas-id -> Chart instance

function baseDefaults() {
  const Chart = C();
  if (!Chart || baseDefaults._done) return;
  Chart.defaults.color = "#9aa6c4";
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = "#161d2e";
  Chart.defaults.plugins.tooltip.borderColor = "rgba(255,255,255,0.16)";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 11;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.titleColor = "#eaf0ff";
  Chart.defaults.plugins.tooltip.bodyColor = "#cdd6ee";
  Chart.defaults.maintainAspectRatio = false;
  baseDefaults._done = true;
}

function mount(canvas, config) {
  baseDefaults();
  if (!canvas) return null;
  const prev = registry.get(canvas);
  if (prev) prev.destroy();
  const chart = new (C())(canvas, config);
  registry.set(canvas, chart);
  return chart;
}

const gridColor = "rgba(255,255,255,0.06)";
const moneyAxis = {
  grid: { color: gridColor, drawBorder: false },
  ticks: { callback: (v) => fmtGBPk(v) },
};

function gradient(ctx, area, from, to) {
  if (!area) return from;
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, from); g.addColorStop(1, to);
  return g;
}

// Revenue / profit / net over months -------------------------------------
export function trendChart(canvas, series, { showNet = true } = {}) {
  const labels = series.map((m) => m.label);
  const ds = [
    {
      label: "Revenue", data: series.map((m) => round(m.revenue)),
      borderColor: "#6ea8fe", tension: 0.35, borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5,
      fill: true,
      backgroundColor: (c) => gradient(c.chart.ctx, c.chart.chartArea, "rgba(110,168,254,0.28)", "rgba(110,168,254,0)"),
    },
    {
      label: "Gross profit", data: series.map((m) => round(m.grossProfit)),
      borderColor: "#36d399", tension: 0.35, borderWidth: 2.5, pointRadius: 2, pointHoverRadius: 5, fill: false,
    },
  ];
  if (showNet) ds.push({
    label: "Net profit", data: series.map((m) => round(m.net)),
    borderColor: "#c47bff", borderDash: [5, 4], tension: 0.35, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: false,
  });
  return mount(canvas, {
    type: "line",
    data: { labels, datasets: ds },
    options: {
      interaction: { mode: "index", intersect: false },
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtGBP(c.parsed.y)}` } } },
      scales: { x: { grid: { display: false } }, y: moneyAxis },
    },
  });
}

// Stacked monthly revenue by platform ------------------------------------
export function stackedPlatformChart(canvas, labels, datasets) {
  return mount(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtGBP(c.parsed.y)}` } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ...moneyAxis } },
    },
  });
}

// Doughnut (platform / category split) -----------------------------------
export function doughnutChart(canvas, labels, data, colors) {
  return mount(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: data.map(round), backgroundColor: colors, borderColor: "#0b0f1a", borderWidth: 3, hoverOffset: 6 }] },
    options: {
      cutout: "64%",
      plugins: { tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtGBP(c.parsed)}` } } },
    },
  });
}

// Horizontal bar (top products) ------------------------------------------
export function barChart(canvas, labels, data, { color = "#8b7bff", money = true } = {}) {
  return mount(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data: data.map(round), backgroundColor: color, borderRadius: 6, barThickness: "flex", maxBarThickness: 26 }] },
    options: {
      indexAxis: "y",
      plugins: { tooltip: { callbacks: { label: (c) => (money ? fmtGBP(c.parsed.x) : c.parsed.x) } } },
      scales: { x: money ? moneyAxis : { grid: { color: gridColor } }, y: { grid: { display: false } } },
    },
  });
}

export function destroyAll() {
  for (const ch of registry.values()) { try { ch.destroy(); } catch {} }
  registry.clear();
}
const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
