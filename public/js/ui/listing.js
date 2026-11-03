// Step 4: marketplace title, description and tags.
import { $, money } from "../core/utils.js";
import { MARKETS, TEMPLATES } from "../config/catalog.js";
import { writeListing, fallbackListing } from "../services/assistant.js";

export function listingDetails(ctx) {
  const { state, current } = ctx;
  return {
    spec: state.spec, template: TEMPLATES[state.spec.template].label, material: state.material,
    colorName: ctx.colorName(), dims: ctx.dimsText(), notes: state.notes,
    letters: current.textInfo ? state.spec.text.content.trim() : "",
    marketplace: MARKETS[state.market].name, price: money(current.price.tiers[1][1].price)
  };
}

// Fill the listing from templates if the seller hasn't written one yet.
export function ensureListing(ctx) {
  if (!ctx.state.listing.title) { ctx.state.listing = fallbackListing(listingDetails(ctx)); fill(ctx); ctx.save(); }
}

function counts() {
  const tl = $("#lTitle").value.length;
  $("#cTitle").textContent = `${tl} / 140`; $("#cTitle").classList.toggle("over", tl > 140);
  const tags = $("#lTags").value.split(",").map(s => s.trim()).filter(Boolean), long = tags.filter(t => t.length > 20).length;
  $("#cTags").textContent = `${tags.length} / 13` + (long ? `, ${long} over 20 characters` : "");
  $("#cTags").classList.toggle("over", tags.length > 13 || long > 0);
}

function fill(ctx) {
  const l = ctx.state.listing;
  $("#lTitle").value = l.title; $("#lDesc").value = l.description; $("#lTags").value = l.tags;
  $("#sellerNotes").value = ctx.state.notes;
  counts();
}

export function init(ctx) {
  ["lTitle", "lDesc", "lTags"].forEach(id => $("#" + id).addEventListener("input", () => {
    ctx.state.listing = { title: $("#lTitle").value, description: $("#lDesc").value, tags: $("#lTags").value };
    counts(); ctx.save();
  }));
  $("#sellerNotes").addEventListener("input", e => { ctx.state.notes = e.target.value; ctx.save(); });

  $("#genListing").addEventListener("click", async () => {
    const btn = $("#genListing"), st = $("#listingStatus");
    btn.disabled = true; st.textContent = "Writing your listing…";
    const r = await writeListing(listingDetails(ctx));
    ctx.state.listing = r.listing; fill(ctx); ctx.save();
    st.textContent = r.note || (r.source === "claude" ? "Listing written. Edit anything before you post." : "Listing written from your model details.");
    btn.disabled = false;
  });

  document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    const el = $("#" + b.dataset.copy), label = b.textContent;
    try { await navigator.clipboard.writeText(el.value); b.textContent = "Copied"; }
    catch { el.select(); b.textContent = "Selected, press Ctrl+C"; }
    setTimeout(() => { b.textContent = label; }, 1600);
  }));
  fill(ctx);
}

export const render = fill;
