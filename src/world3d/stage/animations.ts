/** Funzioni pure per le animazioni dei gettoni 3D (t = secondi dall'inizio, durata fissa). */

export const POP_DURATION = 0.55;
export const SHAKE_DURATION = 0.5;

export type Mood = 'neutral' | 'good' | 'bad';

/** Impulso di scala/sollevamento: sale, supera, si assesta. t fuori da [0,1] vale 0. */
export function popCurve(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI) * (1 - t * 0.35);
}

/** Oscillazione smorzata per "No, riprova": ampiezza 1 all'inizio e 0 alla fine. */
export function shakeCurve(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI * 6) * (1 - t);
}

/** Dalla tinta di sfondo capisce se un elemento è diventato "giusto" (verde) o "sbagliato" (rosso/rosa). */
export function moodOfColor(r: number, g: number, b: number): Mood {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 25 || max < 60) return 'neutral';
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h >= 90 && h <= 170) return 'good';
  if (h >= 335 || h <= 15) return 'bad';
  return 'neutral';
}

/** Avvicina `value` a `target` con uno smorzamento indipendente dai fotogrammi. */
export function approach(value: number, target: number, dt: number, rate = 12): number {
  const k = 1 - Math.exp(-rate * dt);
  return value + (target - value) * k;
}
