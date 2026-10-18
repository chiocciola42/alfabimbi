import { describe, expect, it } from 'vitest';
import {
  ALL_SYLLABLES,
  HUNT_LETTERS,
  PICTURE_LETTERS,
  PICTURE_WORDS,
  SYLLABLE_FAMILIES,
  VOWELS,
  countLetter,
  directSyllables,
  exampleFor,
  gapChoices,
  gapQuestion,
  huntQueue,
  inverseSyllables,
  letterName,
  pictureLetterOrder,
  pictureRound,
  syllableChoices,
  syllableQueue,
  syllablesFor,
  writeTiles,
} from '../../src/data/italianPractice';
import { READING_WORDS } from '../../src/data/readingWords';
import { WORD_POOLS } from '../../src/data/words';
import { INITIAL_PROGRESS } from '../../src/data/alphabet';
import { SYLLABLE_REWARD_STARS, markSyllableLearned } from '../../src/state/progress';
import { sanitizeProgress } from '../../src/storage/persistence';

const seededRnd = (seed = 1) => {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
};

describe('syllable families', () => {
  it('give each consonant five syllables with an example word that starts with it', () => {
    expect(SYLLABLE_FAMILIES.length).toBeGreaterThanOrEqual(8);
    for (const f of SYLLABLE_FAMILIES) {
      expect(f.examples.map((e) => e.vowel)).toEqual([...VOWELS]);
      for (const e of f.examples) {
        expect(e.syllable).toBe(f.consonant + e.vowel);
        expect(e.word.startsWith(e.syllable), `${e.word} / ${e.syllable}`).toBe(true);
        expect(e.emoji).not.toBe('');
      }
    }
  });

  it('builds direct (LA…) and inverse (AL…) syllables, and every one is known', () => {
    expect(directSyllables('L')).toEqual(['LA', 'LE', 'LI', 'LO', 'LU']);
    expect(inverseSyllables('L')).toEqual(['AL', 'EL', 'IL', 'OL', 'UL']);
    expect(syllablesFor('M', 'both')).toHaveLength(10);
    expect(ALL_SYLLABLES).toHaveLength(SYLLABLE_FAMILIES.length * 10);
    expect(new Set(ALL_SYLLABLES).size).toBe(ALL_SYLLABLES.length);
    expect(exampleFor('LA')?.word).toBe('LAMA');
    expect(exampleFor('AL')).toBeUndefined();
  });

  it('puts unlearned syllables first and is stable for a given seed', () => {
    const q = syllableQueue('L', 'direct', ['LA', 'LU'], 7);
    expect([...q].sort()).toEqual(directSyllables('L'));
    expect(q.slice(0, 3)).not.toContain('LA');
    expect(q.slice(0, 3)).not.toContain('LU');
    expect(syllableQueue('L', 'direct', ['LA', 'LU'], 7)).toEqual(q);
  });
});

describe('syllable exercises', () => {
  it('offers three choices that differ only by the vowel and keep the same direction', () => {
    for (const target of ['LA', 'LU', 'AL', 'UL']) {
      const choices = syllableChoices(target, 3, seededRnd(3));
      expect(choices).toHaveLength(3);
      expect(choices).toContain(target);
      expect(new Set(choices).size).toBe(3);
      const inverse = VOWELS.includes(target[0] as (typeof VOWELS)[number]);
      for (const c of choices) {
        expect(c.includes('L')).toBe(true);
        expect(VOWELS.includes(c[0] as (typeof VOWELS)[number])).toBe(inverse);
      }
    }
  });

  it('gives the two letters of the syllable plus spare vowels as writing tiles', () => {
    for (const s of ['LA', 'EL', 'MU']) {
      const tiles = writeTiles(s, seededRnd(5));
      expect(tiles).toHaveLength(4);
      expect(new Set(tiles).size).toBe(4);
      for (const letter of s) expect(tiles).toContain(letter);
    }
  });
});

describe('gap words', () => {
  it('hides one syllable that changes with the variant', () => {
    const word = READING_WORDS.find((w) => w.word === 'CAMPANA')!;
    const seen = new Set(word.syllables.map((_, v) => gapQuestion(word, v).index));
    expect(seen.size).toBe(word.syllables.length);
    for (const w of READING_WORDS) {
      const q = gapQuestion(w, 2);
      expect(w.syllables[q.index]).toBe(q.missing);
    }
  });

  it('offers the missing syllable and two look-alike syllables of the same length', () => {
    for (const w of READING_WORDS) {
      const q = gapQuestion(w);
      const choices = gapChoices(q, 3, seededRnd(9));
      expect(choices, w.word).toHaveLength(3);
      expect(choices).toContain(q.missing);
      expect(new Set(choices).size).toBe(3);
      for (const c of choices) expect(c.length).toBe(q.missing.length);
    }
  });
});

describe('initial letter pictures', () => {
  it('only uses pictures that cannot be mistaken for words with another initial', () => {
    const owners = new Map<string, Set<string>>();
    for (const pool of Object.values(WORD_POOLS)) {
      for (const w of pool) owners.set(w.emoji, (owners.get(w.emoji) ?? new Set()).add(w.word[0].toUpperCase()));
    }
    expect(PICTURE_WORDS.length).toBeGreaterThan(100);
    expect(new Set(PICTURE_WORDS.map((p) => p.emoji)).size).toBe(PICTURE_WORDS.length);
    for (const p of PICTURE_WORDS) expect(owners.get(p.emoji)!.size).toBe(1);
    // pesce / tonno / salmone share a fish: it is left out
    expect(PICTURE_WORDS.some((p) => p.emoji === '🐟')).toBe(false);
  });

  it('builds a round with three right pictures and three others with distinct initials', () => {
    expect(PICTURE_LETTERS).toContain('L');
    for (const letter of PICTURE_LETTERS) {
      const round = pictureRound(letter, seededRnd(4));
      expect(round.pictures).toHaveLength(6);
      const right = round.pictures.filter((p) => p.initial === letter);
      const others = round.pictures.filter((p) => p.initial !== letter);
      expect(right).toHaveLength(3);
      expect(others).toHaveLength(3);
      expect(new Set(others.map((p) => p.initial)).size).toBe(3);
      expect(new Set(round.pictures.map((p) => p.emoji)).size).toBe(6);
    }
    expect([...pictureLetterOrder(3)].sort()).toEqual([...PICTURE_LETTERS].sort());
  });
});

describe('letter hunt', () => {
  it('counts letters regardless of case', () => {
    expect(countLetter('STELLA', 'l')).toBe(2);
    expect(countLetter('CAMPANA', 'L')).toBe(0);
  });

  it('pairs words with the focus letter, or with one of their own letters', () => {
    expect(HUNT_LETTERS).toContain('L');
    for (const level of [1, 2, 3] as const) {
      const focused = huntQueue('L', level, 11);
      expect(focused.length).toBeGreaterThan(0);
      for (const item of focused) expect(countLetter(item.word.word, 'L')).toBeGreaterThan(0);
      const mixed = huntQueue(null, level, 11);
      expect(mixed.every((i) => i.word.level === level)).toBe(true);
      for (const item of mixed) expect(countLetter(item.word.word, item.letter)).toBeGreaterThan(0);
    }
  });

  it('never runs dry for a letter, whatever the length', () => {
    for (const letter of HUNT_LETTERS) {
      for (const level of [1, 2, 3] as const) expect(huntQueue(letter, level, 2).length).toBeGreaterThan(0);
    }
  });

  it('knows how to say letter names', () => {
    expect(letterName('L')).toBe('elle');
    expect(letterName('z')).toBe('zeta');
  });
});

describe('syllable progress', () => {
  it('records a syllable once', () => {
    const p1 = markSyllableLearned(INITIAL_PROGRESS, 'la');
    expect(p1.syllables).toEqual(['LA']);
    expect(markSyllableLearned(p1, 'LA')).toBe(p1);
    expect(SYLLABLE_REWARD_STARS).toBeGreaterThan(0);
  });

  it('is cleaned when loaded: unknown and duplicate syllables go away', () => {
    expect(sanitizeProgress({ syllables: ['LA', 'XX', 'LA', 'AL', 7] }).syllables).toEqual(['LA', 'AL']);
    expect(sanitizeProgress({}).syllables).toEqual([]);
    expect(sanitizeProgress({ syllables: 'LA' }).syllables).toEqual([]);
  });
});
