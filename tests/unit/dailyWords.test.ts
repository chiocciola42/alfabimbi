import { describe, expect, it } from 'vitest';
import { ALPHABET_DATA } from '../../src/data/alphabet';
import {
  CURATED_SPELL_WORDS,
  applyDailyWords,
  dailySpellList,
  dayNumber,
  seededShuffle,
  spellableWords,
  wordOfTheDay,
} from '../../src/data/dailyWords';
import { WORD_POOLS } from '../../src/data/words';

const day = (offset: number) => new Date(2026, 9, 14 + offset, 12, 0, 0);

describe('dayNumber', () => {
  it('is stable within a local day and increases by one at midnight', () => {
    expect(dayNumber(new Date(2026, 9, 14, 0, 0, 1))).toBe(dayNumber(new Date(2026, 9, 14, 23, 59, 59)));
    expect(dayNumber(new Date(2026, 9, 15, 0, 0, 1))).toBe(dayNumber(new Date(2026, 9, 14, 12)) + 1);
  });

  it('advances by exactly one across DST changes', () => {
    expect(dayNumber(new Date(2026, 9, 26, 12))).toBe(dayNumber(new Date(2026, 9, 25, 12)) + 1); // Europe DST end
    expect(dayNumber(new Date(2026, 2, 29, 12))).toBe(dayNumber(new Date(2026, 2, 28, 12)) + 1); // Europe DST start
  });
});

describe('wordOfTheDay', () => {
  it('is the same all day and always belongs to the pool', () => {
    for (const l of ALPHABET_DATA) {
      const a = wordOfTheDay(l.id, new Date(2026, 9, 14, 6));
      const b = wordOfTheDay(l.id, new Date(2026, 9, 14, 22));
      expect(a).toEqual(b);
      expect(WORD_POOLS[l.id]).toContainEqual(a);
    }
  });

  it('changes every day and cycles through the whole pool', () => {
    for (const l of ALPHABET_DATA) {
      const size = WORD_POOLS[l.id].length;
      const seen = new Set<string>();
      for (let d = 0; d < size; d++) {
        const today = wordOfTheDay(l.id, day(d)).word;
        const tomorrow = wordOfTheDay(l.id, day(d + 1)).word;
        expect(today, `${l.id} day ${d}`).not.toBe(tomorrow);
        seen.add(today);
      }
      expect(seen.size).toBe(size);
    }
  });

  it('does not rotate every letter in lockstep', () => {
    const indexes = new Set(
      ALPHABET_DATA.map((l) => WORD_POOLS[l.id].findIndex((p) => p.word === wordOfTheDay(l.id, day(0)).word))
    );
    expect(indexes.size).toBeGreaterThan(1);
  });

  it('throws for an unknown letter', () => {
    expect(() => wordOfTheDay('?', day(0))).toThrow();
  });
});

describe('applyDailyWords', () => {
  it('swaps word, emoji, category and phonics consistently, keeping the rest', () => {
    const letters = applyDailyWords(ALPHABET_DATA, day(3));
    expect(letters).toHaveLength(26);
    letters.forEach((l, i) => {
      const today = wordOfTheDay(l.id, day(3));
      expect(l).toMatchObject({ id: l.id, word: today.word, emoji: today.emoji, category: today.category });
      expect(l.phonics).toBe(`${l.letter} come ${today.word}`);
      expect(l.word.toUpperCase().startsWith(l.letter)).toBe(true);
      expect(l.funFact).toBe(ALPHABET_DATA[i].funFact);
      expect(l.funFactEmoji).toBe(ALPHABET_DATA[i].emoji);
      expect(l.strokesUppercase).toBe(ALPHABET_DATA[i].strokesUppercase);
    });
  });

  it('lists the other words of the pool (never today\'s) as sample words', () => {
    for (const l of applyDailyWords(ALPHABET_DATA, day(1))) {
      const pool = WORD_POOLS[l.id];
      expect(l.sampleWords).toHaveLength(pool.length - 1);
      expect(l.sampleWords.map((s) => s.word)).not.toContain(l.word);
      expect(l.sampleWords.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('does not mutate the source data', () => {
    const before = JSON.stringify(ALPHABET_DATA);
    applyDailyWords(ALPHABET_DATA, day(2));
    expect(JSON.stringify(ALPHABET_DATA)).toBe(before);
  });

  it('gives different words on consecutive days for every letter', () => {
    const d0 = applyDailyWords(ALPHABET_DATA, day(0));
    const d1 = applyDailyWords(ALPHABET_DATA, day(1));
    d0.forEach((l, i) => expect(l.word).not.toBe(d1[i].word));
  });
});

describe('spelling list', () => {
  it('only offers short, spellable, unique, uppercase words with hints', () => {
    const list = dailySpellList(day(0));
    expect(list.length).toBeGreaterThanOrEqual(40);
    expect(new Set(list.map((w) => w.word)).size).toBe(list.length);
    list.forEach((w) => {
      expect(w.word).toMatch(/^[A-Z]{3,6}$/);
      expect(w.hint.length).toBeGreaterThan(0);
      expect(w.emoji.length).toBeGreaterThan(0);
    });
    spellableWords().forEach((p) => expect(p.word).toMatch(/^[A-Za-z]{3,6}$/));
  });

  it('keeps the curated words and their hints', () => {
    const list = dailySpellList(day(0));
    for (const c of CURATED_SPELL_WORDS) expect(list).toContainEqual(c);
  });

  it('has the same order all day and a different order on other days', () => {
    const order = (d: Date) => dailySpellList(d).map((w) => w.word).join(',');
    expect(order(new Date(2026, 9, 14, 7))).toBe(order(new Date(2026, 9, 14, 21)));
    expect(order(day(0))).not.toBe(order(day(1)));
    expect(order(day(1))).not.toBe(order(day(2)));
  });

  it('seededShuffle is a deterministic permutation', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const a = seededShuffle(items, 42);
    expect(a).toEqual(seededShuffle(items, 42));
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(a).not.toEqual(items);
    expect(items[0]).toBe(0); // input untouched
  });
});
