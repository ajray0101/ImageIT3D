// ImageIT3D design chat: quick-start chips, conversation, and the send flow.
import { $ } from "../core/utils.js";
import { STARTERS } from "../config/catalog.js";
import { designReply } from "../services/assistant.js";

let busy = false;

function renderChat(ctx) {
  const chatEl = $("#chat");
  chatEl.replaceChildren(...ctx.state.chat.map(m => {
    const d = document.createElement("div");
    d.className = "msg " + (m.role === "user" ? "user" : "bot");
    d.textContent = m.content;
    return d;
  }));
}

async function send(ctx) {
  const box = $("#prompt"), text = box.value.trim();
  if (busy) return;
  if (!text) { box.focus(); return; }
  busy = true; $("#send").disabled = true; box.value = "";
  ctx.state.chat.push({ role: "user", content: text });
  renderChat(ctx);
  const think = document.createElement("div");
  think.className = "msg bot thinking"; think.textContent = "Thinking…";
  $("#chat").append(think); think.scrollIntoView({ block: "nearest" });

  const result = await designReply({ text, spec: ctx.state.spec, chat: ctx.state.chat, hasImport: Boolean(ctx.imported) });
  if (result.note) $("#aiNote").textContent = result.note;
  ctx.state.chat.push({ role: "assistant", content: result.reply });
  renderChat(ctx);
  $("#chat").lastElementChild.scrollIntoView({ block: "nearest" });
  busy = false; $("#send").disabled = false;

  if (result.model) ctx.setSpec(result.model, { animate: true, resetListing: true });
  else ctx.save();
}

export function init(ctx) {
  STARTERS.forEach(label => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = label;
    b.onclick = () => { $("#prompt").value = label; send(ctx); };
    $("#starters").append(b);
  });
  $("#send").addEventListener("click", () => send(ctx));
  $("#prompt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(ctx); } });
  $("#aiNote").textContent = ctx.features.assistant
    ? "Design chat and listing copy are written by Claude through the project server."
    : "A built-in designer handles the chat. Add ANTHROPIC_API_KEY to .env to use Claude.";
  renderChat(ctx);
}

export const render = renderChat;
