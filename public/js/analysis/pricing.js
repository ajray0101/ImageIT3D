// LaunchIT3D price guidance: cost to make one + marketplace fees -> three price points.
import { MARKETS, COSTS } from "../config/catalog.js";

export function pricing(evaluation, { costs, market }) {
  const mk = MARKETS[market];
  const filament = evaluation.grams / 1000 * costs.filament;
  const machine = evaluation.hours * COSTS.machinePerHour;
  const labor = costs.laborMin / 60 * costs.laborRate;
  const pack = costs.packaging;
  const buffer = (filament + machine) * COSTS.failureBuffer;
  const cost = filament + machine + labor + pack + buffer;

  // Price where (price - fees) covers cost plus the margin. Rounded to end in .99.
  const tier = margin => {
    const raw = (cost * (1 + margin) + mk.fixed) / (1 - mk.pct);
    const price = Math.max(1.99, Math.ceil(raw) - 0.01);
    const fees = price * mk.pct + mk.fixed;
    return { price, fees, keep: price - fees - cost };
  };

  return {
    rows: [["Filament", filament], ["Printer time and power", machine], ["Your time", labor], ["Packaging", pack], ["Failed-print buffer (10%)", buffer]],
    cost,
    tiers: [["Budget", tier(0.5)], ["Recommended", tier(1.0)], ["Premium", tier(1.75)]],
    market: mk
  };
}
