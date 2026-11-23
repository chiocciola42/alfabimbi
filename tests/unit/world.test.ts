import { describe, expect, it } from 'vitest';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import { ALL_CITIES, ISLANDS, islandEdges, layoutIsland, parentCityId } from '../../src/world';
import { MATH_LEVEL_COUNT } from '../../src/math/worlds';
import {
  cityStars,
  claimCityReward,
  creditCityStars,
  isCityUnlocked,
  isGameUnlocked,
  islandStats,
  pendingCityRewards,
  seedCityStars,
} from '../../src/state/world';
import { sanitizeProgress } from '../../src/storage/persistence';
import type { ChildProgress } from '../../src/types';

const base: ChildProgress = { ...INITIAL_PROGRESS };
const italian = ISLANDS.find((i) => i.id === 'italiano')!;
const math = ISLANDS.find((i) => i.id === 'matematica')!;

describe('island registry', () => {
  it('has one island per subject with unique ids', () => {
    expect(ISLANDS.map((i) => i.section).sort()).toEqual(['english', 'italian', 'math']);
    const ids = ALL_CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every city at least one game, a positive clear threshold and valid references', () => {
    for (const island of ISLANDS) {
      island.cities.forEach((city, i) => {
        expect(city.games.length, city.id).toBeGreaterThan(0);
        expect(city.clearStars, city.id).toBeGreaterThan(0);
        if (city.branchFrom) expect(island.cities.some((c) => c.id === city.branchFrom)).toBe(true);
        else if (i > 0) expect(parentCityId(island, i)).not.toBeNull();
      });
      const gameIds = island.cities.flatMap((c) => c.games.map((g) => g.id));
      expect(new Set(gameIds).size).toBe(gameIds.length);
    }
  });

  it('turns every math world into a city and every level into a game, with nothing lost', () => {
    const levels = math.cities.flatMap((c) => c.games.filter((g) => g.levelId !== undefined));
    expect(levels).toHaveLength(MATH_LEVEL_COUNT);
    expect(new Set(levels.map((g) => g.levelId)).size).toBe(MATH_LEVEL_COUNT);
  });

  it('lays cities out without overlaps and connects each one to its parent', () => {
    for (const island of ISLANDS) {
      const pos = layoutIsland(island);
      const list = island.cities.map((c) => pos[c.id]);
      expect(list.every(Boolean)).toBe(true);
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++)
          expect(Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z), `${island.id} ${i}-${j}`).toBeGreaterThan(5.5);
      expect(islandEdges(island)).toHaveLength(island.cities.length - 1);
    }
  });
});

describe('city stars and unlocking', () => {
  it('opens only the first city of an island at the start', () => {
    expect(isCityUnlocked(base, italian, 'it-borgo')).toBe(true);
    expect(isCityUnlocked(base, italian, 'it-porto')).toBe(false);
    expect(isCityUnlocked(base, math, 'math-lab')).toBe(true); // always open
    expect(isCityUnlocked(base, math, 'math-2')).toBe(false);
  });

  it('credits stars to a city and opens the next one once the first is cleared', () => {
    const borgo = italian.cities[0];
    let p = creditCityStars(base, borgo.id, borgo.clearStars - 1);
    expect(cityStars(p, borgo)).toBe(borgo.clearStars - 1);
    expect(isCityUnlocked(p, italian, 'it-porto')).toBe(false);
    p = creditCityStars(p, borgo.id, 1);
    expect(isCityUnlocked(p, italian, 'it-porto')).toBe(true);
    expect(isCityUnlocked(p, italian, 'it-parole')).toBe(false);
  });

  it('ignores unknown cities and negative amounts, and keeps math cities derived from levels', () => {
    expect(creditCityStars(base, 'nowhere', 5)).toBe(base);
    expect(creditCityStars(base, 'it-borgo', -3)).toBe(base);
    expect(creditCityStars(base, 'math-1', 5)).toBe(base);
    const p = { ...base, mathLevelStars: { '1': 3, '2': 2 } };
    expect(cityStars(p, math.cities[0])).toBe(5);
  });

  it('opens a city that was already played, even if the previous one is not cleared (old saves)', () => {
    const p = { ...base, cityStars: { 'it-torre': 2 } };
    expect(isCityUnlocked(p, italian, 'it-torre')).toBe(true);
  });

  it('opens every city when the parents unlocked everything', () => {
    const p = { ...base, allLevelsUnlocked: true };
    expect(ALL_CITIES.every((c) => isCityUnlocked(p, ISLANDS.find((i) => i.cities.includes(c))!, c.id))).toBe(true);
  });

  it('opens math levels in order inside a city', () => {
    const city = math.cities[0];
    expect(isGameUnlocked(base, city, 0)).toBe(true);
    expect(isGameUnlocked(base, city, 1)).toBe(false);
    expect(isGameUnlocked({ ...base, mathLevelStars: { '1': 1 } }, city, 1)).toBe(true);
  });

  it('summarises an island', () => {
    const p = creditCityStars(base, 'it-borgo', 10);
    expect(islandStats(p, italian)).toMatchObject({ stars: 10, cleared: 1, unlocked: 2, total: italian.cities.length });
  });
});

describe('city rewards', () => {
  it('lists cleared cities whose reward is not claimed and claims each only once', () => {
    const p = creditCityStars(base, 'it-borgo', 10);
    expect(pendingCityRewards(p).map((c) => c.id)).toEqual(['it-borgo']);
    const first = claimCityReward(p, 'it-borgo');
    expect(first.sticker).toBeDefined();
    expect(first.progress.unlockedStickers).toContain(first.sticker!.id);
    expect(first.progress.claimedCities).toEqual(['it-borgo']);
    expect(pendingCityRewards(first.progress)).toEqual([]);
    const again = claimCityReward(first.progress, 'it-borgo');
    expect(again.progress).toBe(first.progress);
    expect(again.sticker).toBeUndefined();
  });

  it('never hands out a sticker that is already owned', () => {
    let p: ChildProgress = creditCityStars(base, 'it-borgo', 10);
    p = { ...p, unlockedStickers: STICKERS_CATALOG.slice(0, 5).map((s) => s.id) };
    const { sticker } = claimCityReward(p, 'it-borgo');
    expect(p.unlockedStickers).not.toContain(sticker!.id);
  });

  it('still marks the city when every sticker is already won', () => {
    const p: ChildProgress = { ...base, unlockedStickers: STICKERS_CATALOG.map((s) => s.id) };
    const r = claimCityReward(p, 'it-porto');
    expect(r.sticker).toBeUndefined();
    expect(r.progress.claimedCities).toContain('it-porto');
  });
});

describe('persistence of the islands', () => {
  it('keeps known cities, drops unknown ones and clamps values', () => {
    const p = sanitizeProgress({ cityStars: { 'it-borgo': 7, nope: 3, 'en-abc': -4 }, claimedCities: ['it-borgo', 'x'] });
    expect(p.cityStars).toEqual({ 'it-borgo': 7 });
    expect(p.claimedCities).toEqual(['it-borgo']);
  });

  it('opens the cities of games already played in saves made before the islands', () => {
    const p = sanitizeProgress({ stars: 50, tracedUppercase: ['A'], englishWords: ['cat'], syllables: ['LA'] });
    expect(p.cityStars).toMatchObject({ 'it-borgo': 1, 'en-words': 1, 'it-sillabe': 1 });
    expect(isCityUnlocked(p, italian, 'it-sillabe')).toBe(true);
    expect(seedCityStars(INITIAL_PROGRESS)).toEqual({});
  });

  it('does not seed again once the field exists', () => {
    expect(sanitizeProgress({ tracedUppercase: ['A'], cityStars: {} }).cityStars).toEqual({});
  });
});

describe('migration of cleared math worlds', () => {
  it('marks the worlds already cleared before the islands as claimed, so no burst of rewards appears', () => {
    const levelStars: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) levelStars[String(i)] = 3;
    const p = sanitizeProgress({ mathLevelStars: levelStars });
    expect(p.claimedCities).toEqual(['math-1']);
    expect(pendingCityRewards(p)).toEqual([]);
  });
});
