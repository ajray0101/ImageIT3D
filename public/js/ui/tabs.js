// Step tabs (Design, Printability, Price, Listing, Export). Arrow keys move between tabs.
import { $, $$ } from "../core/utils.js";

export function init(ctx, { onSelect } = {}) {
  const tabs = $$('[role="tab"]');
  function selectTab(id) {
    tabs.forEach(t => {
      const on = t.id === "tab-" + id;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (onSelect) onSelect(id);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.id.slice(4)));
    t.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectTab(n.id.slice(4));
    });
  });
  $$("[data-go]").forEach(b => b.addEventListener("click", () => { selectTab(b.dataset.go); $("#tab-" + b.dataset.go).focus(); }));
  ctx.selectTab = selectTab;
}
