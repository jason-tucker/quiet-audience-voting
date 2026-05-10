// Stable per-film color so the same film appears in the same color across
// every view (timeline graph, vote bar, winner card, per-film modal).
//
// We derive the color from a deterministic hash of the filmId mapped to an
// HSL hue. Using the golden angle (≈137.508°) for hue spacing means even
// many films get visually distinct colors with minimal collision — this
// scales well past 50 films without needing a hand-curated palette.

const GOLDEN_ANGLE = 137.508;
const SATURATION = 68;
const LIGHTNESS = 55;

function hash(filmId: string): number {
  let h = 5381;
  for (let i = 0; i < filmId.length; i++) {
    h = ((h << 5) + h + filmId.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForFilm(filmId: string): string {
  const hue = (hash(filmId) * GOLDEN_ANGLE) % 360;
  return `hsl(${hue.toFixed(2)}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

export function colorWithAlpha(color: string, alpha: number): string {
  // For HSL colors we wrap as hsla.
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("hsl(")) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${a})`);
  }
  if (color.startsWith("hsla(")) {
    return color.replace(/, [\d.]+\)$/, `, ${a})`);
  }
  // Fallback for hex colors
  const aHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0");
  const base = color.length === 9 ? color.slice(0, 7) : color;
  return `${base}${aHex}`;
}
