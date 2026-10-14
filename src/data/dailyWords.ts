import type { LetterData } from '../types';
import { WORD_POOLS, type PoolWord } from './words';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of local calendar days since 1970-01-01 (changes at local midnight, DST-safe). */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

/** Small deterministic PRNG (mulberry32), so a given day always yields the same shuffles. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rnd = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The word shown for a letter on a given day. Each letter walks through its pool one word per day,
 * starting from a letter-specific offset so the alphabet doesn't all change "in lockstep".
 */
export function wordOfTheDay(letterId: string, date: Date): PoolWord {
  const pool = WORD_POOLS[letterId];
  if (!pool || pool.length === 0) throw new Error(`No words for letter ${letterId}`);
  const offset = letterId.charCodeAt(0);
  return pool[(dayNumber(date) + offset) % pool.length];
}

/** Returns the letters with today's word, emoji, category and phonics; other words go to `sampleWords`. */
export function applyDailyWords(letters: LetterData[], date: Date): LetterData[] {
  return letters.map((letter) => {
    const pool = WORD_POOLS[letter.id];
    if (!pool) return letter;
    const today = wordOfTheDay(letter.id, date);
    return {
      ...letter,
      word: today.word,
      emoji: today.emoji,
      category: today.category,
      phonics: `${letter.letter} come ${today.word}`,
      funFactEmoji: letter.emoji,
      sampleWords: pool.filter((p) => p.word !== today.word).map(({ word, emoji }) => ({ word, emoji })),
    };
  });
}

export interface SpellWord {
  word: string;
  emoji: string;
  hint: string;
}

/** Hand-written hints for the first words; the rest get an automatic "starts with" hint. */
export const CURATED_SPELL_WORDS: SpellWord[] = [
  { word: 'APE', emoji: '🐝', hint: 'Fa il miele dolce e vola sui fiori' },
  { word: 'SOLE', emoji: '☀️', hint: 'Scalda il cielo e fa splendere il giorno' },
  { word: 'LUNA', emoji: '🌙', hint: 'Illumina la notte nel cielo stellato' },
  { word: 'CANE', emoji: '🐶', hint: 'Il migliore amico con la coda che scodinzola' },
  { word: 'GATTO', emoji: '🐱', hint: 'Fa le fusa e gioca con i gomitoli' },
  { word: 'MELA', emoji: '🍎', hint: 'Frutto rosso o giallo dolce e croccante' },
  { word: 'ORSO', emoji: '🐻', hint: 'Grande animale tenero che ama il miele' },
  { word: 'PANE', emoji: '🥖', hint: 'Buono e caldo appena sfornato dal fornaio' },
  { word: 'CASA', emoji: '🏠', hint: 'Il posto accogliente dove vive la famiglia' },
  { word: 'MARE', emoji: '🌊', hint: 'Acqua azzurra con sabbia e conchiglie' },
  { word: 'FIORE', emoji: '🌸', hint: 'Ha petali colorati e un buon profumo' },
  { word: 'PESCE', emoji: '🐟', hint: 'Nuota nell’acqua usando le pinne' },
  { word: 'LEONE', emoji: '🦁', hint: 'Il re della savana con una grande criniera' },
  { word: 'RANA', emoji: '🐸', hint: 'Salta nello stagno e fa cra cra' },
  { word: 'UVA', emoji: '🍇', hint: 'Piccoli frutti rotondi raccolti in grappoli' },
  { word: 'PERA', emoji: '🍐', hint: 'Frutto dolce dalla forma un po’ allungata' },
  { word: 'TOPO', emoji: '🐭', hint: 'Piccolo roditore che ama il formaggio' },
  { word: 'GUFO', emoji: '🦉', hint: 'Uccello notturno con grandi occhi rotondi' },
  { word: 'LUPO', emoji: '🐺', hint: 'Animale selvatico che ulula alla luna' },
  { word: 'MUCCA', emoji: '🐮', hint: 'Vive nella fattoria e ci dà il latte' },
  { word: 'PALLA', emoji: '⚽', hint: 'Rotola, rimbalza e si usa per giocare' },
  { word: 'TRENO', emoji: '🚂', hint: 'Corre sui binari e porta tanti passeggeri' },
  { word: 'AUTO', emoji: '🚗', hint: 'Ha quattro ruote e viaggia sulla strada' },
  { word: 'BARCA', emoji: '⛵', hint: 'Galleggia sull’acqua e può avere una vela' },
  { word: 'TORTA', emoji: '🎂', hint: 'Dolce delle feste con candeline da spegnere' },
  { word: 'PIZZA', emoji: '🍕', hint: 'Piatto rotondo con pomodoro e mozzarella' },
  { word: 'STELLA', emoji: '⭐', hint: 'Piccolo punto luminoso nel cielo notturno' },
  { word: 'NEVE', emoji: '❄️', hint: 'Scende dal cielo in fiocchi bianchi e freddi' },
  { word: 'LIBRO', emoji: '📖', hint: 'Ha tante pagine con storie da leggere' },
  { word: 'MANO', emoji: '✋', hint: 'Ha cinque dita e serve per salutare' }
];

/** Words that can be spelled tile-by-tile: plain A-Z letters only, short enough for small hands. */
export function spellableWords(): Array<PoolWord & { letter: string }> {
  const out: Array<PoolWord & { letter: string }> = [];
  for (const [letter, pool] of Object.entries(WORD_POOLS)) {
    for (const p of pool) {
      if (/^[A-Za-z]{3,6}$/.test(p.word)) out.push({ ...p, letter });
    }
  }
  return out;
}

/**
 * Words for "Componi la Parolina" today: curated words plus every short word of the pools,
 * in an order that is reshuffled each day (same order all day long).
 */
export function dailySpellList(date: Date): SpellWord[] {
  const seen = new Set<string>();
  const all: SpellWord[] = [];
  for (const c of CURATED_SPELL_WORDS) {
    seen.add(c.word);
    all.push(c);
  }
  for (const p of spellableWords()) {
    const word = p.word.toUpperCase();
    if (seen.has(word)) continue;
    seen.add(word);
    all.push({ word, emoji: p.emoji, hint: `Inizia con la lettera ${p.letter}!` });
  }
  return seededShuffle(all, dayNumber(date));
}
