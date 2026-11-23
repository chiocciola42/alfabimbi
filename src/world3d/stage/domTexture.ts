import { cssToRgba, type SkinStyle } from './skinStyle';

/** Firma del contenuto: se non cambia non serve ridisegnare la texture. */
export function contentSignature(el: HTMLElement, w: number, h: number, st: SkinStyle, focused: boolean): string {
  return `${Math.round(w)}x${Math.round(h)}|${el.textContent}|${st.solid.r},${st.solid.g},${st.solid.b},${st.hasBg}|${st.borderColor.r},${st.borderColor.g},${st.borderColor.b}|${st.borderWidth}|${st.radius}|${focused}|${el.className}`;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const rgb = (c: { r: number; g: number; b: number }, a = 1) => `rgba(${c.r},${c.g},${c.b},${a})`;

/**
 * Disegna l'elemento (sfondo, bordo, testo ed emoji dei suoi nodi di testo) in un canvas 2D,
 * che diventa la faccia anteriore del gettone 3D. Le icone SVG non vengono riprodotte.
 */
export function paintElement(canvas: HTMLCanvasElement, el: HTMLElement, w: number, h: number, st: SkinStyle, focused: boolean, scale: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = Math.max(2, Math.ceil(w * scale));
  canvas.height = Math.max(2, Math.ceil(h * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Se l'elemento è ingrandito da una transform (scale-105…), misure e caratteri crescono con lui.
  const k = el.offsetWidth > 0 ? w / el.offsetWidth : 1;
  st = { ...st, radius: st.radius * k, borderWidth: st.borderWidth * k };

  if (st.hasBg) {
    roundedRectPath(ctx, 0, 0, w, h, st.radius);
    ctx.fillStyle = rgb(st.solid);
    ctx.fill();
    // Un velo di luce in alto dà l'effetto "plastica" senza cambiare il colore.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.08)');
    roundedRectPath(ctx, 0, 0, w, h, st.radius);
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (st.borderWidth > 0 && st.borderColor.a > 0 && st.borderStyle !== 'none') {
    const half = st.borderWidth / 2;
    roundedRectPath(ctx, half, half, w - st.borderWidth, h - st.borderWidth, st.radius - half);
    ctx.lineWidth = st.borderWidth;
    ctx.strokeStyle = rgb(st.borderColor, st.borderColor.a);
    ctx.setLineDash(st.borderStyle === 'dashed' ? [st.borderWidth * 3, st.borderWidth * 2] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (focused) {
    roundedRectPath(ctx, 2, 2, w - 4, h - 4, st.radius);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2563eb';
    ctx.stroke();
  }

  const box = el.getBoundingClientRect();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const pcs = getComputedStyle(parent);
    if (pcs.visibility === 'hidden' || pcs.display === 'none') continue;
    const color = cssToRgba(pcs.color);
    const fs = (parseFloat(pcs.fontSize) || 16) * k;
    ctx.font = `${pcs.fontStyle} ${pcs.fontWeight} ${fs}px ${pcs.fontFamily}`;
    ctx.fillStyle = rgb(color, color.a * (parseFloat(pcs.opacity) || 1));
    ctx.textBaseline = 'alphabetic';
    const upper = pcs.textTransform === 'uppercase';
    const lower = pcs.textTransform === 'lowercase';
    range.selectNodeContents(node);
    // Un riquadro per riga: il testo a capo viene scomposto con un intervallo per ogni parola.
    const raw = node.textContent ?? '';
    let idx = 0;
    const words = raw.split(/(\s+)/);
    for (const part of words) {
      const start = idx;
      idx += part.length;
      if (!part.trim()) continue;
      range.setStart(node, start);
      range.setEnd(node, idx);
      const r = range.getClientRects()[0];
      if (!r) continue;
      const shown = upper ? part.toUpperCase() : lower ? part.toLowerCase() : part;
      ctx.fillText(shown, r.left - box.left, r.top - box.top + r.height / 2 + fs * 0.34);
    }
  }
}
