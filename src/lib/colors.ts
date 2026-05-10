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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sN = s / 100;
  const lN = l / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return lN - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

function srgbLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Returns "#000" or "#fff" — whichever gives better contrast against the
 * supplied color. Uses real perceived luminance (HSL → sRGB → relative
 * luminance) so yellow/green correctly pick black, blue/red correctly
 * pick white.
 */
export function contrastingTextColor(color: string): string {
  let rgb: [number, number, number] | null = null;

  const hsl = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if (hsl) {
    rgb = hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  } else {
    const hex = color.startsWith("#") ? color.slice(1, 7) : null;
    if (hex && hex.length === 6) {
      rgb = [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
  }

  if (!rgb) return "#ffffff";
  const lum = srgbLuminance(rgb);
  return lum > 0.45 ? "#000000" : "#ffffff";
}
