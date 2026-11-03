// Prompt for marketplace listing copy.
export const LISTING_SYSTEM = "You write marketplace listings for small, non-technical sellers of 3D printed products. Reply with ONLY a JSON object.";

export function listingPrompt(d) {
  return `Write a ${d.marketplace} listing for a 3D printed product.
Product: ${d.name} (${d.template} template)
Size: ${d.dims} (width × depth × height)
Material: ${d.material}. Color: ${d.colorName}.
Raised letters: ${d.letters ? `"${d.letters}"` : "none"}
Suggested price: ${d.price}
Seller notes: ${d.notes || "none"}
Rules: title at most 140 characters, front-load the words buyers search. Description: plain text, 2-3 short paragraphs, then a "Details" section with size, material and color on separate lines. Mention it is 3D printed and may show fine layer lines. No emojis, no made-up claims (no "dishwasher safe", "food safe" or "waterproof" unless the notes say so). No brand names or character names. Exactly 13 tags, each 20 characters or fewer, lowercase.
JSON shape: {"title": "...", "description": "...", "tags": ["...", ...]}`;
}
