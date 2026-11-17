// What ImageIT3D will not make. Used in the browser (instant feedback) AND on the
// server (the real gate, since browser checks can be bypassed). Meshy's own
// moderation is a third layer after these.
//
// Keyword lists can't catch everything: they are a first filter, not the only one.
// To change a rule, edit the lists below and add a case to tests/content.test.js.

const CATEGORIES = {
  sexual: [
    "sex", "sexy", "sexual", "nude", "nudes", "naked", "nsfw", "porn", "porno", "pornographic", "erotic", "fetish",
    "genital", "genitals", "penis", "vagina", "boob", "boobs", "breasts", "nipple", "nipples", "dildo", "vibrator",
    "lingerie", "stripper", "hentai", "xxx", "topless", "orgasm", "bdsm"
  ],
  violence: [
    "gore", "gory", "bloody", "corpse", "corpses", "dead body", "decapitated", "decapitation", "beheaded", "dismembered",
    "mutilated", "mutilation", "torture", "tortured", "murder", "murdered", "massacre", "severed head", "severed hand",
    "suicide", "self harm", "self-harm", "noose", "school shooting", "mass shooting", "terrorist", "terrorism"
  ],
  weapons: [
    "gun", "guns", "firearm", "firearms", "pistol", "pistols", "rifle", "rifles", "shotgun", "handgun", "revolver",
    "lower receiver", "upper receiver", "gun receiver", "suppressor", "silencer", "ghost gun", "glock", "ar-15", "ar15",
    "ak-47", "ak47", "ammo", "ammunition", "gun magazine", "rifle magazine", "auto sear", "drop in auto sear",
    "grenade", "bomb", "bombs", "explosive", "explosives", "detonator", "missile", "knife", "knives", "dagger",
    "switchblade", "brass knuckles", "knuckle duster", "weapon", "weapons", "taser", "crossbow"
  ],
  hate: [
    "swastika", "nazi", "nazis", "kkk", "ku klux klan", "white power", "white supremacy", "hate symbol", "sieg heil"
  ],
  drugs: [
    "bong", "bongs", "dab rig", "crack pipe", "meth pipe", "meth", "cocaine", "heroin", "fentanyl"
  ]
};

// Everyday products that contain a blocked word. These are removed before checking.
const SAFE_PHRASES = [
  "bath bomb", "bath bombs", "seed bomb", "seed bombs",
  "glue gun", "glue guns", "hot glue gun", "nail gun", "heat gun", "caulk gun", "caulking gun", "spray gun", "staple gun",
  "knife block", "knife holder", "knife rack", "knife stand", "knife sharpener", "butter knife holder"
];
const SAFE_RE = new RegExp("\\b(" + SAFE_PHRASES.sort((a, b) => b.length - a.length).join("|") + ")\\b", "gi");

const PATTERNS = Object.fromEntries(Object.entries(CATEGORIES).map(([cat, words]) => [
  cat,
  new RegExp("\\b(" + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[ -]/g, "[\\s-]?")).join("|") + ")\\b", "i")
]));

const LABELS = {
  sexual: "sexual content", violence: "violent or graphic content", weapons: "weapons or weapon parts",
  hate: "hate symbols", drugs: "drugs or drug equipment"
};

export const BLOCKED_MESSAGE =
  "ImageIT3D can't make that. It doesn't create sexual content, violent or graphic content, weapons or weapon parts, hate symbols, or drug equipment. Try describing something else.";

// Returns { allowed: true } or { allowed: false, category, label, message }.
export function checkPrompt(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[0@]/g, m => (m === "0" ? "o" : "a"))  // n0de -> node, @ -> a: catches simple swaps
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(SAFE_RE, " ");
  for (const [category, re] of Object.entries(PATTERNS)) {
    if (re.test(normalized)) return { allowed: false, category, label: LABELS[category], message: BLOCKED_MESSAGE };
  }
  return { allowed: true };
}
