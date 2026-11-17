// ImageIT3D design chat: quick-start chips, conversation, and the send flow.
import { $ } from "../core/utils.js";
import { STARTERS } from "../config/catalog.js";
import { designReply } from "../services/assistant.js";
import { generateAndImport } from "./design-import.js";
import { addColors } from "./color.js";

const COLOR_INTENT = /\b(add|show|apply|paint|put|give)\b[^.?!]*\bcolou?rs?\b|\bin (full )?colou?r\b|\bcolou?r (it|this|him|her|them)\b/i;

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

// Generate with Meshy from the chat, showing progress in a live chat bubble.
async function runGeneration(ctx, description) {
  busy = true; $("#send").disabled = true;
  const bubble = document.createElement("div");
  bubble.className = "msg bot thinking";
  $("#chat").append(bubble); bubble.scrollIntoView({ block: "nearest" });
  try {
    const title = await generateAndImport(ctx, description, msg => { bubble.textContent = msg; });
    ctx.state.chat.push({ role: "assistant", content: `Here's your ${title.toLowerCase()}. I set it to 100 mm tall; adjust it under "Adjust shape by hand", then check printability.` +
      (/\b(colou?r|red|orange|yellow|green|blue|purple|pink|black|white|brown|gr[ae]y|gold|silver)\b/i.test(description) ? " This preview shows shape only. Say \"add colors\" to see it painted." : " Say \"add colors\" if you'd like to see it painted.") });
  } catch (err) {
    ctx.state.chat.push({ role: "assistant", content: err.message || "Meshy couldn't make that. Try describing it differently." });
  } finally {
    busy = false; $("#send").disabled = false;
    renderChat(ctx); ctx.save();
    $("#chat").lastElementChild.scrollIntoView({ block: "nearest" });
  }
}

// "Add colors" from the chat: paint the current Meshy model.
async function runColors(ctx, text) {
  busy = true; $("#send").disabled = true;
  const bubble = document.createElement("div");
  bubble.className = "msg bot thinking";
  $("#chat").append(bubble); bubble.scrollIntoView({ block: "nearest" });
  // A short "add colors" uses the original description; a longer message describes new colors.
  const custom = text.replace(COLOR_INTENT, "").replace(/\b(please|can you|could you|the|it|to|now)\b/gi, "").trim().split(/\s+/).filter(Boolean).length >= 3;
  try {
    await addColors(ctx, custom ? text : "", msg => { bubble.textContent = msg; });
    ctx.state.chat.push({ role: "assistant", content: "Here it is in color. Switch between Full color and Filament under the preview. The file you print is still one filament color; the colors are for previews and listing photos." });
  } catch (err) {
    ctx.state.chat.push({ role: "assistant", content: err.message || "Meshy couldn't add colors. Try again." });
  } finally {
    busy = false; $("#send").disabled = false;
    renderChat(ctx); ctx.save();
    $("#chat").lastElementChild.scrollIntoView({ block: "nearest" });
  }
}

async function send(ctx) {
  const box = $("#prompt"), text = box.value.trim();
  if (busy) return;
  if (!text) { box.focus(); return; }
  busy = true; $("#send").disabled = true; box.value = "";
  ctx.state.chat.push({ role: "user", content: text });
  renderChat(ctx);
  if (COLOR_INTENT.test(text) && ctx.features.meshy && ctx.state.meshyTask && ctx.state.spec.template === "imported") {
    busy = false; $("#send").disabled = false;
    return runColors(ctx, text);
  }
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
  if (result.generate) await runGeneration(ctx, result.generate);
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
