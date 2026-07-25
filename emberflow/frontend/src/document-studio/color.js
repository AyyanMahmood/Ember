// Small, dependency-free color-manipulation helpers. Used to derive a full
// coherent palette (primary / accent / secondary / soft tint / on-color text)
// from the single brand color stored on the profile (profiles.invoice_brand_color),
// rather than requiring separate primary/accent/secondary columns in the database.

function hexToRgb(hex) {
  const clean = (hex || '#2563eb').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

export function adjustLightness(hex, delta) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
  return rgbToHex(hslToRgb(hsl));
}

export function adjustSaturation(hex, delta) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.s = Math.max(0, Math.min(1, hsl.s + delta));
  return rgbToHex(hslToRgb(hsl));
}

export function rotateHue(hex, degrees) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = (hsl.h + degrees + 360) % 360;
  return rgbToHex(hslToRgb(hsl));
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// WCAG relative luminance -> pick readable black/white text for a given fill.
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA) + 0.05;
  const l2 = relativeLuminance(hexB) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

export function readableTextColor(bgHex, { dark = '#171412', light = '#FFFFFF' } = {}) {
  return contrastRatio(bgHex, light) >= contrastRatio(bgHex, dark) ? light : dark;
}

export function isValidHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || '');
}

/**
 * Derive a full brand palette from a single stored hex color. Keeps the whole
 * document system on ONE accent hue (no clashing colors) while still giving
 * templates primary/accent/secondary/soft/on-color roles to work with.
 *
 * `accentOverride` (Brand Studio's optional "custom accent") only ever
 * replaces the derived `accent` role -- primary/secondary/soft/onPrimary
 * still come from the one base hex, so an override can't reintroduce the
 * clashing-color problem this whole one-color system exists to prevent.
 */
export function derivePalette(baseHex, accentOverride) {
  const base = isValidHex(baseHex) ? baseHex : '#2563EB';
  const primary = base;
  const primaryDark = adjustLightness(base, -0.14);
  const primaryLight = adjustLightness(base, 0.16);
  const accent = isValidHex(accentOverride) ? accentOverride : adjustLightness(rotateHue(base, 8), 0.06);
  const secondary = adjustSaturation(adjustLightness(base, 0.3), -0.35);
  const soft = withAlpha(base, 0.1);
  const softStrong = withAlpha(base, 0.16);
  const onPrimary = readableTextColor(primary);

  return {
    primary,
    primaryDark,
    primaryLight,
    accent,
    secondary,
    soft,
    softStrong,
    onPrimary,
  };
}
