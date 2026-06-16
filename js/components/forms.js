// Add / edit forms for sales and expenses (modal-based).
import { el, todayISO, fmtGBP, toast, PLATFORMS, STATUSES, EXPENSE_CATEGORIES, normaliseItem } from "../utils.js";
import { openModal, closeModal } from "./modal.js";
import { addSale, updateSale, addExpense, updateExpense, getState } from "../store.js";

const field = (labelText, control, hint) =>
  el("div", {}, el("label", {}, labelText), control, hint ? el("div", { class: "form-hint" }, hint) : "");

// ---------- SALE ----------
export function openSaleForm(existing) {
  const s = existing || { date: todayISO(), item: "", revenue: "", landingCost: "", platform: "Vinted", status: "Delivered", printed: true, notes: "" };

  const date = el("input", { class: "input", type: "date", value: s.date });
  const itemWrap = el("div", { class: "ac-wrap" });
  const item = el("input", { class: "input", type: "text", placeholder: "e.g. Ghostface Topper", value: s.item, autocomplete: "off" });
  itemWrap.append(item);
  buildAutocomplete(item, itemWrap, (chosen) => { if (chosen.landingCost && !landing.value) landing.value = chosen.landingCost; });

  const revenue = el("input", { class: "input", type: "number", step: "0.01", min: "0", placeholder: "0.00", value: s.revenue });
  const landing = el("input", { class: "input", type: "number", step: "0.01", min: "0", placeholder: "0.00", value: s.landingCost });
  const platform = select(PLATFORMS, s.platform);
  const status = select(STATUSES, s.status);
  const printed = el("input", { type: "checkbox" }); printed.checked = !!s.printed;
  const notes = el("textarea", { class: "input", rows: "2", placeholder: "Optional notes" }, s.notes || "");

  const pvVal = el("span", { class: "pv" }, "—");
  const pvMargin = el("span", { class: "faint" }, "");
  const preview = el("div", { class: "profit-preview" },
    el("div", {}, el("div", { class: "faint", style: "font-size:11.5px" }, "Est. product margin"), el("div", { class: "form-hint", style: "margin-top:2px" }, "Info only — landing isn't subtracted from net profit")),
    el("div", { style: "text-align:right" }, pvVal, el("div", {}, pvMargin)));
  const recompute = () => {
    const r = parseFloat(revenue.value) || 0, l = parseFloat(landing.value) || 0;
    const p = r - l;
    pvVal.textContent = fmtGBP(p);
    pvVal.style.color = p > 0 ? "var(--green)" : p < 0 ? "var(--red)" : "var(--text)";
    pvMargin.textContent = r > 0 ? `${((p / r) * 100).toFixed(1)}% margin` : "";
  };
  revenue.addEventListener("input", recompute); landing.addEventListener("input", recompute); recompute();

  const grid = el("div", { class: "form-grid" },
    field("Date", date),
    field("Platform", platform),
    el("div", { class: "full" }, field("Item / description", itemWrap, "Type to reuse a past item — landing cost auto-fills.")),
    field("Revenue (£)", revenue),
    field("Landing cost (£)", landing, "Rough per-item cost (filament, sometimes postage) — info only"),
    field("Status", status),
    el("div", {}, el("label", {}, "Printed?"), el("label", { style: "display:flex;align-items:center;gap:8px;cursor:pointer;padding-top:6px" }, printed, el("span", { class: "muted" }, "Already printed"))),
    el("div", { class: "full" }, field("Notes", notes)),
    el("div", { class: "full" }, preview));

  const save = el("button", { class: "btn primary", onclick: async () => {
    if (!date.value) return toast("Pick a date", "err");
    if (!item.value.trim()) return toast("Enter an item", "err");
    save.disabled = true; save.textContent = "Saving…";
    const payload = { date: date.value, item: item.value, revenue: parseFloat(revenue.value) || 0, landingCost: parseFloat(landing.value) || 0, platform: platform.value, status: status.value, printed: printed.checked, notes: notes.value };
    try {
      if (existing && existing.id) { await updateSale(existing.id, payload); toast("Sale updated"); }
      else { await addSale(payload); toast("Sale added"); }
      closeModal();
    } catch (e) { console.error(e); toast("Couldn't save — " + (e.message || e), "err"); save.disabled = false; save.textContent = "Save sale"; }
  } }, existing && existing.id ? "Save changes" : "Save sale");

  openModal({ title: existing && existing.id ? "Edit sale" : "Add sale", body: grid, width: 580,
    footer: [el("button", { class: "btn ghost", onclick: closeModal }, "Cancel"), save] });
}

// ---------- EXPENSE ----------
export function openExpenseForm(existing) {
  const e0 = existing || { date: todayISO(), description: "", amount: "", category: "Filament", notes: "" };
  const date = el("input", { class: "input", type: "date", value: e0.date });
  const desc = el("input", { class: "input", type: "text", placeholder: "e.g. 1kg Grey Filament", value: e0.description });
  const amount = el("input", { class: "input", type: "number", step: "0.01", min: "0", placeholder: "0.00", value: e0.amount });
  const category = select(EXPENSE_CATEGORIES, e0.category);
  const notes = el("textarea", { class: "input", rows: "2", placeholder: "Optional notes" }, e0.notes || "");

  const filNote = el("div", { class: "note-box", style: "margin-top:4px" });
  const updateNote = () => {
    filNote.style.display = category.value === "Filament" ? "block" : "none";
    filNote.innerHTML = "<b>Heads up:</b> Filament is counted as a cost here once — when you buy it. Your per-sale landing cost is used for product margins only, so filament is never double-counted. Unused filament shows up on the Filament runway page.";
  };
  category.addEventListener("change", updateNote); updateNote();

  const grid = el("div", { class: "form-grid" },
    field("Date", date),
    field("Category", category),
    el("div", { class: "full" }, field("Description", desc)),
    field("Amount (£)", amount),
    el("div", {}, ""),
    el("div", { class: "full" }, field("Notes", notes)),
    el("div", { class: "full" }, filNote));

  const save = el("button", { class: "btn primary", onclick: async () => {
    if (!date.value) return toast("Pick a date", "err");
    if (!desc.value.trim()) return toast("Enter a description", "err");
    save.disabled = true; save.textContent = "Saving…";
    const payload = { date: date.value, description: desc.value, amount: parseFloat(amount.value) || 0, category: category.value, notes: notes.value };
    try {
      if (existing && existing.id) { await updateExpense(existing.id, payload); toast("Expense updated"); }
      else { await addExpense(payload); toast("Expense added"); }
      closeModal();
    } catch (err) { console.error(err); toast("Couldn't save — " + (err.message || err), "err"); save.disabled = false; save.textContent = "Save expense"; }
  } }, existing && existing.id ? "Save changes" : "Save expense");

  openModal({ title: existing && existing.id ? "Edit expense" : "Add expense", body: grid, width: 540,
    footer: [el("button", { class: "btn ghost", onclick: closeModal }, "Cancel"), save] });
}

// ---------- helpers ----------
function select(options, value) {
  const s = el("select", { class: "input" });
  for (const o of options) {
    const opt = el("option", { value: o }, o);
    if (o === value) opt.selected = true;
    s.append(opt);
  }
  return s;
}

// Item autocomplete from past sales: suggests items + typical landing cost.
function buildAutocomplete(input, wrap, onPick) {
  const sales = getState().sales || [];
  const byName = new Map();
  for (const s of sales) {
    const name = normaliseItem(s.item);
    if (!byName.has(name)) byName.set(name, { name, count: 0, lastLanding: s.landingCost });
    const rec = byName.get(name); rec.count += 1;
    if (s.landingCost) rec.lastLanding = s.landingCost;
  }
  const all = [...byName.values()].sort((a, b) => b.count - a.count);

  let list = null, active = -1, matches = [];
  const close = () => { if (list) { list.remove(); list = null; active = -1; } };
  const open = () => {
    const q = input.value.trim().toLowerCase();
    matches = (q ? all.filter((a) => a.name.toLowerCase().includes(q)) : all).slice(0, 7);
    close();
    if (!matches.length) return;
    list = el("div", { class: "ac-list" });
    matches.forEach((m, i) => {
      const row = el("div", { class: "ac-item" + (i === active ? " active" : ""),
        onmousedown: (ev) => { ev.preventDefault(); pick(m); } },
        el("span", {}, m.name),
        el("span", { class: "ac-meta" }, m.lastLanding ? `£${Number(m.lastLanding).toFixed(2)} landing` : `${m.count}×`));
      list.append(row);
    });
    wrap.append(list);
  };
  const pick = (m) => { input.value = m.name; close(); onPick && onPick({ item: m.name, landingCost: m.lastLanding }); };

  input.addEventListener("input", open);
  input.addEventListener("focus", open);
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if (!list) return;
    if (e.key === "ArrowDown") { active = Math.min(matches.length - 1, active + 1); open(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); open(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { pick(matches[active]); e.preventDefault(); }
    else if (e.key === "Escape") close();
  });
}
