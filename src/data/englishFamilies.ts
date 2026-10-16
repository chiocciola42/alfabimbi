import { seededShuffle } from './dailyWords';

/**
 * Famiglie di parole (phonics): parole che finiscono allo stesso modo ("rime"), come cat, hat, bat.
 * Cambiando solo la lettera iniziale la parola cambia, ed è il modo più semplice di arrivare alla
 * prima vera lettura in inglese: sono parole corte, regolari e tutte illustrabili con un'emoji.
 */
export interface FamilyWord {
  /** La parola in minuscolo ("cat"). */
  word: string;
  /** La lettera iniziale ("c"). */
  onset: string;
  emoji: string;
  /** Id della famiglia ("at"). */
  family: string;
}

export interface WordFamily {
  /** La rima, senza trattino ("at"). */
  id: string;
  words: FamilyWord[];
  /**
   * Lettere sbagliate da proporre accanto a quella giusta. Sono scelte a mano perché unite alla rima
   * NON formino una parola vera (niente "gap" o "zap", che sono parole inglesi ma non hanno l'immagine).
   */
  decoys: string[];
}

const family = (id: string, decoys: string[], entries: Array<[string, string]>): WordFamily => ({
  id,
  decoys,
  words: entries.map(([onset, emoji]) => ({ word: `${onset}${id}`, onset, emoji, family: id })),
});

export const WORD_FAMILIES: WordFamily[] = [
  family('at', ['d', 'z', 'k'], [['c', '🐱'], ['h', '🎩'], ['b', '🦇'], ['r', '🐀']]),
  family('an', ['k', 'z', 'g'], [['p', '🍳'], ['v', '🚐'], ['c', '🥫'], ['m', '👨']]),
  family('ap', ['v', 'd', 'k'], [['m', '🗺️'], ['c', '🧢'], ['n', '😴'], ['t', '🚰']]),
  family('og', ['z', 'v', 'k'], [['d', '🐶'], ['l', '🪵'], ['f', '🌫️']]),
  family('ug', ['z', 'k', 'g'], [['b', '🐛'], ['m', '☕'], ['h', '🤗']]),
  family('en', ['z', 'v', 'j'], [['h', '🐔'], ['p', '🖊️'], ['t', '🔟']]),
  family('ot', ['z', 'v', 'k'], [['p', '🍲'], ['h', '🔥'], ['d', '⚫']]),
];

export const FAMILY_WORDS: FamilyWord[] = WORD_FAMILIES.flatMap((f) => f.words);

export function findFamily(id: string): WordFamily {
  return WORD_FAMILIES.find((f) => f.id === id) ?? WORD_FAMILIES[0];
}

/** Prima famiglia con ancora qualche parola da leggere (o la prima, se le ha lette tutte). */
export function suggestedFamily(readWords: readonly string[]): WordFamily {
  const known = new Set(readWords);
  return WORD_FAMILIES.find((f) => f.words.some((w) => !known.has(w.word))) ?? WORD_FAMILIES[0];
}

/** Ordine di gioco di una famiglia: prima le parole non ancora lette. Deterministico per `seed`. */
export function familyRoundOrder(familyId: string, readWords: readonly string[], seed: number): FamilyWord[] {
  const known = new Set(readWords);
  const shuffled = seededShuffle(findFamily(familyId).words, seed);
  return [...shuffled.filter((w) => !known.has(w.word)), ...shuffled.filter((w) => known.has(w.word))];
}

/** Lettere iniziali tra cui scegliere: quella giusta più `count - 1` finte della famiglia, mescolate. */
export function pickOnsetChoices(target: FamilyWord, count: number, rnd: () => number = Math.random): string[] {
  const decoys = [...findFamily(target.family).decoys];
  const all = [target.onset];
  while (all.length < count && decoys.length > 0) {
    const [pick] = decoys.splice(Math.floor(rnd() * decoys.length), 1);
    all.push(pick);
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
