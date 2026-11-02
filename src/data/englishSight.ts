import { seededShuffle } from './dailyWords';

/**
 * Parole a colpo d'occhio (sight words): parole inglesi molto frequenti che non seguono il phonics
 * e vanno riconosciute intere. Sono 24, in 6 gruppi da 4 e ogni gruppo ha 4 iniziali diverse, così
 * le carte tra cui scegliere non si assomigliano troppo per una bambina che sta imparando a leggere.
 */
export interface SightWord {
  /** La parola in minuscolo ("the"), anche identificativo. */
  word: string;
  /** Numero del gruppo (1-6). */
  set: number;
}

const SETS: string[][] = [
  ['the', 'i', 'a', 'my'],
  ['and', 'is', 'you', 'go'],
  ['to', 'in', 'we', 'can'],
  ['see', 'it', 'me', 'are'],
  ['like', 'am', 'he', 'play'],
  ['she', 'look', 'come', 'this'],
];

export const SIGHT_SET_COUNT = SETS.length;

export const SIGHT_WORDS: SightWord[] = SETS.flatMap((words, i) => words.map((word) => ({ word, set: i + 1 })));

export function sightWordsOfSet(set: number): SightWord[] {
  return SIGHT_WORDS.filter((w) => w.set === set);
}

/** Primo gruppo con ancora qualche parola da riconoscere (o il primo, se le conosce tutte). */
export function suggestedSightSet(learned: readonly string[]): number {
  const known = new Set(learned);
  for (let set = 1; set <= SIGHT_SET_COUNT; set++) {
    if (sightWordsOfSet(set).some((w) => !known.has(w.word))) return set;
  }
  return 1;
}

/** Ordine di gioco di un gruppo: prima le parole non ancora riconosciute. Deterministico per `seed`. */
export function sightRoundOrder(set: number, learned: readonly string[], seed: number): SightWord[] {
  const known = new Set(learned);
  const shuffled = seededShuffle(sightWordsOfSet(set), seed);
  return [...shuffled.filter((w) => !known.has(w.word)), ...shuffled.filter((w) => known.has(w.word))];
}

/** Carte tra cui scegliere: la parola giusta più `count - 1` altre dello stesso gruppo, mescolate. */
export function pickSightChoices(target: SightWord, count: number, rnd: () => number = Math.random): SightWord[] {
  const others = sightWordsOfSet(target.set).filter((w) => w.word !== target.word);
  const all: SightWord[] = [target];
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
