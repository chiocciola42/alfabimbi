import { moodOfColor, type Mood } from './animations';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

let probe: CanvasRenderingContext2D | null = null;

/** Converte qualsiasi colore CSS (anche oklch/color-mix di Tailwind v4) in sRGB passando da un canvas 1x1. */
export function cssToRgba(value: string): Rgba {
  if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (!probe) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    probe = c.getContext('2d', { willReadFrequently: true });
  }
  if (!probe) return { r: 255, g: 255, b: 255, a: 1 };
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  const a = d[3] / 255;
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return { r: Math.round(d[0] / a), g: Math.round(d[1] / a), b: Math.round(d[2] / a), a };
}

export interface SkinStyle {
  bg: Rgba;
  /** Colore pieno dopo aver composto lo sfondo sui genitori opachi. */
  solid: Rgba;
  hasBg: boolean;
  borderColor: Rgba;
  borderWidth: number;
  borderStyle: string;
  radius: number;
  opacity: number;
  mood: Mood;
}

function blend(top: Rgba, under: Rgba): Rgba {
  const a = top.a + under.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, u: number) => Math.round((t * top.a + u * under.a * (1 - top.a)) / a);
  return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a };
}

/** Colore effettivo sotto l'elemento: il primo antenato con sfondo pieno (o il crema della pagina). */
function backdrop(el: Element): Rgba {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const c = cssToRgba(getComputedStyle(p).backgroundColor);
    if (c.a >= 0.95) return c;
    if (c.a > 0) return blend(c, backdrop(p));
  }
  return { r: 255, g: 251, b: 235, a: 1 };
}

export function readSkinStyle(el: HTMLElement, fallbackColor?: string): SkinStyle {
  const cs = getComputedStyle(el);
  const bg = cssToRgba(cs.backgroundColor);
  const hasGradient = cs.backgroundImage && cs.backgroundImage !== 'none';
  let solid = bg;
  let hasBg = bg.a > 0.02;
  if (!hasBg && hasGradient && fallbackColor) {
    solid = cssToRgba(fallbackColor);
    hasBg = true;
  } else if (hasBg && bg.a < 0.99) {
    solid = blend(bg, backdrop(el));
  }
  const borderWidth = parseFloat(cs.borderTopWidth) || 0;
  const radiusRaw = parseFloat(cs.borderTopLeftRadius) || 0;
  return {
    bg,
    solid,
    hasBg,
    borderColor: cssToRgba(cs.borderTopColor),
    borderWidth,
    borderStyle: cs.borderTopStyle,
    radius: radiusRaw,
    opacity: parseFloat(cs.opacity) || 1,
    mood: hasBg ? moodOfColor(solid.r, solid.g, solid.b) : 'neutral',
  };
}
