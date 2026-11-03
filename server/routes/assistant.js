// /api/assistant/*  Claude-powered design chat and listing copy (optional).
// Without ANTHROPIC_API_KEY the front end uses its built-in designer instead.
import { Router } from "express";
import { config } from "../config.js";
import { asyncRoute, userError } from "../middleware/asyncRoute.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { complete, parseJSON } from "../services/anthropicClient.js";
import { DESIGN_PROMPT } from "../prompts/design.js";
import { LISTING_SYSTEM, listingPrompt } from "../prompts/listing.js";

const router = Router();
const str = (v, max) => String(v ?? "").slice(0, max);

router.use((req, res, next) => (config.anthropicKey ? next() : res.status(503).json({ error: "The server has no Anthropic API key." })));
router.use(rateLimit({ max: config.assistantMaxPerHour, message: "Assistant limit reached for this hour." }));

// Body: { messages: [{role, content}], spec } -> { reply, model }
router.post("/design", asyncRoute(async (req, res) => {
  const raw = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
  const turns = raw
    .filter(m => m && (m.role === "user" || m.role === "assistant"))
    .map(m => ({ role: m.role, content: str(m.content, 2000) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") throw userError(400, "Send the seller's message last.");
  const last = turns[turns.length - 1];
  last.content = `Current model: ${JSON.stringify(req.body?.spec || null).slice(0, 4000)}\n\nSeller says: ${last.content}`;

  const out = parseJSON(await complete({ system: DESIGN_PROMPT, messages: turns }));
  if (typeof out.reply !== "string") throw userError(502, "Claude's answer was missing a reply.");
  res.json({ reply: out.reply, model: out.model || null }); // the browser re-validates the model
}));

// Body: listing details from the browser -> { title, description, tags[] }
router.post("/listing", asyncRoute(async (req, res) => {
  const b = req.body || {};
  const d = {
    name: str(b.spec?.name, 60), template: str(b.template, 30), dims: str(b.dims, 40), material: str(b.material, 10),
    colorName: str(b.colorName, 30), letters: str(b.letters, 24), price: str(b.price, 12), notes: str(b.notes, 400),
    marketplace: str(b.marketplace, 30) || "Etsy"
  };
  const out = parseJSON(await complete({ system: LISTING_SYSTEM, messages: [{ role: "user", content: listingPrompt(d) }] }));
  res.json({
    title: str(out.title, 140),
    description: str(out.description, 5000),
    tags: (Array.isArray(out.tags) ? out.tags : []).slice(0, 13).map(t => str(t, 20))
  });
}));

export default router;
