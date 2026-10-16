import { describe, expect, it } from 'vitest';
import { ALPHABET_DATA, INITIAL_PROGRESS } from '../../src/data/alphabet';
import { MATH_LEVEL_COUNT, WORLDS } from '../../src/math/worlds';
import {
  CERTIFICATE_STEP,
  alphabetMap,
  buildMissions,
  certificatesEarned,
  lettersToNextCertificate,
  levelsToNextCertificate,
  mathCertificatesEarned,
  mathWorldMap,
  MATH_CERTIFICATE_STEP,
  summarizeMissions,
} from '../../src/state/goals';

const noProgress = {
  lettersTracedCount: 0,
  completedBubbleLevels: 0,
  completedWordQuizRounds: 0,
  completedMathLevels: 0,
  stars: 0,
  readWordsCount: 0,
};

describe('certificates', () => {
  it('are earned every 5 letters', () => {
    expect(certificatesEarned(0)).toEqual([]);
    expect(certificatesEarned(4)).toEqual([]);
    expect(certificatesEarned(5).map((c) => c.letters)).toEqual([5]);
    expect(certificatesEarned(14).map((c) => c.letters)).toEqual([5, 10]);
    expect(certificatesEarned(25).map((c) => c.letters)).toEqual([5, 10, 15, 20, 25]);
  });

  it('end with a special one for the whole alphabet', () => {
    const all = certificatesEarned(ALPHABET_DATA.length);
    expect(all.at(-1)?.letters).toBe(ALPHABET_DATA.length);
    expect(all.at(-1)?.title).toMatch(/alfabeto/i);
    expect(new Set(all.map((c) => c.letters)).size).toBe(all.length);
  });

  it('count how many letters are missing to the next one', () => {
    expect(CERTIFICATE_STEP).toBe(5);
    expect(lettersToNextCertificate(0)).toBe(5);
    expect(lettersToNextCertificate(3)).toBe(2);
    expect(lettersToNextCertificate(5)).toBe(5);
    expect(lettersToNextCertificate(25)).toBe(1);
    expect(lettersToNextCertificate(ALPHABET_DATA.length)).toBe(0);
  });
});

describe('alphabetMap', () => {
  it('has one cell per letter and tells not started / started / mastered apart', () => {
    const cells = alphabetMap({ masteredLetters: ['A'], tracedUppercase: ['A', 'E'], tracedLowercase: ['A', 'I'] });
    expect(cells).toHaveLength(ALPHABET_DATA.length);
    const state = (id: string) => cells.find((c) => c.id === id)?.state;
    expect(state('A')).toBe('mastered');
    expect(state('E')).toBe('started');
    expect(state('I')).toBe('started');
    expect(state('O')).toBe('none');
  });

  it('follows the real progress shape', () => {
    expect(alphabetMap(INITIAL_PROGRESS).every((c) => c.state === 'none')).toBe(true);
  });
});

describe('missions', () => {
  it('include the reading mission and have unique ids', () => {
    const missions = buildMissions(noProgress);
    expect(missions.map((m) => m.id)).toContain('m_read');
    expect(new Set(missions.map((m) => m.id)).size).toBe(missions.length);
    missions.forEach((m) => {
      expect(m.goal).toBeGreaterThan(0);
      expect(m.reward).toBeGreaterThan(0);
    });
  });

  it('read their progress from the child', () => {
    const missions = buildMissions({ ...noProgress, readWordsCount: 4, stars: 12 });
    expect(missions.find((m) => m.id === 'm_read')?.current).toBe(4);
    expect(missions.find((m) => m.id === 'm_stars')?.current).toBe(12);
  });

  it('are summarised as a percentage, completed and still to claim', () => {
    const none = summarizeMissions(buildMissions(noProgress), []);
    expect(none).toMatchObject({ completed: 0, toClaim: 0, percent: 0 });

    const some = buildMissions({ ...noProgress, lettersTracedCount: 2, completedBubbleLevels: 1 });
    const partial = summarizeMissions(some, []);
    expect(partial.completed).toBe(1);
    expect(partial.toClaim).toBe(1);
    expect(partial.percent).toBeGreaterThan(0);
    expect(partial.percent).toBeLessThan(100);
    expect(summarizeMissions(some, ['m_trace']).toClaim).toBe(0);

    const everything = buildMissions({
      lettersTracedCount: 9,
      completedBubbleLevels: 9,
      completedWordQuizRounds: 9,
      completedMathLevels: 9,
      stars: 999,
      readWordsCount: 99,
    });
    const done = summarizeMissions(everything, []);
    expect(done.percent).toBe(100);
    expect(done.completed).toBe(done.total);
  });

  it('handles an empty list', () => {
    expect(summarizeMissions([], [])).toEqual({ total: 0, completed: 0, toClaim: 0, percent: 0 });
  });
});

describe('math certificates', () => {
  it('are earned every 5 levels played', () => {
    expect(MATH_CERTIFICATE_STEP).toBe(5);
    expect(mathCertificatesEarned(0)).toEqual([]);
    expect(mathCertificatesEarned(4)).toEqual([]);
    expect(mathCertificatesEarned(5).map((c) => c.levels)).toEqual([5]);
    expect(mathCertificatesEarned(17).map((c) => c.levels)).toEqual([5, 10, 15]);
    mathCertificatesEarned(40).forEach((c) => expect(c.kind).toBe('levels'));
  });

  it('end with a special one for the whole map', () => {
    const all = mathCertificatesEarned(MATH_LEVEL_COUNT);
    expect(all.at(-1)?.levels).toBe(MATH_LEVEL_COUNT);
    expect(new Set(all.map((c) => c.levels)).size).toBe(all.length);
  });

  it('count how many levels are missing to the next one', () => {
    expect(levelsToNextCertificate(0)).toBe(5);
    expect(levelsToNextCertificate(3)).toBe(2);
    expect(levelsToNextCertificate(5)).toBe(5);
    expect(levelsToNextCertificate(MATH_LEVEL_COUNT)).toBe(0);
  });

  it('letter certificates are tagged as such', () => {
    expect(certificatesEarned(5)[0].kind).toBe('letters');
  });
});

describe('mathWorldMap', () => {
  const first = WORLDS[0];

  it('has one cell per world, none started at the beginning', () => {
    const cells = mathWorldMap({});
    expect(cells).toHaveLength(WORLDS.length);
    cells.forEach((c) => {
      expect(c.state).toBe('none');
      expect(c.stars).toBe(0);
      expect(c.maxStars).toBe(c.levelCount * 3);
    });
  });

  it('tells started and completed worlds apart and adds up the stars', () => {
    const started = mathWorldMap({ [String(first.levels[0].id)]: 2 });
    expect(started[0]).toMatchObject({ state: 'started', levelsDone: 1, stars: 2 });
    expect(started[1].state).toBe('none');

    const all = Object.fromEntries(first.levels.map((l) => [String(l.id), 3]));
    expect(mathWorldMap(all)[0]).toMatchObject({ state: 'mastered', levelsDone: first.levels.length, stars: first.levels.length * 3 });
  });

  it('ignores levels without stars', () => {
    expect(mathWorldMap({ [String(first.levels[0].id)]: 0 })[0].state).toBe('none');
  });
});
