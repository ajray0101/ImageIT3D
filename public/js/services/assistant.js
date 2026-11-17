// The ImageIT3D design assistant and the listing writer.
// If the server has an ANTHROPIC_API_KEY, requests go to /api/assistant (Claude).
// Otherwise the built-in keyword designer and listing templates answer.
import { PRESETS, TEMPLATES } from "../config/catalog.js";
import { deepCopy } from "../core/utils.js";
import { features, api } from "./api.js";
import { checkPrompt } from "../config/content-rules.js";

// Pull quoted text or "says HOME"-style words out of a message.
export function findText(text) {
  const q = text.match(/["\u201c']([^"\u201d']{1,24})["\u201d']/);
  if (q) return q[1].trim();
  const m = text.match(/\b(?:says|saying|reads|word|words|name|letters|text|initials)\s+([A-Za-z0-9][\w &!.'-]{0,40})/i);
  if (!m) return null;
  return m[1].split(/\s+(?:on|in|for|at|with|and)\s+/i)[0].replace(/[.!?,]+$/, "").slice(0, 24).trim();
}

const PRODUCT_WORDS = /\b(vase|flower|planter|pot|plant|succulent|cup|pen|pencil|holder|bowl|dish|catch|coaster|box|tray|organi[sz]er|tag|keychain|key|stand|phone|tablet|ipad)\b/;

// Built-in rule-based designer. Works offline; good enough for demos and tests.
export function localDesigner(text, current) {
  const t = text.toLowerCase();
  const words = findText(text);

  if (!PRODUCT_WORDS.test(t) && words !== null && current.template !== "imported") {
    const spec = deepCopy(current);
    spec.text = { ...current.text, content: words };
    return { reply: `Added "${words}" in raised letters. Adjust the size under Letters.`, model: spec };
  }

  const pick = /stand|phone|tablet|ipad/.test(t) ? "stand" : /tag|keychain|key chain|key ring/.test(t) ? "tag" : /coaster/.test(t) ? "coaster"
    : /planter|pot\b|succulent|plant/.test(t) ? "planter" : /pen|pencil|cup|holder/.test(t) ? "holder" : /bowl|dish|catch/.test(t) ? "bowl"
    : /box|tray|organi[sz]er/.test(t) ? "box" : /vase|flower/.test(t) ? "vase" : null;
  if (!pick) return { reply: "I can make vases, planters, pen holders, bowls, coasters, trays, keychain tags and phone stands. Which one is closest to what you have in mind?", model: null };

  const spec = deepCopy(PRESETS[pick]);
  const size = t.match(/(\d+(?:\.\d+)?)\s*(cm|mm|in)/);
  if (size) {
    const mm = parseFloat(size[1]) * (size[2] === "cm" ? 10 : size[2] === "in" ? 25.4 : 1);
    if (spec.template === "tag") spec.params.length = mm; else spec.params.height = mm;
  }
  if (spec.template === "vessel") {
    if (/hex/.test(t)) spec.params.sides = 6;
    if (/square/.test(t)) spec.params.sides = 4;
    if (/twist/.test(t)) spec.params.twist = 90;
    if (/rib/.test(t)) { spec.params.ribs = 24; spec.params.ribDepth = 1.5; }
  }
  if (/tablet|ipad/.test(t) && spec.template === "stand") Object.assign(spec.params, { width: 120, phoneGap: 14, height: 120 });
  spec.text = words !== null ? { content: words, size: 12, depth: 1 } : current.text;
  return { reply: `Here's a ${spec.name.toLowerCase()} to start from. Adjust it with the sliders or tell me what to change.`, model: spec };
}

// "Can you create a small dog please" -> "a small dog"
export function cleanRequest(text) {
  return text.trim()
    .replace(/^(please\s+)?(can|could|would)\s+you\s+/i, "")
    .replace(/^(i\s+(want|need|would like|'d like)|i'm\s+looking\s+for|create|make|generate|design|build|give\s+me|show\s+me)\s+(me\s+)?/i, "")
    .replace(/[\s,]*(please|thanks|thank you)[.!]*$/i, "")
    .replace(/[.!?]+$/, "")
    .trim() || text.trim();
}

// Returns { reply, model, generate, source }.
//  model:    a template spec to show right away
//  generate: a description to send to Meshy (for things the templates can't make)
export async function designReply({ text, spec, chat, hasImport }) {
  const verdict = checkPrompt(text);
  if (!verdict.allowed) return { reply: verdict.message, model: null, generate: null, source: "rules" };
  const f = await features();
  let result = null;

  if (f.assistant) {
    try {
      const turns = chat.filter((m, i) => !(i === 0 && m.role === "assistant")).slice(-12);
      const r = await api("/api/assistant/design", { method: "POST", body: { messages: turns, spec } });
      if (typeof r.reply === "string") {
        let model = r.model && TEMPLATES[r.model.template] ? r.model : null;
        if (model && model.template === "imported" && !hasImport) model = null;
        if (model && !model.text) model.text = spec.text;
        result = { reply: r.reply, model, generate: typeof r.generate === "string" && r.generate ? r.generate : null, source: "claude" };
      }
    } catch (e) {
      result = { ...localDesigner(text, spec), generate: null, source: "built-in", note: `Claude couldn't answer (${e.message}), so the built-in designer did.` };
    }
  }
  if (!result) result = { ...localDesigner(text, spec), generate: null, source: "built-in" };

  // Nothing in the templates fits: hand the description to Meshy if it's available.
  if (!result.model && !result.generate && result.source === "built-in" && f.meshy) {
    const description = cleanRequest(text);
    result = { ...result, reply: `I'll generate "${description}" with Meshy. This usually takes a few minutes.`, generate: description };
  } else if (!result.model && !result.generate && result.source === "built-in") {
    result.reply = "I can make vases, planters, pen holders, bowls, coasters, trays, keychain tags and phone stands. " +
      "To make anything else, like animals or figures, the project server needs a Meshy API key (MESHY_API_KEY in .env).";
  }
  if (result.generate && !f.meshy) {
    result = { ...result, generate: null, reply: result.reply + " (Generating custom shapes needs a Meshy API key on the server.)" };
  }
  if (result.generate && !checkPrompt(result.generate).allowed) {
    result = { reply: checkPrompt(result.generate).message, model: null, generate: null, source: "rules" };
  }
  return result;
}

// Template listing used when Claude isn't available.
export function fallbackListing({ spec, material, colorName, dims, notes, letters }) {
  const kind = { vessel: "Home Decor", tag: "Keychain", stand: "Desk Accessory", imported: "Decor Piece" }[spec.template];
  const title = `${spec.name}${letters ? ` "${letters}"` : ""}, 3D Printed ${material}, ${colorName}, ${kind}, ${dims.replace(/ /g, "")}`.slice(0, 140);
  const blurb = {
    imported: "A detailed display piece for a shelf, desk or collection.",
    vessel: "A clean, modern piece that adds shape and color to a shelf, desk or windowsill.",
    tag: "A sturdy, lightweight tag for keys, bags or gift wrapping.",
    stand: "Holds your phone at a comfortable viewing angle for video calls, recipes or notifications."
  }[spec.template];
  const description = `${spec.name} in ${colorName.toLowerCase()}, 3D printed to order in ${material}.\n\n` +
    (letters ? `Finished with "${letters}" in raised letters.\n\n` : "") + blurb + (notes ? `\n\n${notes}` : "") +
    `\n\nDetails\nSize: ${dims}\nMaterial: ${material}\nColor: ${colorName}\n\nBecause each piece is printed layer by layer, you may see fine layer lines. That's part of the handmade character.`;
  const tags = {
    imported: ["3d printed", "detailed model", "desk decor", "shelf decor", "display piece", "collectible", "unique gift", "home decor", "statue", "figurine", "made to order", "gift idea", "small sculpture"],
    vessel: ["3d printed vase", "modern decor", "minimalist", "home decor", "shelf decor", "desk decor", "gift for her", "housewarming", "geometric", "colorful decor", "plant lover", "unique gift", "made to order"],
    tag: ["keychain", "key tag", "3d printed", "gift tag", "bag tag", "custom keychain", "stocking stuffer", "small gift", "lightweight", "colorful", "made to order", "party favor", "key ring"],
    stand: ["phone stand", "desk accessory", "phone holder", "3d printed", "office decor", "work from home", "minimalist desk", "tech gift", "video call", "desk organizer", "gift for him", "gift for her", "made to order"]
  }[spec.template];
  return { title, description, tags: tags.join(", ") };
}

// Returns { listing, source }.
export async function writeListing(details) {
  if ((await features()).assistant) {
    try {
      const r = await api("/api/assistant/listing", { method: "POST", body: details });
      if (r && r.title) return { listing: { title: String(r.title), description: String(r.description || ""), tags: (r.tags || []).map(String).join(", ") }, source: "claude" };
    } catch (e) {
      return { listing: fallbackListing(details), source: "built-in", note: `Claude couldn't write it (${e.message}), so a template was used.` };
    }
  }
  return { listing: fallbackListing(details), source: "built-in" };
}
