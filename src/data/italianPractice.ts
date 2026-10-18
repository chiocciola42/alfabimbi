import { seededRandom, seededShuffle } from './dailyWords';
import { READING_WORDS, type ReadingLevel, type ReadingWord } from './readingWords';
import { WORD_POOLS } from './words';

/**
 * Esercizi di lettura e scrittura ispirati al sillabario: consonante + vocale = sillaba, sillabe al
 * contrario (AL, EL…), parole con una sillaba mancante, "inizia con…" e caccia alla lettera.
 */

export const VOWELS = ['A', 'E', 'I', 'O', 'U'] as const;

export type SyllableDirection = 'direct' | 'inverse' | 'both';

export interface SyllableExample {
  vowel: string;
  /** Consonante + vocale ("LA"). */
  syllable: string;
  /** Parola d'esempio in maiuscolo che inizia con la sillaba ("LAMA"). */
  word: string;
  emoji: string;
}

export interface SyllableFamily {
  consonant: string;
  examples: SyllableExample[];
}

const family = (consonant: string, words: [string, string][]): SyllableFamily => ({
  consonant,
  examples: words.map(([word, emoji], i) => ({
    vowel: VOWELS[i],
    syllable: consonant + VOWELS[i],
    word: word.toUpperCase(),
    emoji,
  })),
});

/** Le consonanti con sillabe sempre uguali (niente C e G dolci, niente S, Z, Q): una parola-immagine per vocale. */
export const SYLLABLE_FAMILIES: SyllableFamily[] = [
  family('L', [['Lama', '🦙'], ['Lepre', '🐇'], ['Limone', '🍋'], ['Loto', '🪷'], ['Lupo', '🐺']]),
  family('M', [['Mano', '✋'], ['Mela', '🍎'], ['Miele', '🍯'], ['Moto', '🏍️'], ['Mucca', '🐮']]),
  family('P', [['Pane', '🍞'], ['Pera', '🍐'], ['Pinguino', '🐧'], ['Polpo', '🐙'], ['Pulcino', '🐥']]),
  family('T', [['Tazza', '☕'], ['Telefono', '📞'], ['Tigre', '🐯'], ['Topo', '🐭'], ['Tulipano', '🌷']]),
  family('N', [['Nave', '🚢'], ['Neve', '❄️'], ['Nido', '🪺'], ['Noce', '🌰'], ['Nuvola', '☁️']]),
  family('R', [['Rana', '🐸'], ['Renna', '🦌'], ['Riso', '🍚'], ['Rosa', '🌹'], ['Ruota', '🛞']]),
  family('V', [['Vaso', '🏺'], ['Vento', '🌬️'], ['Violino', '🎻'], ['Volpe', '🦊'], ['Vulcano', '🌋']]),
  family('F', [['Farfalla', '🦋'], ['Fenicottero', '🦩'], ['Fiore', '🌸'], ['Foca', '🦭'], ['Fungo', '🍄']]),
  family('B', [['Barca', '⛵'], ['Berretto', '🧢'], ['Biscotto', '🍪'], ['Borsa', '👜'], ['Bue', '🐂']]),
  family('D', [['Dado', '🎲'], ['Dente', '🦷'], ['Diamante', '💎'], ['Doccia', '🚿'], ['Duna', '🏜️']]),
];

export const SYLLABLE_CONSONANTS: string[] = SYLLABLE_FAMILIES.map((f) => f.consonant);

export function familyOf(consonant: string): SyllableFamily {
  return SYLLABLE_FAMILIES.find((f) => f.consonant === consonant) ?? SYLLABLE_FAMILIES[0];
}

/** Sillabe dirette: consonante + vocale (LA LE LI LO LU). */
export function directSyllables(consonant: string): string[] {
  return VOWELS.map((v) => consonant + v);
}

/** Sillabe inverse: vocale + consonante (AL EL IL OL UL). */
export function inverseSyllables(consonant: string): string[] {
  return VOWELS.map((v) => v + consonant);
}

export function syllablesFor(consonant: string, direction: SyllableDirection): string[] {
  if (direction === 'direct') return directSyllables(consonant);
  if (direction === 'inverse') return inverseSyllables(consonant);
  return [...directSyllables(consonant), ...inverseSyllables(consonant)];
}

/** Tutte le sillabe che il gioco può proporre (usato per ripulire i dati salvati). */
export const ALL_SYLLABLES: string[] = SYLLABLE_CONSONANTS.flatMap((c) => syllablesFor(c, 'both'));

/** Parola-immagine di una sillaba diretta (le inverse non ne hanno). */
export function exampleFor(syllable: string): SyllableExample | undefined {
  return SYLLABLE_FAMILIES.flatMap((f) => f.examples).find((e) => e.syllable === syllable);
}

/**
 * Sillabe da proporre: prima quelle non ancora imparate, poi le altre. Il mescolamento è
 * deterministico per `seed`.
 */
export function syllableQueue(
  consonant: string,
  direction: SyllableDirection,
  learned: readonly string[],
  seed: number
): string[] {
  const known = new Set(learned);
  const shuffled = seededShuffle(syllablesFor(consonant, direction), seed);
  return [...shuffled.filter((s) => !known.has(s)), ...shuffled.filter((s) => known.has(s))];
}

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "Trova la sillaba": quella giusta e due che differiscono solo per la vocale, nello stesso verso. */
export function syllableChoices(target: string, count = 3, rnd: () => number = Math.random): string[] {
  const inverse = (VOWELS as readonly string[]).includes(target[0]);
  const consonant = inverse ? target[1] : target[0];
  const pool = (inverse ? inverseSyllables(consonant) : directSyllables(consonant)).filter((s) => s !== target);
  return shuffled([target, ...shuffled(pool, rnd).slice(0, count - 1)], rnd);
}

/** "Scrivi la sillaba": le due lettere giuste più una vocale in più, in ordine sparso. */
export function writeTiles(syllable: string, rnd: () => number = Math.random): string[] {
  const letters = syllable.split('');
  const extraVowels = VOWELS.filter((v) => !letters.includes(v));
  const extra = shuffled(extraVowels, rnd).slice(0, 2);
  return shuffled([...letters, ...extra], rnd);
}

// ----------------------------------------------------------------- completa la parola

export interface GapQuestion {
  word: ReadingWord;
  /** Posizione della sillaba nascosta. */
  index: number;
  missing: string;
}

/** Sceglie quale sillaba nascondere; cambia a ogni giro (`variant`) così la stessa parola non è sempre uguale. */
export function gapQuestion(word: ReadingWord, variant = 0): GapQuestion {
  const index = (word.word.length + variant) % word.syllables.length;
  return { word, index, missing: word.syllables[index] };
}

const ALL_READING_SYLLABLES = Array.from(new Set(READING_WORDS.flatMap((w) => w.syllables)));

/**
 * Sillabe tra cui scegliere: quella mancante, una con la stessa consonante iniziale (per far
 * guardare la vocale) e una a caso, tutte della stessa lunghezza.
 */
export function gapChoices(question: GapQuestion, count = 3, rnd: () => number = Math.random): string[] {
  const { missing } = question;
  const sameSize = ALL_READING_SYLLABLES.filter((s) => s !== missing && s.length === missing.length);
  const sameStart = sameSize.filter((s) => s[0] === missing[0]);
  const picks: string[] = [];
  const first = shuffled(sameStart, rnd)[0];
  if (first) picks.push(first);
  for (const s of shuffled(sameSize, rnd)) {
    if (picks.length >= count - 1) break;
    if (!picks.includes(s)) picks.push(s);
  }
  return shuffled([missing, ...picks], rnd);
}

// ----------------------------------------------------------------- inizia con…

export interface PictureWord {
  word: string;
  emoji: string;
  /** Lettera iniziale in maiuscolo. */
  initial: string;
}

/**
 * Disegni inequivocabili: se la stessa emoji rappresenta parole con iniziali diverse (🐟 pesce, tonno,
 * salmone) il bambino non può sapere quale nome pensiamo, quindi la escludiamo.
 */
function buildPictureWords(): PictureWord[] {
  const initialsByEmoji = new Map<string, Set<string>>();
  const all: PictureWord[] = [];
  for (const pool of Object.values(WORD_POOLS)) {
    for (const w of pool) {
      const initial = w.word[0].toUpperCase();
      all.push({ word: w.word, emoji: w.emoji, initial });
      initialsByEmoji.set(w.emoji, (initialsByEmoji.get(w.emoji) ?? new Set()).add(initial));
    }
  }
  const seen = new Set<string>();
  return all.filter((p) => {
    if ((initialsByEmoji.get(p.emoji)?.size ?? 0) !== 1 || seen.has(p.emoji)) return false;
    seen.add(p.emoji);
    return true;
  });
}

export const PICTURE_WORDS: PictureWord[] = buildPictureWords();

/** Lettere con abbastanza disegni per un giro. */
export const PICTURE_LETTERS: string[] = Array.from(new Set(PICTURE_WORDS.map((p) => p.initial)))
  .filter((l) => PICTURE_WORDS.filter((p) => p.initial === l).length >= 4)
  .sort();

export interface PictureRound {
  letter: string;
  pictures: PictureWord[];
}

/** Sei disegni: tre iniziano con `letter`, tre no (e iniziano con lettere diverse tra loro). */
export function pictureRound(letter: string, rnd: () => number = Math.random): PictureRound {
  const targets = shuffled(PICTURE_WORDS.filter((p) => p.initial === letter), rnd).slice(0, 3);
  const others: PictureWord[] = [];
  for (const p of shuffled(PICTURE_WORDS.filter((x) => x.initial !== letter), rnd)) {
    if (others.length >= 3) break;
    if (!others.some((o) => o.initial === p.initial)) others.push(p);
  }
  return { letter, pictures: shuffled([...targets, ...others], rnd) };
}

/** Lettera di ogni giro quando non se ne sceglie una: scorrono tutte, in ordine sparso ma fisso per `seed`. */
export function pictureLetterOrder(seed: number): string[] {
  return seededShuffle(PICTURE_LETTERS, seed);
}

// ----------------------------------------------------------------- cerchia le lettere

export interface HuntItem {
  word: ReadingWord;
  /** Lettera da cerchiare, maiuscola. */
  letter: string;
}

/** Quante volte `letter` compare in `word`. */
export function countLetter(word: string, letter: string): number {
  return word.toUpperCase().split('').filter((c) => c === letter.toUpperCase()).length;
}

/** Lettere che compaiono in almeno 3 parole di lettura: quelle tra cui si può scegliere. */
export const HUNT_LETTERS: string[] = 'ABCDEFGILMNOPRSTUVZ'
  .split('')
  .filter((l) => READING_WORDS.filter((w) => countLetter(w.word, l) > 0).length >= 3);

/**
 * Parole in cui cercare una lettera. Con `focus` si cerca sempre quella lettera (nelle parole che
 * la contengono); senza, a ogni parola viene abbinata una sua lettera. Prima le parole facili.
 */
export function huntQueue(focus: string | null, level: ReadingLevel, seed: number): HuntItem[] {
  const rnd = seededRandom(seed);
  let words = seededShuffle(READING_WORDS.filter((w) => w.level === level), seed);
  // Nessuna parola di questa lunghezza contiene la lettera: si pesca tra tutte.
  if (focus && !words.some((w) => countLetter(w.word, focus) > 0)) words = seededShuffle(READING_WORDS, seed);
  const items: HuntItem[] = [];
  for (const word of words) {
    if (focus) {
      if (countLetter(word.word, focus) > 0) items.push({ word, letter: focus });
    } else {
      const letters = Array.from(new Set(word.word.split('')));
      items.push({ word, letter: letters[Math.floor(rnd() * letters.length)] });
    }
  }
  return items;
}

/** Come si pronuncia il nome di una lettera (la sintesi vocale legge male le lettere isolate). */
export const LETTER_NAMES: Record<string, string> = {
  A: 'a', B: 'bi', C: 'ci', D: 'di', E: 'e', F: 'effe', G: 'gi', H: 'acca', I: 'i', L: 'elle', M: 'emme',
  N: 'enne', O: 'o', P: 'pi', Q: 'cu', R: 'erre', S: 'esse', T: 'ti', U: 'u', V: 'vu', Z: 'zeta',
};

export function letterName(letter: string): string {
  return LETTER_NAMES[letter.toUpperCase()] ?? letter.toLowerCase();
}
