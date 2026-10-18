import type { ChildProgress, PlacedSticker, StickerItem, TextStyle } from '../types';
import { STICKERS_CATALOG } from '../data/alphabet';

export const PACK_COST = 15;
export const TRACE_REWARD_STARS = 5;
export const MATH_QUESTIONS_PER_LEVEL = 5;

/** Stelle regalo per un livello di matematica concluso: 6, 8 o 10 a seconda del punteggio (1-3). */
export function mathLevelReward(levelStars: number): number {
  return 4 + 2 * Math.min(3, Math.max(1, Math.floor(levelStars)));
}

/** Totale delle stelle (0-3 per livello) ottenute nella mappa di matematica. */
export function mathMedals(progress: ChildProgress): number {
  return Object.values(progress.mathLevelStars).reduce((sum, n) => sum + n, 0);
}

function unlockByStars(unlocked: string[], stars: number): string[] {
  const next = [...unlocked];
  for (const stk of STICKERS_CATALOG) {
    if (stars >= stk.requiredStars && !next.includes(stk.id)) next.push(stk.id);
  }
  return next;
}

export function addStars(progress: ChildProgress, count: number): ChildProgress {
  const amount = Math.max(0, Math.floor(count));
  const stars = progress.stars + amount;
  return { ...progress, stars, unlockedStickers: unlockByStars(progress.unlockedStickers, stars) };
}

export function markLetterTraced(
  progress: ChildProgress,
  letterId: string,
  isUppercase: boolean
): ChildProgress {
  const field = isUppercase ? 'tracedUppercase' : 'tracedLowercase';
  const otherField = isUppercase ? 'tracedLowercase' : 'tracedUppercase';
  const list = progress[field].includes(letterId) ? progress[field] : [...progress[field], letterId];
  const mastered =
    progress[otherField].includes(letterId) && !progress.masteredLetters.includes(letterId)
      ? [...progress.masteredLetters, letterId]
      : progress.masteredLetters;

  const rewarded = addStars(progress, TRACE_REWARD_STARS);
  return {
    ...rewarded,
    [field]: list,
    masteredLetters: mastered,
    lettersTracedCount: progress.lettersTracedCount + 1,
  };
}

export interface PackResult {
  progress: ChildProgress;
  drawn: StickerItem[];
}

/** Draws three stickers. Returns `drawn: []` and the untouched progress if stars are insufficient. */
export function openPack(
  progress: ChildProgress,
  cost: number = PACK_COST,
  rng: () => number = Math.random
): PackResult {
  if (progress.stars < cost) return { progress, drawn: [] };

  const reachable = (s: StickerItem) => s.requiredStars <= progress.stars + 20;
  const locked = STICKERS_CATALOG.filter((s) => !progress.unlockedStickers.includes(s.id));
  const eligible = locked.filter(reachable);
  const pool = eligible.length > 0 ? eligible : locked.length > 0 ? locked.slice(0, 8) : STICKERS_CATALOG;

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const drawn = shuffle(pool).slice(0, 3);
  if (drawn.length < 3) {
    const filler = shuffle(STICKERS_CATALOG.filter((s) => reachable(s) && !drawn.some((d) => d.id === s.id)));
    drawn.push(...filler.slice(0, 3 - drawn.length));
  }

  const unlocked = Array.from(new Set([...progress.unlockedStickers, ...drawn.map((d) => d.id)]));
  return {
    progress: {
      ...progress,
      stars: progress.stars - cost,
      unlockedStickers: unlocked,
      packsOpened: progress.packsOpened + 1,
    },
    drawn,
  };
}

export function claimMission(
  progress: ChildProgress,
  missionId: string,
  rewardStars: number
): ChildProgress {
  if (progress.claimedMissionIds.includes(missionId)) return progress;
  const rewarded = addStars(progress, rewardStars);
  return { ...rewarded, claimedMissionIds: [...progress.claimedMissionIds, missionId] };
}

export function setPlacedStickers(progress: ChildProgress, placedStickers: PlacedSticker[]): ChildProgress {
  return { ...progress, placedStickers };
}

export function completeMathLevel(
  progress: ChildProgress,
  levelId: number,
  levelStars: number,
  correctCount: number
): ChildProgress {
  const key = String(levelId);
  const stars = Math.min(3, Math.max(0, Math.floor(levelStars)));
  const best = Math.max(progress.mathLevelStars[key] ?? 0, stars);
  const rewarded = addStars(progress, mathLevelReward(stars));
  return {
    ...rewarded,
    mathLevelStars: best > 0 ? { ...progress.mathLevelStars, [key]: best } : progress.mathLevelStars,
    completedMathLevels: progress.completedMathLevels + 1,
    mathExercisesSolved: progress.mathExercisesSolved + MATH_QUESTIONS_PER_LEVEL,
    mathCorrectFirstTry: progress.mathCorrectFirstTry + Math.max(0, Math.min(MATH_QUESTIONS_PER_LEVEL, correctCount)),
  };
}

/** Stelle per ogni parola letta bene la prima volta; quando la si rilegge non si guadagna di nuovo. */
export const READ_WORD_REWARD_STARS = 3;
export const READ_REPEAT_REWARD_STARS = 1;

/** Aggiunge una parola al diario delle parole lette (senza duplicati). */
export function markWordRead(progress: ChildProgress, word: string): ChildProgress {
  const key = word.toUpperCase();
  if (progress.readWords.includes(key)) return progress;
  return { ...progress, readWords: [...progress.readWords, key] };
}

/** Stelle per una sillaba trovata o scritta giusta la prima volta e per ogni ripasso; per le parole completate valgono quelle di lettura. */
export const SYLLABLE_REWARD_STARS = 2;
export const SYLLABLE_REPEAT_REWARD_STARS = 1;
/** Stelle per un giro concluso di "inizia con…" o di caccia alla lettera. */
export const HUNT_REWARD_STARS = 4;

/** Aggiunge una sillaba a quelle imparate (senza duplicati). */
export function markSyllableLearned(progress: ChildProgress, syllable: string): ChildProgress {
  const key = syllable.toUpperCase();
  if (progress.syllables.includes(key)) return progress;
  return { ...progress, syllables: [...progress.syllables, key] };
}

export function setTextStyle(progress: ChildProgress, textStyle: TextStyle): ChildProgress {
  return { ...progress, textStyle };
}

/** Inglese: stelle per la prima volta che si riconosce una parola, una lettera o si legge una parola-rima. */
export const ENGLISH_WORD_REWARD_STARS = 2;
export const ENGLISH_LETTER_REWARD_STARS = 3;
export const ENGLISH_FAMILY_REWARD_STARS = 3;
export const ENGLISH_REPEAT_REWARD_STARS = 1;

function addUnique(list: readonly string[], item: string): string[] {
  return list.includes(item) ? [...list] : [...list, item];
}

/** Aggiunge una parola del vocabolario inglese a quelle imparate (senza duplicati). */
export function markEnglishWordLearned(progress: ChildProgress, word: string): ChildProgress {
  const key = word.toLowerCase();
  if (progress.englishWords.includes(key)) return progress;
  return { ...progress, englishWords: addUnique(progress.englishWords, key) };
}

/** Aggiunge una lettera dell'alfabeto inglese a quelle imparate (senza duplicati). */
export function markEnglishLetterLearned(progress: ChildProgress, letter: string): ChildProgress {
  const key = letter.toUpperCase();
  if (progress.englishLetters.includes(key)) return progress;
  return { ...progress, englishLetters: addUnique(progress.englishLetters, key) };
}

/** Aggiunge una parola delle famiglie (cat, hat…) a quelle lette (senza duplicati). */
export function markEnglishFamilyWordRead(progress: ChildProgress, word: string): ChildProgress {
  const key = word.toLowerCase();
  if (progress.englishFamilyWords.includes(key)) return progress;
  return { ...progress, englishFamilyWords: addUnique(progress.englishFamilyWords, key) };
}

/** Inglese: parole a colpo d'occhio, lettere tracciate, parole costruite, storie lette. */
export const ENGLISH_SIGHT_REWARD_STARS = 3;
export const ENGLISH_TRACE_REWARD_STARS = 3;
export const ENGLISH_SPELL_REWARD_STARS = 4;
export const ENGLISH_STORY_REWARD_STARS = 5;

/** Aggiunge una parola a colpo d'occhio a quelle riconosciute (senza duplicati). */
export function markEnglishSightWordRead(progress: ChildProgress, word: string): ChildProgress {
  const key = word.toLowerCase();
  if (progress.englishSightWords.includes(key)) return progress;
  return { ...progress, englishSightWords: addUnique(progress.englishSightWords, key) };
}

/** Segna una lettera inglese come tracciata, maiuscola ("A") o minuscola ("a") a seconda del caso. */
export function markEnglishLetterTraced(progress: ChildProgress, letter: string, isUppercase: boolean): ChildProgress {
  const key = isUppercase ? letter.toUpperCase() : letter.toLowerCase();
  if (progress.englishTraced.includes(key)) return progress;
  return { ...progress, englishTraced: addUnique(progress.englishTraced, key) };
}

/** Lettere inglesi tracciate sia maiuscole sia minuscole, in ordine alfabetico. */
export function englishLettersWritten(progress: Pick<ChildProgress, 'englishTraced'>): string[] {
  return progress.englishTraced
    .filter((x) => x === x.toUpperCase() && progress.englishTraced.includes(x.toLowerCase()))
    .sort();
}

/** Aggiunge una parola a quelle costruite con le lettere (senza duplicati). */
export function markEnglishWordSpelled(progress: ChildProgress, word: string): ChildProgress {
  const key = word.toLowerCase();
  if (progress.englishSpelledWords.includes(key)) return progress;
  return { ...progress, englishSpelledWords: addUnique(progress.englishSpelledWords, key) };
}

/** Aggiunge una storia o canzoncina a quelle lette (senza duplicati). */
export function markEnglishStoryRead(progress: ChildProgress, storyId: string): ChildProgress {
  if (progress.englishStories.includes(storyId)) return progress;
  return { ...progress, englishStories: addUnique(progress.englishStories, storyId) };
}
