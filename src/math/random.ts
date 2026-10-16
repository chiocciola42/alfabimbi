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

/** Scelte mostrate a schermo: poche e grandi per chi sta imparando (le risposte giuste restano sempre incluse). */
export const MAX_QUESTION_CHOICES = 3;

/**
 * Riduce le opzioni a `max`, tenendo sempre quella giusta e l'ordine originale delle altre.
 * Con `max` o meno opzioni restituisce l'elenco com'è.
 */
export function limitChoices<T extends string | number>(
  options: readonly T[],
  correct: string | number,
  max: number = MAX_QUESTION_CHOICES,
  rnd: () => number = Math.random,
): T[] {
  if (options.length <= max) return [...options];
  const isCorrect = (o: T) => String(o).trim().toLowerCase() === String(correct).trim().toLowerCase();
  const correctIdx = options.findIndex(isCorrect);
  if (correctIdx < 0) return options.slice(0, max);
  const others = options.map((_, i) => i).filter((i) => i !== correctIdx);
  const kept = new Set<number>([correctIdx]);
  while (kept.size < max && others.length > 0) {
    kept.add(others.splice(Math.floor(rnd() * others.length), 1)[0]);
  }
  return options.filter((_, i) => kept.has(i));
}
