// 3D preview: printer bed, build-volume outline, and the model with a
// bottom-to-top "printing" reveal when a new model is generated.
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const easeOut = t => 1 - Math.pow(1 - t, 3);

export function createViewer(container, { color }) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.495;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(200, 400, 250); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25); fill.position.set(-300, 150, -200); scene.add(fill);

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, clippingPlanes: [clip], side: THREE.DoubleSide });
  let mesh = null, bed = null, printer = null, reveal = 1;
  // Full-color model from Meshy (textured GLB scene), shown instead of the filament-colored mesh.
  const colorOuter = new THREE.Group(), colorInner = new THREE.Group();
  colorOuter.add(colorInner); colorOuter.visible = false; scene.add(colorOuter);
  let hasColor = false, colorOn = false, colorTurn = 0, frame = null;
  // In full-color view the printable mesh is hidden, so the display base (if any) is drawn separately.
  let baseMesh = null;

  // Place the color model exactly where the printable model is: same tilt, height and position.
  function fitColor() {
    if (!hasColor || !frame) return;
    colorInner.rotation.set(colorTurn * Math.PI / 180, 0, 0);
    colorOuter.scale.setScalar(1); colorOuter.position.set(0, 0, 0); colorOuter.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(colorInner);
    colorOuter.scale.setScalar(frame.height / Math.max(box.max.y - box.min.y, 1e-6));
    colorOuter.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(colorInner);
    colorOuter.position.set(frame.cx - (box.min.x + box.max.x) / 2, frame.bottom - box.min.y, frame.cz - (box.min.z + box.max.z) / 2);
  }
  function applyVisibility() {
    const color = hasColor && colorOn;
    colorOuter.visible = color;
    if (mesh) mesh.visible = !color;
    if (baseMesh) baseMesh.visible = color;
  }
  function setBase(base) {
    if (baseMesh) { scene.remove(baseMesh); baseMesh.geometry.dispose(); baseMesh = null; }
    if (!base) return;
    baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(base.radius, base.radius, base.thickness, 72), material);
    baseMesh.position.set(base.cx, base.thickness / 2, base.cz);
    scene.add(baseMesh);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  function drawBed() {
    if (bed) { scene.remove(bed); bed.traverse(o => o.geometry && o.geometry.dispose()); }
    if (!printer) return;
    const pr = printer; bed = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(pr.x, pr.y), new THREE.MeshStandardMaterial({ color: css("--grid2"), roughness: 0.9 }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = -0.4; bed.add(plate);
    const lines = [];
    for (let x = -pr.x / 2; x <= pr.x / 2 + 0.01; x += 10) lines.push(x, 0, -pr.y / 2, x, 0, pr.y / 2);
    for (let z = -pr.y / 2; z <= pr.y / 2 + 0.01; z += 10) lines.push(-pr.x / 2, 0, z, pr.x / 2, 0, z);
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    bed.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: css("--grid"), transparent: true, opacity: 0.7 })));
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(pr.x, pr.z, pr.y)), new THREE.LineDashedMaterial({ color: css("--grid"), dashSize: 6, gapSize: 4 }));
    box.position.y = pr.z / 2; box.computeLineDistances(); bed.add(box);
    scene.add(bed);
  }

  function applyTheme() { scene.background = new THREE.Color(css("--stage") || "#E4EAE8"); drawBed(); }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  applyTheme();

  (function loop() {
    requestAnimationFrame(loop);
    if (reveal < 1 && mesh) {
      reveal = Math.min(1, reveal + 1 / 70);
      clip.constant = reveal >= 1 ? 1e4 : mesh.userData.h * easeOut(reveal) + 0.01;
    }
    controls.update(); renderer.render(scene, camera);
  })();

  return {
    // object: a three.js scene from a textured GLB, or null to remove it. turn: the model's tip-over angle.
    setColorModel(object, turn = 0) {
      colorInner.clear();
      hasColor = Boolean(object);
      if (object) { colorInner.add(object); colorTurn = turn; fitColor(); }
      applyVisibility();
    },
    setColorMode(on) { colorOn = on; applyVisibility(); },
    setColorTurn(turn) { colorTurn = turn; fitColor(); },
    setPrinter(p) { printer = p; drawBed(); },
    setColor(hex) { material.color.set(hex); },
    // Show a mesh ({pos, idx}). animate: reframe the camera and play the print reveal.
    showMesh(m, animate = false) {
      if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(m.pos, 3)); g.setIndex(new THREE.BufferAttribute(m.idx, 1));
      const flat = g.toNonIndexed(); flat.computeVertexNormals(); g.dispose();
      mesh = new THREE.Mesh(flat, material);
      flat.computeBoundingBox(); const bb = flat.boundingBox; mesh.userData.h = bb.max.y;
      scene.add(mesh);
      frame = m.frame || null;
      setBase(m.base || null);
      fitColor(); applyVisibility();
      if (animate) {
        const size = bb.getSize(new THREE.Vector3()), r = Math.max(size.x, size.y, size.z, 40);
        controls.target.set(0, size.y / 2, 0);
        camera.position.set(r * 1.25, size.y / 2 + r * 0.9, r * 1.6);
        if (!reduceMotion) { reveal = 0; clip.constant = 0; }
      }
    }
  };
}
