// Simple in-memory per-IP limiter. Protects paid API credits during demos.
// Resets when the server restarts; swap for a shared store if you deploy multiple servers.
export function rateLimit({ max, windowMs = 3600_000, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now(), recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: message || "Too many requests. Try again later." });
    recent.push(now); hits.set(req.ip, recent);
    next();
  };
}
