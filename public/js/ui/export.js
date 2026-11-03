// Step 5: seller package download and the project library (when the server is running).
import { $ } from "../core/utils.js";
import { toSTL, buildPackage, downloadBlob } from "../services/exporter.js";
import { listProjects, getProject, createProject, updateProject, deleteProject } from "../services/projects.js";
import { ensureListing } from "./listing.js";

function renderFiles(ctx) {
  const c = ctx.current, f = [
    [`${ctx.slug()}.stl`, `3D model, ${c.analysis.tris.toLocaleString()} triangles, Z-up, millimeters`],
    ["listing.txt", ctx.state.listing.title ? "Title, description and tags" : "Title, description and tags (auto-written if you skipped step 4)"],
    ["printability-report.txt", "Every check with fixes"], ["pricing.csv", "Cost breakdown and three price points"],
    ["specs.json", "Model settings to reopen or rebuild it"]
  ];
  $("#fileList").replaceChildren(...f.map(([n, d]) => {
    const li = document.createElement("li"); li.innerHTML = "<code></code><span></span>";
    li.children[0].textContent = n; li.children[1].textContent = d;
    return li;
  }));
}

// ---- Project library ----
function projectPayload(ctx) {
  const s = ctx.state;
  return { name: s.spec.name, spec: s.spec, settings: { color: s.color, printer: s.printer, material: s.material, infill: s.infill, market: s.market, costs: s.costs, notes: s.notes }, listing: s.listing };
}

async function refreshLibrary(ctx) {
  const list = $("#projectList"), st = $("#libraryStatus");
  try {
    const items = await listProjects();
    list.replaceChildren(...items.map(p => {
      const li = document.createElement("li");
      li.innerHTML = `<div><code></code><span></span></div><div class="actions"><button class="btn ghost" data-act="load">Open</button><button class="btn ghost" data-act="del">Delete</button></div>`;
      li.querySelector("code").textContent = p.name;
      li.querySelector("span").textContent = "Saved " + new Date(p.updatedAt).toLocaleString();
      li.querySelector('[data-act="load"]').onclick = async () => {
        try { const full = await getProject(p.id); ctx.loadProject(full); st.textContent = `Opened ${full.name}.`; }
        catch (e) { st.textContent = e.message; }
      };
      li.querySelector('[data-act="del"]').onclick = async () => {
        if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
        try { await deleteProject(p.id); if (ctx.state.projectId === p.id) ctx.state.projectId = null; refreshLibrary(ctx); }
        catch (e) { st.textContent = e.message; }
      };
      return li;
    }));
    if (!items.length) st.textContent = "No saved projects yet.";
  } catch (e) { st.textContent = e.message; }
}

export function init(ctx) {
  const st = $("#exportStatus");
  $("#dlStl").addEventListener("click", () => {
    downloadBlob(`${ctx.slug()}.stl`, new Blob([toSTL(ctx.current.mesh, ctx.state.spec.name)], { type: "model/stl" }));
    st.textContent = `Saved ${ctx.slug()}.stl.`;
  });
  $("#dlZip").addEventListener("click", async () => {
    try {
      ensureListing(ctx);
      st.textContent = "Packing files…";
      const blob = await buildPackage({ state: ctx.state, current: ctx.current, colorName: ctx.colorName(), dims: ctx.dimsText(), slug: ctx.slug() });
      downloadBlob(`${ctx.slug()}-seller-package.zip`, blob);
      st.textContent = `Saved ${ctx.slug()}-seller-package.zip.`;
    } catch (e) { st.textContent = e.message; }
  });
  $("#startOver").addEventListener("click", () => ctx.startOver());

  if (!ctx.features.projects) return;
  $("#library").hidden = false;
  $("#saveProject").addEventListener("click", async () => {
    const ls = $("#libraryStatus");
    try {
      const data = projectPayload(ctx);
      const saved = ctx.state.projectId ? await updateProject(ctx.state.projectId, data) : await createProject(data);
      ctx.state.projectId = saved.id; ctx.save();
      ls.textContent = `Saved ${saved.name}.` + (ctx.state.spec.template === "imported" ? " Imported meshes aren't stored in the library yet; keep the original file." : "");
      refreshLibrary(ctx);
    } catch (e) {
      if (e.status === 404) { ctx.state.projectId = null; ls.textContent = "That project was deleted. Click Save again to create a new one."; }
      else ls.textContent = e.message;
    }
  });
  refreshLibrary(ctx);
}

export const render = renderFiles;
