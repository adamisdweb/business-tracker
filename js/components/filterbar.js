// The global filter bar (date presets, platform toggles, cancelled toggle).
import { el } from "../utils.js";
import { PLATFORMS } from "../utils.js";
import { filters, setPreset, setCustomRange, togglePlatform, setExcludeCancelled, PRESETS } from "../filters.js";

// opts: { platforms:true, cancelled:true, dates:true }
export function filterBar(opts = {}) {
  const o = { platforms: true, cancelled: true, dates: true, ...opts };
  const wrap = el("div", { class: "filterbar" });

  if (o.dates) {
    const presetGroup = el("div", { class: "chip-group" });
    for (const p of PRESETS) {
      const c = el("button", { class: "chip" + (filters.preset === p.key ? " active" : ""), onclick: () => setPreset(p.key) }, p.label);
      presetGroup.append(c);
    }
    wrap.append(presetGroup);

    // custom range
    const start = el("input", { class: "input compact", type: "date", value: filters.range.start || "" });
    const end = el("input", { class: "input compact", type: "date", value: filters.range.end || "" });
    const apply = () => setCustomRange(start.value, end.value);
    start.addEventListener("change", apply); end.addEventListener("change", apply);
    wrap.append(el("div", { class: "chip-group" },
      el("span", { class: "faint", style: "font-size:12px" }, "from"), start,
      el("span", { class: "faint", style: "font-size:12px" }, "to"), end));
  }

  if (o.platforms) {
    const pg = el("div", { class: "chip-group" });
    for (const p of PLATFORMS) {
      const active = filters.platforms.has(p);
      const c = el("button", { class: "chip" + (active ? " active" : ""), dataset: { platform: p }, onclick: () => togglePlatform(p) },
        el("span", { class: "dot" }), p);
      pg.append(c);
    }
    wrap.append(pg);
  }

  if (o.cancelled) {
    const t = el("button", { class: "chip" + (filters.excludeCancelled ? " active" : ""), onclick: () => setExcludeCancelled(!filters.excludeCancelled) },
      filters.excludeCancelled ? "✓ Hiding cancelled" : "Showing cancelled");
    wrap.append(t);
  }
  return wrap;
}
