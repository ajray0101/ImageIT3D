// Small helpers shared across the front end.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const money = v => "$" + v.toFixed(2);
export const fmtHours = h => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
export const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const deepCopy = v => JSON.parse(JSON.stringify(v));
