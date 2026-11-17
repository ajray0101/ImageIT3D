// Turns a spec into a printable mesh. This is the single entry point for geometry.
// To add a template: write shapes/<name>.js and add a case to BUILDERS.
import { orient, mergeMesh, groundAndCenter, bounds } from "./mesh-utils.js";
import { buildVessel } from "./shapes/vessel.js";
import { buildTag } from "./shapes/tag.js";
import { buildStand } from "./shapes/stand.js";
import { buildImported } from "./shapes/imported.js";
import { addBase } from "./shapes/base.js";
import { placeText } from "./text.js";
import { PRESETS } from "../config/catalog.js";

const BUILDERS = {
  vessel: (spec) => buildVessel(spec.params),
  tag: (spec) => buildTag(spec.params),
  stand: (spec) => buildStand(spec.params),
  imported: (spec, imported) => buildImported(imported, spec.params)
};

// Returns { mesh, textInfo }. `imported` is the source mesh for the imported template.
export function buildModel(spec, imported = null) {
  // An imported spec without its source mesh (e.g. cleared browser storage) falls back to the default vase.
  if (spec.template === "imported" && !imported) spec = { ...PRESETS.vase, text: spec.text };
  let mesh = orient(BUILDERS[spec.template](spec, imported));
  if (spec.template === "imported" && spec.params.base) mesh = addBase(mesh);

  const textInfo = placeText(spec, mesh);
  if (textInfo) {
    const start = mesh.idx.length / 3;
    mesh = mergeMesh(mesh, textInfo);
    if (textInfo.flat) mesh.embeddedFrom = start; // ignore hidden letter undersides in the overhang check
  }

  if (spec.template === "stand") { // turn the front toward +Z (the default camera)
    for (let i = 0; i < mesh.pos.length; i += 3) { const x = mesh.pos[i]; mesh.pos[i] = mesh.pos[i + 2]; mesh.pos[i + 2] = -x; }
  }
  groundAndCenter(mesh);
  // Where the model itself sits (without any base), so a full-color version can be lined up with it.
  const box = mesh.modelBox
    ? { min: mesh.modelBox.min.map((v, k) => v + mesh.offset[k]), max: mesh.modelBox.max.map((v, k) => v + mesh.offset[k]) }
    : bounds(mesh.pos);
  mesh.frame = { height: box.max[1] - box.min[1], bottom: box.min[1], cx: (box.min[0] + box.max[0]) / 2, cz: (box.min[2] + box.max[2]) / 2 };
  if (mesh.base) mesh.base = { ...mesh.base, cx: mesh.base.cx + mesh.offset[0], cz: mesh.base.cz + mesh.offset[2] };
  return { mesh, textInfo };
}
