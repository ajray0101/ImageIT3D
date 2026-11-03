// Reads STL, OBJ and GLB files into the app's mesh format, scaled to 100 mm
// and centered. Uses the three.js loaders loaded in index.html.
import { weld } from "../geometry/mesh-utils.js";

export const MAX_TRIANGLES = 600000;

function collectGeoms(root) {
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (o.isMesh && o.geometry && o.geometry.getAttribute("position")) {
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); out.push(g);
    }
  });
  return out;
}

export async function parseModel(buf, ext) {
  let geoms;
  if (ext === "stl") { const g = new THREE.STLLoader().parse(buf); g.rotateX(-Math.PI / 2); geoms = [g]; } // STL is Z-up
  else if (ext === "obj") geoms = collectGeoms(new THREE.OBJLoader().parse(new TextDecoder().decode(buf)));
  else if (ext === "glb") { const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().parse(buf, "", res, rej)); geoms = collectGeoms(gltf.scene); }
  else throw new Error("Use an STL, OBJ or GLB file.");
  if (!geoms.length) throw new Error("That file has no 3D mesh in it.");

  const all = [];
  for (const g of geoms) {
    const ng = g.index ? g.toNonIndexed() : g, a = ng.getAttribute("position");
    for (let i = 0; i < a.count; i++) all.push(a.getX(i), a.getY(i), a.getZ(i));
  }
  const tris = all.length / 9;
  if (tris > MAX_TRIANGLES) throw new Error(`This model has ${Math.round(tris / 1000)}k triangles, too many to check in the browser. Lower the polycount (under 300k) and try again.`);

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < all.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], all[i + k]); max[k] = Math.max(max[k], all[i + k]); }
  const k = 100 / Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-9);
  for (let i = 0; i < all.length; i += 3) for (let j = 0; j < 3; j++) all[i + j] = (all[i + j] - (min[j] + max[j]) / 2) * k;

  const tmp = new THREE.BufferGeometry();
  tmp.setAttribute("position", new THREE.Float32BufferAttribute(all, 3));
  const mesh = weld(tmp); tmp.dispose();
  return { mesh, tris };
}

export function nameFromFile(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, c => c.toUpperCase()).slice(0, 60) || "Imported Model";
}
