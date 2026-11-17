// Reference data: product templates, presets, colors, printers, materials, marketplaces.
// Add a printer, material or marketplace here and the UI picks it up automatically.
// To add a new product shape, see docs/ARCHITECTURE.md ("Adding a template").

export const TEMPLATES = {
  vessel: { label: "Vessel", params: {
    height:       { label: "Height", unit: "mm", min: 5, max: 250, step: 1, def: 150 },
    radiusBottom: { label: "Bottom radius", unit: "mm", min: 12, max: 120, step: 1, def: 38 },
    radiusTop:    { label: "Top radius", unit: "mm", min: 12, max: 120, step: 1, def: 45 },
    bulge:        { label: "Belly", unit: "%", min: 0, max: 40, step: 1, def: 15 },
    sides:        { label: "Sides (0 = round)", unit: "", min: 0, max: 12, step: 1, def: 0 },
    ribs:         { label: "Ribs", unit: "", min: 0, max: 48, step: 1, def: 24 },
    ribDepth:     { label: "Rib depth", unit: "mm", min: 0, max: 6, step: 0.5, def: 1.5 },
    twist:        { label: "Twist", unit: "°", min: 0, max: 180, step: 5, def: 60 },
    wall:         { label: "Wall thickness", unit: "mm", min: 0.6, max: 8, step: 0.1, def: 2 },
    floor:        { label: "Floor thickness", unit: "mm", min: 1, max: 10, step: 0.5, def: 3 }
  }},
  tag: { label: "Tag", params: {
    length:    { label: "Length", unit: "mm", min: 30, max: 100, step: 1, def: 55 },
    width:     { label: "Width", unit: "mm", min: 15, max: 45, step: 1, def: 25 },
    thickness: { label: "Thickness", unit: "mm", min: 0.8, max: 6, step: 0.2, def: 3 },
    corner:    { label: "Corner rounding", unit: "mm", min: 0, max: 12, step: 0.5, def: 5 },
    hole:      { label: "Key ring hole radius", unit: "mm", min: 1.5, max: 6, step: 0.5, def: 2.5 }
  }},
  stand: { label: "Stand", params: {
    width:     { label: "Width", unit: "mm", min: 30, max: 140, step: 1, def: 70 },
    angle:     { label: "Lean angle", unit: "°", min: 45, max: 80, step: 1, def: 65 },
    height:    { label: "Back support length", unit: "mm", min: 40, max: 160, step: 1, def: 90 },
    thickness: { label: "Thickness", unit: "mm", min: 2, max: 10, step: 0.5, def: 5 },
    phoneGap:  { label: "Device slot", unit: "mm", min: 6, max: 25, step: 1, def: 12 },
    lip:       { label: "Front lip height", unit: "mm", min: 5, max: 25, step: 1, def: 10 }
  }},
  imported: { label: "Imported model", params: {
    height: { label: "Height", unit: "mm", min: 10, max: 250, step: 1, def: 100 },
    turn:   { label: "Tip over", unit: "°", min: 0, max: 270, step: 90, def: 0 },
    base:   { label: "Display base (0 = off, 1 = on)", unit: "", min: 0, max: 1, step: 1, def: 0 }
  }}
};

export const PRESETS = {
  vase:    { template: "vessel", name: "Ribbed twist vase", params: { height: 150, radiusBottom: 38, radiusTop: 45, bulge: 15, sides: 0, ribs: 24, ribDepth: 1.5, twist: 60, wall: 2, floor: 3 } },
  planter: { template: "vessel", name: "Tapered planter", params: { height: 90, radiusBottom: 40, radiusTop: 55, bulge: 0, sides: 0, ribs: 0, ribDepth: 0, twist: 0, wall: 2.4, floor: 3 } },
  holder:  { template: "vessel", name: "Hex pen holder", params: { height: 100, radiusBottom: 34, radiusTop: 34, bulge: 0, sides: 6, ribs: 0, ribDepth: 0, twist: 30, wall: 2, floor: 3 } },
  bowl:    { template: "vessel", name: "Catch-all bowl", params: { height: 45, radiusBottom: 30, radiusTop: 70, bulge: 0, sides: 0, ribs: 12, ribDepth: 1, twist: 0, wall: 2.2, floor: 2.5 } },
  coaster: { template: "vessel", name: "Hex coaster", params: { height: 6, radiusBottom: 46, radiusTop: 46, bulge: 0, sides: 6, ribs: 0, ribDepth: 0, twist: 0, wall: 3, floor: 3.5 } },
  box:     { template: "vessel", name: "Desk organizer tray", params: { height: 55, radiusBottom: 50, radiusTop: 50, bulge: 0, sides: 4, ribs: 0, ribDepth: 0, twist: 0, wall: 2, floor: 2 } },
  tag:     { template: "tag", name: "Keychain tag", params: { length: 55, width: 25, thickness: 3, corner: 5, hole: 2.5 } },
  stand:   { template: "stand", name: "Phone stand", params: { width: 70, angle: 65, height: 90, thickness: 5, phoneGap: 12, lip: 10 } }
};

// Quick-start chips in the Design chat.
export const STARTERS = [
  "A ribbed vase about 15 cm tall",
  "A small dog sitting",
  "Coaster that says HOME",
  "Phone stand for my desk",
  "Keychain tag for gifts",
  "Small planter for succulents"
];

export const COLORS = [
  { name: "Marigold", hex: "#F2A900" }, { name: "Ocean blue", hex: "#2B6CB0" }, { name: "Sage green", hex: "#7FA37A" },
  { name: "Coral", hex: "#E9725A" }, { name: "Charcoal", hex: "#3A3F44" }, { name: "Snow white", hex: "#F3F3EF" }
];

// Build volumes in mm.
export const PRINTERS = {
  a1:     { name: "Bambu Lab A1", x: 256, y: 256, z: 256 },
  mk4:    { name: "Prusa MK4", x: 250, y: 210, z: 220 },
  ender3: { name: "Creality Ender-3 V3 SE", x: 220, y: 220, z: 250 },
  mini:   { name: "Bambu Lab A1 mini", x: 180, y: 180, z: 180 }
};

// density in g/cm³, cost in $ per kg (default for the Price step)
export const MATERIALS = {
  PLA:  { density: 1.24, cost: 22 },
  PETG: { density: 1.27, cost: 24 }
};

// Fee estimates: pct of sale + fixed $ per order. Marketplaces change fees; check before relying on these.
export const MARKETS = {
  etsy: { name: "Etsy", pct: 0.095, fixed: 0.45, note: "Etsy estimate: 6.5% transaction fee, about 3% + $0.25 payment processing, and the $0.20 listing fee." },
  ebay: { name: "eBay", pct: 0.136, fixed: 0.40, note: "eBay estimate: final value fee around 13.6% plus a per-order fee of about $0.40." },
  shop: { name: "My own shop", pct: 0.029, fixed: 0.30, note: "Own shop estimate: card processing at about 2.9% + $0.30. Platform subscriptions are not included." }
};

// Printer running cost per hour (power and wear) and the failed-print buffer share.
export const COSTS = { machinePerHour: 0.35, failureBuffer: 0.10 };
