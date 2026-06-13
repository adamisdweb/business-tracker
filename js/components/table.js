// Generic sortable table with optional row actions.
import { el, clear } from "../utils.js";

// columns: [{ key, label, num?, render(row)->Node|string, sortVal(row)->any, width? }]
// opts: { rows, columns, initialSort:{key,dir}, rowActions(row)->Node[], emptyText }
export function dataTable({ rows, columns, initialSort, rowActions, emptyText = "Nothing here yet." }) {
  let sortKey = initialSort?.key || columns[0].key;
  let sortDir = initialSort?.dir || "desc";

  const wrap = el("div", { class: "table-wrap card" });
  const table = el("table", { class: "data" });
  const thead = el("thead");
  const tbody = el("tbody");
  table.append(thead, tbody);
  wrap.append(table);

  function header() {
    clear(thead);
    const tr = el("tr");
    for (const c of columns) {
      const ind = sortKey === c.key ? el("span", { class: "sort-ind" }, sortDir === "desc" ? "↓" : "↑") : "";
      const th = el("th", { class: c.num ? "num" : "", onclick: () => {
        if (sortKey === c.key) sortDir = sortDir === "desc" ? "asc" : "desc";
        else { sortKey = c.key; sortDir = c.num ? "desc" : "asc"; }
        draw();
      } }, c.label, ind);
      tr.append(th);
    }
    if (rowActions) tr.append(el("th", { class: "num" }, ""));
    thead.append(tr);
  }

  function draw() {
    header();
    clear(tbody);
    const col = columns.find((c) => c.key === sortKey) || columns[0];
    const val = col.sortVal || ((r) => r[col.key]);
    const sorted = [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      let cmp = typeof va === "string" ? String(va).localeCompare(String(vb)) : (va - vb);
      return sortDir === "desc" ? -cmp : cmp;
    });
    if (!sorted.length) {
      tbody.append(el("tr", { class: "empty-row" }, el("td", { colspan: String(columns.length + (rowActions ? 1 : 0)) }, emptyText)));
      return;
    }
    for (const r of sorted) {
      const tr = el("tr");
      for (const c of columns) {
        const content = c.render ? c.render(r) : r[c.key];
        tr.append(el("td", { class: c.num ? "num" : "" }, content instanceof Node ? content : String(content ?? "")));
      }
      if (rowActions) {
        const acts = el("div", { class: "row-actions" });
        rowActions(r).forEach((a) => acts.append(a));
        tr.append(el("td", { class: "num" }, acts));
      }
      tbody.append(tr);
    }
  }

  draw();
  return wrap;
}
