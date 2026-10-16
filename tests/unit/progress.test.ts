import { describe, expect, it } from 'vitest';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import {
  ENGLISH_REPEAT_REWARD_STARS as REPEAT,
  ENGLISH_SIGHT_REWARD_STARS,
  ENGLISH_SPELL_REWARD_STARS,
  ENGLISH_STORY_REWARD_STARS,
  ENGLISH_TRACE_REWARD_STARS,
  englishLettersWritten,
  markEnglishLetterTraced,
  markEnglishSightWordRead,
  markEnglishStoryRead,
  markEnglishWordSpelled,
  ENGLISH_FAMILY_REWARD_STARS,
  ENGLISH_LETTER_REWARD_STARS,
  ENGLISH_REPEAT_REWARD_STARS,
  ENGLISH_WORD_REWARD_STARS,
  markEnglishFamilyWordRead,
  markEnglishLetterLearned,
  markEnglishWordLearned,
  PACK_COST,
  READ_REPEAT_REWARD_STARS,
  READ_WORD_REWARD_STARS,
  TRACE_REWARD_STARS,
  addStars,
  claimMission,
  markLetterTraced,
  markWordRead,
  openPack,
  setTextStyle,
} from '../../src/state/progress';
import type { ChildProgress } from '../../src/types';

const base = (patch: Partial<ChildProgress> = {}): ChildProgress => ({ ...INITIAL_PROGRESS, ...patch });

describe('addStars', () => {
  it('adds stars and unlocks stickers whose threshold is reached', () => {
    const p = base({ stars: 0, unlockedStickers: [] });
    const next = addStars(p, 10);
    expect(next.stars).toBe(10);
    const expected = STICKERS_CATALOG.filter((s) => s.requiredStars <= 10).map((s) => s.id);
    expect(next.unlockedStickers.sort()).toEqual(expected.sort());
  });

  it('ignores negative and fractional amounts', () => {
    expect(addStars(base({ stars: 5 }), -3).stars).toBe(5);
    expect(addStars(base({ stars: 5 }), 2.9).stars).toBe(7);
  });

  it('does not duplicate already unlocked stickers', () => {
    const next = addStars(base({ stars: 12 }), 1);
    expect(new Set(next.unlockedStickers).size).toBe(next.unlockedStickers.length);
  });

  it('does not mutate its input', () => {
    const p = base();
    const snapshot = JSON.stringify(p);
    addStars(p, 50);
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

describe('markLetterTraced', () => {
  it('records the uppercase trace and rewards stars', () => {
    const p = base({ stars: 0, tracedUppercase: [], tracedLowercase: [], masteredLetters: [], lettersTracedCount: 0 });
    const next = markLetterTraced(p, 'B', true);
    expect(next.tracedUppercase).toEqual(['B']);
    expect(next.tracedLowercase).toEqual([]);
    expect(next.masteredLetters).toEqual([]);
    expect(next.stars).toBe(TRACE_REWARD_STARS);
    expect(next.lettersTracedCount).toBe(1);
  });

  it('masters the letter once both cases are traced', () => {
    let p = base({ tracedUppercase: [], tracedLowercase: [], masteredLetters: [] });
    p = markLetterTraced(p, 'B', true);
    p = markLetterTraced(p, 'B', false);
    expect(p.masteredLetters).toEqual(['B']);
  });

  it('does not duplicate entries when retracing the same letter', () => {
    let p = base({ tracedUppercase: [], tracedLowercase: [], masteredLetters: [] });
    p = markLetterTraced(p, 'B', true);
    p = markLetterTraced(p, 'B', false);
    p = markLetterTraced(p, 'B', false);
    expect(p.tracedUppercase).toEqual(['B']);
    expect(p.tracedLowercase).toEqual(['B']);
    expect(p.masteredLetters).toEqual(['B']);
  });
});

describe('openPack', () => {
  const seeded = (seed = 1) => {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  };

  it('refuses when stars are insufficient and changes nothing', () => {
    const p = base({ stars: PACK_COST - 1 });
    const result = openPack(p);
    expect(result.drawn).toEqual([]);
    expect(result.progress).toBe(p);
  });

  it('spends the cost, draws three stickers and unlocks them', () => {
    const p = base({ stars: 40, unlockedStickers: [], packsOpened: 2 });
    const { progress, drawn } = openPack(p, PACK_COST, seeded());
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn.map((d) => d.id)).size).toBe(3);
    expect(progress.stars).toBe(40 - PACK_COST);
    expect(progress.packsOpened).toBe(3);
    drawn.forEach((d) => expect(progress.unlockedStickers).toContain(d.id));
  });

  it('respects tier progression: only stickers reachable within +20 stars', () => {
    const p = base({ stars: 20, unlockedStickers: [] });
    const { drawn } = openPack(p, PACK_COST, seeded(7));
    drawn.forEach((d) => expect(d.requiredStars).toBeLessThanOrEqual(p.stars + 20));
  });

  it('still returns three stickers when everything is already unlocked', () => {
    const all = STICKERS_CATALOG.map((s) => s.id);
    const { drawn, progress } = openPack(base({ stars: 100, unlockedStickers: all }), PACK_COST, seeded(3));
    expect(drawn).toHaveLength(3);
    expect(progress.unlockedStickers).toHaveLength(all.length);
  });

  it('is deterministic for a deterministic RNG', () => {
    const p = base({ stars: 60, unlockedStickers: [] });
    expect(openPack(p, PACK_COST, seeded(9)).drawn.map((d) => d.id)).toEqual(
      openPack(p, PACK_COST, seeded(9)).drawn.map((d) => d.id)
    );
  });
});

describe('claimMission', () => {
  it('rewards stars once and remembers the claim', () => {
    const p = base({ stars: 0, claimedMissionIds: [] });
    const once = claimMission(p, 'm_trace', 10);
    expect(once.stars).toBe(10);
    expect(once.claimedMissionIds).toEqual(['m_trace']);
    const twice = claimMission(once, 'm_trace', 10);
    expect(twice).toBe(once);
  });
});

describe('completeMathLevel', () => {
  it('rewards the level with stars of the shared treasury and keeps the best score', async () => {
    const { completeMathLevel, mathLevelReward, mathMedals } = await import('../../src/state/progress');
    const { INITIAL_PROGRESS } = await import('../../src/data/alphabet');
    const first = completeMathLevel(INITIAL_PROGRESS, 3, 2, 4);
    expect(first.stars).toBe(INITIAL_PROGRESS.stars + mathLevelReward(2));
    expect(first.mathLevelStars).toEqual({ '3': 2 });
    expect(first.completedMathLevels).toBe(1);
    expect(first.mathExercisesSolved).toBe(5);
    expect(first.mathCorrectFirstTry).toBe(4);

    const worse = completeMathLevel(first, 3, 1, 3);
    expect(worse.mathLevelStars['3']).toBe(2);
    expect(worse.completedMathLevels).toBe(2);
    expect(mathMedals(completeMathLevel(worse, 4, 3, 5))).toBe(5);
  });
});

describe('reading diary and text style', () => {
  it('markWordRead adds an uppercase word once', () => {
    const p = base({ readWords: [] });
    const once = markWordRead(p, 'casa');
    expect(once.readWords).toEqual(['CASA']);
    expect(markWordRead(once, 'CASA')).toBe(once);
    expect(markWordRead(once, 'Luna').readWords).toEqual(['CASA', 'LUNA']);
    expect(p.readWords).toEqual([]);
  });

  it('does not touch the stars (the game rewards them separately)', () => {
    expect(markWordRead(base({ stars: 9 }), 'sole').stars).toBe(9);
  });

  it('setTextStyle changes only the style', () => {
    const p = base({ textStyle: 'upper' });
    const next = setTextStyle(p, 'cursive');
    expect(next.textStyle).toBe('cursive');
    expect({ ...next, textStyle: 'upper' }).toEqual(p);
  });

  it('rewards new words more than repeated ones', () => {
    expect(READ_WORD_REWARD_STARS).toBeGreaterThan(READ_REPEAT_REWARD_STARS);
    expect(READ_REPEAT_REWARD_STARS).toBeGreaterThan(0);
  });
});

describe('English progress', () => {
  it('records each vocabulary word, letter and family word once, in the right case', () => {
    let p = base();
    p = markEnglishWordLearned(p, 'DOG');
    p = markEnglishWordLearned(p, 'dog');
    p = markEnglishLetterLearned(p, 'b');
    p = markEnglishLetterLearned(p, 'B');
    p = markEnglishFamilyWordRead(p, 'CAT');
    p = markEnglishFamilyWordRead(p, 'cat');
    expect(p.englishWords).toEqual(['dog']);
    expect(p.englishLetters).toEqual(['B']);
    expect(p.englishFamilyWords).toEqual(['cat']);
  });

  it('returns the same object when nothing changes, and never touches the original', () => {
    const p = base({ englishWords: ['dog'] });
    expect(markEnglishWordLearned(p, 'dog')).toBe(p);
    const next = markEnglishWordLearned(p, 'cat');
    expect(next.englishWords).toEqual(['dog', 'cat']);
    expect(p.englishWords).toEqual(['dog']);
  });

  it('rewards a first time more than a repetition', () => {
    expect(ENGLISH_WORD_REWARD_STARS).toBeGreaterThan(ENGLISH_REPEAT_REWARD_STARS);
    expect(ENGLISH_LETTER_REWARD_STARS).toBeGreaterThan(ENGLISH_REPEAT_REWARD_STARS);
    expect(ENGLISH_FAMILY_REWARD_STARS).toBeGreaterThan(ENGLISH_REPEAT_REWARD_STARS);
  });
});

describe('English writing, sight words and stories progress', () => {
  it('records sight words, spelled words and stories once', () => {
    let p = base();
    p = markEnglishSightWordRead(p, 'THE');
    p = markEnglishSightWordRead(p, 'the');
    p = markEnglishWordSpelled(p, 'CAT');
    p = markEnglishWordSpelled(p, 'cat');
    p = markEnglishStoryRead(p, 'my-dog');
    p = markEnglishStoryRead(p, 'my-dog');
    expect(p.englishSightWords).toEqual(['the']);
    expect(p.englishSpelledWords).toEqual(['cat']);
    expect(p.englishStories).toEqual(['my-dog']);
    expect(markEnglishSightWordRead(p, 'the')).toBe(p);
  });

  it('keeps the traced case of a letter and counts a letter as written once both cases are traced', () => {
    let p = base();
    p = markEnglishLetterTraced(p, 'b', true);
    expect(p.englishTraced).toEqual(['B']);
    expect(englishLettersWritten(p)).toEqual([]);
    p = markEnglishLetterTraced(p, 'B', false);
    p = markEnglishLetterTraced(p, 'B', false);
    expect(p.englishTraced).toEqual(['B', 'b']);
    expect(englishLettersWritten(p)).toEqual(['B']);
    p = markEnglishLetterTraced(p, 'C', true);
    p = markEnglishLetterTraced(p, 'A', false);
    p = markEnglishLetterTraced(p, 'A', true);
    expect(englishLettersWritten(p)).toEqual(['A', 'B']);
  });

  it('rewards a first time more than a repetition', () => {
    for (const reward of [ENGLISH_SIGHT_REWARD_STARS, ENGLISH_TRACE_REWARD_STARS, ENGLISH_SPELL_REWARD_STARS, ENGLISH_STORY_REWARD_STARS]) {
      expect(reward).toBeGreaterThan(REPEAT);
    }
  });
});
