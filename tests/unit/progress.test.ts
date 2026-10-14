import { describe, expect, it } from 'vitest';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import { PACK_COST, TRACE_REWARD_STARS, addStars, claimMission, markLetterTraced, openPack } from '../../src/state/progress';
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
