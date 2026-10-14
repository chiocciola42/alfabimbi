export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function choice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

/**
 * Quattro opzioni numeriche distinte e mescolate che contengono sempre `correct`.
 * I distrattori arrivano da `offsets` (scarti dalla risposta); se non bastano si riempie
 * con numeri vicini entro [min, max].
 */
export function numericOptions(
  correct: number,
  offsets: number[] = [-1, 1, -2, 2],
  min = 0,
  max = Number.POSITIVE_INFINITY,
): number[] {
  const set = new Set<number>([correct]);
  for (const o of offsets) {
    const v = correct + o;
    if (v >= min && v <= max) set.add(v);
    if (set.size === 4) break;
  }
  for (let d = 1; set.size < 4 && d < 30; d++) {
    for (const v of [correct + d, correct - d]) {
      if (set.size < 4 && v >= min && v <= max) set.add(v);
    }
  }
  return shuffle([...set]);
}
