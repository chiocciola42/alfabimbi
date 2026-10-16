import { seededShuffle } from './dailyWords';

/**
 * Parole per imparare a leggere. A differenza dei pool "una parola al giorno" (words.ts), qui ogni
 * parola è già divisa in sillabe e ha una difficoltà:
 *  1 = due sillabe aperte (CA-SA), 2 = parole con consonanti doppie o gruppi (GAT-TO, PE-SCE),
 *  3 = parole lunghe (FAR-FAL-LA). Solo lettere dell'alfabeto italiano: niente parole straniere.
 */
export type ReadingLevel = 1 | 2 | 3;

export const READING_LEVELS: readonly ReadingLevel[] = [1, 2, 3];

export interface ReadingWord {
  /** Parola in maiuscolo, senza trattini ("CASA"). */
  word: string;
  emoji: string;
  /** Sillabe in maiuscolo (["CA", "SA"]). */
  syllables: string[];
  level: ReadingLevel;
}

const r = (hyphenated: string, emoji: string, level: ReadingLevel): ReadingWord => {
  const syllables = hyphenated.split('-');
  return { word: syllables.join(''), emoji, syllables, level };
};

export const READING_WORDS: ReadingWord[] = [
  // Livello 1: due sillabe semplici
  r('CA-SA', '🏠', 1), r('ME-LA', '🍎', 1), r('LU-NA', '🌙', 1), r('SO-LE', '☀️', 1),
  r('MA-RE', '🌊', 1), r('NA-VE', '🚢', 1), r('TO-PO', '🐭', 1), r('LU-PO', '🐺', 1),
  r('PA-NE', '🍞', 1), r('VA-SO', '🏺', 1), r('RA-NA', '🐸', 1), r('FA-TA', '🧚', 1),
  r('MA-NO', '✋', 1), r('PE-RA', '🍐', 1), r('U-VA', '🍇', 1), r('NA-SO', '👃', 1),
  r('DA-DO', '🎲', 1), r('GU-FO', '🦉', 1), r('CA-NE', '🐶', 1), r('RO-SA', '🌹', 1),
  r('FO-CA', '🦭', 1), r('NE-VE', '❄️', 1), r('BU-E', '🐂', 1), r('LA-MA', '🦙', 1),
  // Livello 2: consonanti doppie, gruppi di consonanti, tre sillabe facili
  r('GAT-TO', '🐱', 2), r('PE-SCE', '🐟', 2), r('FIO-RE', '🌸', 2), r('MUC-CA', '🐮', 2),
  r('PAL-LA', '⚽', 2), r('TOR-TA', '🎂', 2), r('PIZ-ZA', '🍕', 2), r('LI-BRO', '📚', 2),
  r('OR-SO', '🐻', 2), r('ZE-BRA', '🦓', 2), r('ZAI-NO', '🎒', 2), r('TRE-NO', '🚂', 2),
  r('STEL-LA', '⭐', 2), r('BAR-CA', '⛵', 2), r('PAN-DA', '🐼', 2), r('LE-O-NE', '🦁', 2),
  r('BA-NA-NA', '🍌', 2), r('PA-TA-TA', '🥔', 2), r('CA-RO-TA', '🥕', 2), r('SCAR-PA', '👟', 2),
  r('CAM-PA-NA', '🔔', 2), r('FOR-MI-CA', '🐜', 2), r('RO-BOT', '🤖', 2), r('GIO-STRA', '🎠', 2),
  r('LU-MA-CA', '🐌', 2), r('SER-PEN-TE', '🐍', 2), r('SCIM-MIA', '🐒', 2), r('FUN-GO', '🍄', 2),
  // Livello 3: parole lunghe
  r('FAR-FAL-LA', '🦋', 3), r('TAR-TA-RU-GA', '🐢', 3), r('GI-RAF-FA', '🦒', 3), r('PIN-GUI-NO', '🐧', 3),
  r('DEL-FI-NO', '🐬', 3), r('CA-VAL-LO', '🐴', 3), r('CO-NI-GLIO', '🐰', 3), r('COC-CO-DRIL-LO', '🐊', 3),
  r('BI-CI-CLET-TA', '🚲', 3), r('E-LE-FAN-TE', '🐘', 3), r('CA-STEL-LO', '🏰', 3), r('COC-CI-NEL-LA', '🐞', 3),
  r('CIOC-CO-LA-TO', '🍫', 3), r('FRA-GO-LA', '🍓', 3), r('PO-MO-DO-RO', '🍅', 3), r('TE-LE-FO-NO', '📞', 3),
  r('OM-BREL-LO', '☂️', 3), r('A-RAN-CIA', '🍊', 3), r('PAP-PA-GAL-LO', '🦜', 3), r('DI-NO-SAU-RO', '🦖', 3),
  r('TRAT-TO-RE', '🚜', 3), r('SPAZ-ZO-LI-NO', '🪥', 3), r('NU-VO-LA', '☁️', 3), r('FI-NE-STRA', '🪟', 3),
];

/** Quante parole lette servono per passare al livello successivo. */
export const READING_LEVEL_UP_AFTER = 8;

export function wordsOfLevel(level: ReadingLevel): ReadingWord[] {
  return READING_WORDS.filter((w) => w.level === level);
}

/**
 * Livello consigliato: si parte dal facile e si sale ogni `READING_LEVEL_UP_AFTER` parole del livello
 * già lette, così il gioco cresce insieme alla bambina senza che debba scegliere.
 */
export function suggestedReadingLevel(readWords: readonly string[]): ReadingLevel {
  const known = new Set(readWords);
  const doneAt = (level: ReadingLevel) => wordsOfLevel(level).filter((w) => known.has(w.word)).length;
  if (doneAt(1) < READING_LEVEL_UP_AFTER) return 1;
  if (doneAt(2) < READING_LEVEL_UP_AFTER) return 2;
  return 3;
}

/**
 * Ordine di gioco di un livello: prima le parole non ancora lette, poi le altre.
 * Il mescolamento è deterministico per `seed` (stesso seme, stesso ordine).
 */
export function readingRoundOrder(level: ReadingLevel, readWords: readonly string[], seed: number): ReadingWord[] {
  const known = new Set(readWords);
  const shuffled = seededShuffle(wordsOfLevel(level), seed);
  return [...shuffled.filter((w) => !known.has(w.word)), ...shuffled.filter((w) => known.has(w.word))];
}

/**
 * Immagini tra cui scegliere: la parola giusta più `count - 1` distrattori dello stesso livello,
 * tutti con emoji diverse e sillabe iniziali diverse (per non rendere la scelta ambigua).
 */
export function pickImageChoices(target: ReadingWord, count: number, rnd: () => number = Math.random): ReadingWord[] {
  const pool = READING_WORDS.filter(
    (w) => w.word !== target.word && w.emoji !== target.emoji && w.syllables[0] !== target.syllables[0]
  );
  const sameLevel = pool.filter((w) => w.level === target.level);
  const source = sameLevel.length >= count - 1 ? sameLevel : pool;
  const distractors: ReadingWord[] = [];
  const rest = [...source];
  while (distractors.length < count - 1 && rest.length > 0) {
    const [pick] = rest.splice(Math.floor(rnd() * rest.length), 1);
    if (!distractors.some((d) => d.emoji === pick.emoji || d.syllables[0] === pick.syllables[0])) distractors.push(pick);
  }
  const all = [...distractors, target];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** Ordine casuale delle sillabe per il gioco "metti in ordine"; non restituisce mai l'ordine giusto. */
export function shuffleSyllables(syllables: readonly string[], rnd: () => number = Math.random): string[] {
  if (syllables.length < 2) return [...syllables];
  const joined = syllables.join('-');
  for (let attempt = 0; attempt < 20; attempt++) {
    const out = [...syllables];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.join('-') !== joined) return out;
  }
  return [...syllables.slice(1), syllables[0]];
}
