import { describe, expect, it } from 'vitest';
import {
  READING_LEVELS,
  READING_LEVEL_UP_AFTER,
  READING_WORDS,
  pickImageChoices,
  readingRoundOrder,
  shuffleSyllables,
  suggestedReadingLevel,
  wordsOfLevel,
} from '../../src/data/readingWords';

const VOWELS = /[AEIOU]/;

describe('reading words', () => {
  it('are made only of Italian alphabet letters (no J, K, W, X, Y, no foreign words)', () => {
    for (const w of READING_WORDS) {
      expect(w.word, w.word).toMatch(/^[A-Z]+$/);
      expect(w.word, w.word).not.toMatch(/[JKWXY]/);
      expect(w.emoji.length).toBeGreaterThan(0);
    }
  });

  it('have syllables that rebuild the word, each with at least one vowel', () => {
    for (const w of READING_WORDS) {
      expect(w.syllables.join(''), w.word).toBe(w.word);
      expect(w.syllables.length, w.word).toBeGreaterThanOrEqual(2);
      for (const s of w.syllables) expect(s, `${w.word}: ${s}`).toMatch(VOWELS);
    }
  });

  it('have no duplicate words or pictures (a picture must identify one word)', () => {
    expect(new Set(READING_WORDS.map((w) => w.word)).size).toBe(READING_WORDS.length);
    expect(new Set(READING_WORDS.map((w) => w.emoji)).size).toBe(READING_WORDS.length);
  });

  it('get harder with the level: short words first, long words last', () => {
    for (const w of wordsOfLevel(1)) {
      expect(w.syllables, w.word).toHaveLength(2);
      expect(w.word.length, w.word).toBeLessThanOrEqual(5);
    }
    for (const w of wordsOfLevel(2)) expect(w.word.length, w.word).toBeLessThanOrEqual(9);
    for (const w of wordsOfLevel(3)) expect(w.syllables.length, w.word).toBeGreaterThanOrEqual(3);
  });

  it('have enough words per level to level up', () => {
    for (const level of READING_LEVELS) {
      expect(wordsOfLevel(level).length).toBeGreaterThanOrEqual(READING_LEVEL_UP_AFTER * 2);
    }
  });
});

describe('suggestedReadingLevel', () => {
  const learn = (level: 1 | 2 | 3, n: number) => wordsOfLevel(level).slice(0, n).map((w) => w.word);

  it('starts easy and moves up once enough words of a level are read', () => {
    expect(suggestedReadingLevel([])).toBe(1);
    expect(suggestedReadingLevel(learn(1, READING_LEVEL_UP_AFTER - 1))).toBe(1);
    expect(suggestedReadingLevel(learn(1, READING_LEVEL_UP_AFTER))).toBe(2);
    expect(suggestedReadingLevel([...learn(1, READING_LEVEL_UP_AFTER), ...learn(2, READING_LEVEL_UP_AFTER)])).toBe(3);
  });

  it('ignores words that are unknown', () => {
    expect(suggestedReadingLevel(['ZZZ', 'QQQ'])).toBe(1);
  });
});

describe('readingRoundOrder', () => {
  it('lists every word of the level once, unread words first', () => {
    const read = wordsOfLevel(1).slice(0, 5).map((w) => w.word);
    const order = readingRoundOrder(1, read, 42);
    expect(order.map((w) => w.word).sort()).toEqual(wordsOfLevel(1).map((w) => w.word).sort());
    const firstReadAt = order.findIndex((w) => read.includes(w.word));
    expect(firstReadAt).toBe(order.length - read.length);
    order.slice(0, firstReadAt).forEach((w) => expect(read).not.toContain(w.word));
  });

  it('is deterministic for a seed and changes with it', () => {
    const a = readingRoundOrder(2, [], 1).map((w) => w.word).join();
    expect(readingRoundOrder(2, [], 1).map((w) => w.word).join()).toBe(a);
    expect(readingRoundOrder(2, [], 2).map((w) => w.word).join()).not.toBe(a);
  });
});

describe('pickImageChoices', () => {
  it('returns the right word plus distinct distractors, all with different pictures', () => {
    for (const target of READING_WORDS) {
      const choices = pickImageChoices(target, 3);
      expect(choices, target.word).toHaveLength(3);
      expect(choices.filter((c) => c.word === target.word)).toHaveLength(1);
      expect(new Set(choices.map((c) => c.emoji)).size).toBe(3);
      // never two words starting with the same syllable: the reading cannot be ambiguous
      expect(new Set(choices.map((c) => c.syllables[0])).size).toBe(3);
    }
  });

  it('puts the right word in different positions', () => {
    const target = READING_WORDS[0];
    const positions = new Set<number>();
    for (let i = 0; i < 60; i++) positions.add(pickImageChoices(target, 3).findIndex((c) => c.word === target.word));
    expect(positions.size).toBe(3);
  });

  it('uses the given random source', () => {
    const target = READING_WORDS[0];
    const same = () => 0;
    expect(pickImageChoices(target, 3, same)).toEqual(pickImageChoices(target, 3, same));
  });
});

describe('shuffleSyllables', () => {
  it('keeps the same syllables but never returns the solved order', () => {
    for (const w of READING_WORDS) {
      const out = shuffleSyllables(w.syllables);
      expect([...out].sort()).toEqual([...w.syllables].sort());
      // words made of identical syllables cannot be scrambled
      if (new Set(w.syllables).size > 1) expect(out.join('-'), w.word).not.toBe(w.syllables.join('-'));
    }
  });

  it('copes with a single syllable and with a stubborn random source', () => {
    expect(shuffleSyllables(['CA'])).toEqual(['CA']);
    expect(shuffleSyllables(['CA', 'SA'], () => 0.99)).toEqual(['SA', 'CA']);
  });
});
