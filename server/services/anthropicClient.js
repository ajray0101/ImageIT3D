// Minimal Claude Messages API client. Docs: https://docs.claude.com/en/api/messages
import { config } from "../config.js";
import { userError } from "../middleware/asyncRoute.js";

export async function complete({ system, messages, maxTokens = 1000 }) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": config.anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: config.anthropicModel, max_tokens: maxTokens, system, messages })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = { 401: "Claude rejected the API key.", 429: "Claude is rate limiting requests. Wait a minute." }[r.status];
    throw userError(r.status === 401 ? 502 : r.status, msg || data.error?.message || "Claude didn't accept the request.");
  }
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

// Pull the first JSON object out of a reply (models sometimes wrap it in ``` fences).
export function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  if (s < 0 || e < s) throw userError(502, "Claude's answer wasn't in the expected format.");
  return JSON.parse(clean.slice(s, e + 1));
}
