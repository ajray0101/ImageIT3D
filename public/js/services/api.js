// Talks to our own server (server/). Every server feature is optional:
// if the page is opened without the server, features() reports everything off.
let featuresP = null;

export function features() {
  if (!featuresP) {
    featuresP = fetch("/api/health")
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then(j => ({ meshy: Boolean(j.meshy), assistant: Boolean(j.assistant), projects: Boolean(j.projects) }));
  }
  return featuresP;
}

// fetch wrapper that returns parsed JSON and throws an Error with the server's message.
export async function api(path, { method = "GET", body, raw = false } = {}) {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (raw && r.ok) return r;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Request failed (${r.status})`), { status: r.status });
  return data;
}
