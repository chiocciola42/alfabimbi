import { seededShuffle } from './dailyWords';

/** Una lettera dell'alfabeto inglese, con il suo nome e la parola-immagine che l'accompagna. */
export interface EnglishLetter {
  /** Lettera maiuscola ("A"). */
  letter: string;
  lowercase: string;
  /** Come si pronuncia il nome della lettera, scritto in modo che la voce sintetica lo legga bene. */
  say: string;
  /** Parola-immagine ("apple") e la sua emoji. */
  word: string;
  emoji: string;
  vowel: boolean;
  /** Per i genitori, quando la lettera è un caso particolare. */
  note?: string;
}

const l = (letter: string, say: string, word: string, emoji: string, note?: string): EnglishLetter => ({
  letter,
  lowercase: letter.toLowerCase(),
  say,
  word,
  emoji,
  vowel: 'AEIOU'.includes(letter),
  ...(note ? { note } : {}),
});

export const ENGLISH_ALPHABET: EnglishLetter[] = [
  l('A', 'ay', 'apple', '🍎'), l('B', 'bee', 'ball', '⚽'), l('C', 'see', 'cat', '🐱'),
  l('D', 'dee', 'dog', '🐶'), l('E', 'ee', 'egg', '🥚'), l('F', 'eff', 'fish', '🐟'),
  l('G', 'jee', 'goat', '🐐'), l('H', 'aitch', 'hat', '🎩'), l('I', 'eye', 'ice cream', '🍦'),
  l('J', 'jay', 'juice', '🧃'), l('K', 'kay', 'kite', '🪁'), l('L', 'el', 'lion', '🦁'),
  l('M', 'em', 'monkey', '🐒'), l('N', 'en', 'nose', '👃'), l('O', 'oh', 'orange', '🍊'),
  l('P', 'pee', 'pig', '🐷'), l('Q', 'cue', 'queen', '👑'), l('R', 'ar', 'rabbit', '🐰'),
  l('S', 'ess', 'sun', '☀️'), l('T', 'tee', 'tree', '🌳'), l('U', 'you', 'umbrella', '☂️'),
  l('V', 'vee', 'van', '🚐'), l('W', 'double you', 'water', '💧'),
  l('X', 'ex', 'fox', '🦊', 'La X si sente alla fine della parola: fo-x.'),
  l('Y', 'why', 'yo-yo', '🪀'), l('Z', 'zed', 'zebra', '🦓'),
];

export function findEnglishLetter(letter: string): EnglishLetter | undefined {
  return ENGLISH_ALPHABET.find((x) => x.letter === letter.toUpperCase());
}

/** Frase pronunciata per una lettera: il nome, poi "A is for apple". */
export function letterPhrase(entry: EnglishLetter): string {
  return `${entry.letter} is for ${entry.word}`;
}

/** Ordine di gioco del quiz: prima le lettere non ancora imparate. Deterministico per `seed`. */
export function englishLetterOrder(learned: readonly string[], seed: number): EnglishLetter[] {
  const known = new Set(learned);
  const shuffled = seededShuffle(ENGLISH_ALPHABET, seed);
  return [...shuffled.filter((x) => !known.has(x.letter)), ...shuffled.filter((x) => known.has(x.letter))];
}

/** Lettere tra cui scegliere nel quiz: quella giusta più `count - 1` altre, mescolate. */
export function pickLetterChoices(target: EnglishLetter, count: number, rnd: () => number = Math.random): EnglishLetter[] {
  const others = ENGLISH_ALPHABET.filter((x) => x.letter !== target.letter);
  const all: EnglishLetter[] = [target];
  while (all.length < count && others.length > 0) {
    const [pick] = others.splice(Math.floor(rnd() * others.length), 1);
    all.push(pick);
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
