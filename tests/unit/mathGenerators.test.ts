import { describe, expect, it } from 'vitest';
import { generateLevelQuestions } from '../../src/math/questionGenerator';
import { MATH_LEVEL_COUNT, WORLDS } from '../../src/math/worlds';
import { numericOptions } from '../../src/math/random';

describe('numericOptions', () => {
  it('returns four distinct values including the answer within bounds', () => {
    for (let correct = 0; correct <= 10; correct++) {
      const opts = numericOptions(correct, [-1, 1, -2, 2], 0, 10);
      expect(opts).toHaveLength(4);
      expect(new Set(opts).size).toBe(4);
      expect(opts).toContain(correct);
      expect(Math.min(...opts)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...opts)).toBeLessThanOrEqual(10);
    }
  });
});

describe('math levels', () => {
  it('defines 10 worlds with 50 levels in sequence', () => {
    expect(WORLDS).toHaveLength(10);
    expect(MATH_LEVEL_COUNT).toBe(50);
    const ids = WORLDS.flatMap((w) => w.levels.map((l) => l.id));
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('generates well-formed, answerable questions for every level', () => {
    for (let level = 1; level <= MATH_LEVEL_COUNT; level++) {
      for (let run = 0; run < 60; run++) {
        for (const q of generateLevelQuestions(level, 5)) {
          const where = `level ${level} type ${q.type}`;
          expect(q.instruction, where).toBeTruthy();
          expect(q.explanation, where).toBeTruthy();
          if (q.interaction === 'ten_frame_build') {
            expect(q.buildTarget, where).toBe(q.correctAnswer);
            expect(q.buildTarget).toBeGreaterThanOrEqual(1);
            expect(q.buildTarget).toBeLessThanOrEqual(10);
          } else if (q.interaction === 'tap_order') {
            expect(new Set(q.orderItems).size, where).toBe(q.orderItems?.length);
            expect(q.orderItems?.length, where).toBeGreaterThanOrEqual(4);
            if (q.orderLetters) expect(Object.keys(q.orderLetters), where).toHaveLength(q.orderItems!.length);
          } else if (q.interaction === 'match_pairs') {
            expect(q.matchNumbers, where).toHaveLength(3);
            expect(q.matchGroups?.map((g) => g.value).sort(), where).toEqual([...q.matchNumbers!].sort());
          } else {
            expect(q.options.map(String), where).toContain(String(q.correctAnswer));
            expect(new Set(q.options.map(String)).size, where).toBe(q.options.length);
          }
        }
      }
    }
  });
});
