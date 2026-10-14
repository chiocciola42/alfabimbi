import { describe, expect, it } from 'vitest';
import { ALBUMS_LIST, ALPHABET_DATA, INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import { dailySpellList } from '../../src/data/dailyWords';
import { WORD_POOLS } from '../../src/data/words';

describe('alphabet data', () => {
  it('contains the 26 letters with unique ids and matching upper/lower case', () => {
    expect(ALPHABET_DATA).toHaveLength(26);
    expect(new Set(ALPHABET_DATA.map((l) => l.id)).size).toBe(26);
    for (const l of ALPHABET_DATA) {
      expect(l.letter).toBe(l.id);
      expect(l.lowercase).toBe(l.letter.toLowerCase());
      expect(l.word.toUpperCase().startsWith(l.letter), `${l.id} -> ${l.word}`).toBe(true);
      expect([1, 2, 3, 4]).toContain(l.level);
      expect(l.sampleWords.length).toBeGreaterThan(0);
    }
  });

  it('provides tracing strokes with at least two points, inside the 0-100 canvas', () => {
    for (const l of ALPHABET_DATA) {
      for (const strokes of [l.strokesUppercase, l.strokesLowercase]) {
        expect(strokes.length, `${l.id} strokes`).toBeGreaterThan(0);
        for (const stroke of strokes) {
          expect(stroke.points.length).toBeGreaterThanOrEqual(2);
          for (const p of stroke.points) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(100);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });
});

describe('sticker catalog', () => {
  it('has unique ids and every sticker belongs to an existing album', () => {
    const albumIds = new Set(ALBUMS_LIST.map((a) => a.id));
    expect(new Set(STICKERS_CATALOG.map((s) => s.id)).size).toBe(STICKERS_CATALOG.length);
    for (const s of STICKERS_CATALOG) {
      expect(albumIds.has(s.albumId)).toBe(true);
      expect(s.category).toBe(s.albumId);
      expect(s.requiredStars).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps every album non-empty with tiers in ascending order', () => {
    for (const a of ALBUMS_LIST) {
      expect(STICKERS_CATALOG.some((s) => s.albumId === a.id), a.id).toBe(true);
    }
    const tiers = ALBUMS_LIST.map((a) => a.tierNumber);
    expect(tiers).toEqual([...tiers].sort((x, y) => x - y));
  });

  it('only references known stickers in the initial progress', () => {
    const ids = new Set(STICKERS_CATALOG.map((s) => s.id));
    INITIAL_PROGRESS.unlockedStickers.forEach((id) => expect(ids.has(id)).toBe(true));
    INITIAL_PROGRESS.placedStickers.forEach((p) => expect(ids.has(p.stickerId)).toBe(true));
  });
});

describe('word pools', () => {
  it('give every letter at least 5 words', () => {
    for (const l of ALPHABET_DATA) {
      const pool = WORD_POOLS[l.id];
      expect(pool, l.id).toBeDefined();
      expect(pool.length, l.id).toBeGreaterThanOrEqual(5);
    }
  });

  it('only contain words starting with their letter, without duplicates, with the signature word first', () => {
    for (const l of ALPHABET_DATA) {
      const pool = WORD_POOLS[l.id];
      pool.forEach((p) => {
        expect(p.word.toUpperCase().startsWith(l.id), `${l.id}: ${p.word}`).toBe(true);
        expect(p.emoji.length).toBeGreaterThan(0);
      });
      expect(new Set(pool.map((p) => p.word)).size).toBe(pool.length);
      expect(pool[0].word).toBe(l.word);
      expect(pool[0].emoji).toBe(l.emoji);
    }
  });

  it('include every sample word already shown in the explorer', () => {
    for (const l of ALPHABET_DATA) {
      const words = WORD_POOLS[l.id].map((p) => p.word);
      l.sampleWords.forEach((sw) => expect(words, `${l.id}: ${sw.word}`).toContain(sw.word));
    }
  });
});

describe('spelling words', () => {
  it('are uppercase, non-empty and have a hint', () => {
    for (const w of dailySpellList(new Date(2026, 9, 14))) {
      expect(w.word).toMatch(/^[A-Z]+$/);
      expect(w.hint.length).toBeGreaterThan(0);
    }
  });
});
