import type { ChildProgress, StickerItem } from '../types';
import { STICKERS_CATALOG } from '../data/alphabet';
import { ISLANDS, KNOWN_CITY_IDS, parentCityId } from '../world';
import type { CityDef, IslandDef } from '../world';

const MAX_CITY_STARS = 9999;

/** Stelle della città: in matematica la somma delle stelline dei livelli, altrove quelle guadagnate giocando. */
export function cityStars(progress: ChildProgress, city: CityDef): number {
  if (city.levelIds) {
    return city.levelIds.reduce((sum, id) => sum + (progress.mathLevelStars[String(id)] ?? 0), 0);
  }
  return progress.cityStars[city.id] ?? 0;
}

export function isCityCleared(progress: ChildProgress, city: CityDef): boolean {
  return cityStars(progress, city) >= city.clearStars;
}

/**
 * Una città è aperta se è la prima, se è sempre aperta, se i genitori hanno sbloccato tutto,
 * se la città da cui parte il sentiero è stata superata, o se ci si è già giocato (progressi di prima).
 */
export function isCityUnlocked(progress: ChildProgress, island: IslandDef, cityId: string): boolean {
  const index = island.cities.findIndex((c) => c.id === cityId);
  if (index < 0) return false;
  const city = island.cities[index];
  if (progress.allLevelsUnlocked || city.alwaysOpen) return true;
  const parentId = parentCityId(island, index);
  if (!parentId) return true;
  if (cityStars(progress, city) > 0 || progress.claimedCities.includes(city.id)) return true;
  const parent = island.cities.find((c) => c.id === parentId);
  return parent ? isCityCleared(progress, parent) && isCityUnlocked(progress, island, parentId) : false;
}

/** Nelle città di matematica i livelli si aprono in ordine (basta 1 stellina per passare al successivo). */
export function isGameUnlocked(progress: ChildProgress, city: CityDef, gameIndex: number): boolean {
  if (progress.allLevelsUnlocked || gameIndex <= 0) return true;
  const game = city.games[gameIndex];
  const prev = city.games[gameIndex - 1];
  if (game.levelId === undefined || prev.levelId === undefined) return true;
  return (progress.mathLevelStars[String(prev.levelId)] ?? 0) > 0 || (progress.mathLevelStars[String(game.levelId)] ?? 0) > 0;
}

export interface IslandStats {
  stars: number;
  cleared: number;
  unlocked: number;
  total: number;
}

export function islandStats(progress: ChildProgress, island: IslandDef): IslandStats {
  let stars = 0;
  let cleared = 0;
  let unlocked = 0;
  for (const city of island.cities) {
    stars += Math.min(cityStars(progress, city), city.clearStars);
    if (isCityCleared(progress, city)) cleared++;
    if (isCityUnlocked(progress, island, city.id)) unlocked++;
  }
  return { stars, cleared, unlocked, total: island.cities.length };
}

/** Accredita stelle a una città (solo per le città non di matematica, che le ricavano dai livelli). */
export function creditCityStars(progress: ChildProgress, cityId: string, count: number): ChildProgress {
  const amount = Math.max(0, Math.floor(count));
  if (amount === 0 || !KNOWN_CITY_IDS.has(cityId)) return progress;
  const found = ISLANDS.flatMap((i) => i.cities).find((c) => c.id === cityId);
  if (!found || found.levelIds) return progress;
  const next = Math.min(MAX_CITY_STARS, (progress.cityStars[cityId] ?? 0) + amount);
  return { ...progress, cityStars: { ...progress.cityStars, [cityId]: next } };
}

/** Città superate il cui premio non è ancora stato ritirato. */
export function pendingCityRewards(progress: ChildProgress): CityDef[] {
  return ISLANDS.flatMap((i) => i.cities).filter((c) => isCityCleared(progress, c) && !progress.claimedCities.includes(c.id));
}

/** Una figurina non ancora posseduta, un po' più avanti del punto in cui si è arrivati. */
export function pickRewardSticker(progress: ChildProgress): StickerItem | undefined {
  const free = STICKERS_CATALOG.filter((s) => !progress.unlockedStickers.includes(s.id));
  if (free.length === 0) return undefined;
  const ahead = free.filter((s) => s.requiredStars <= progress.stars + 30);
  const pool = ahead.length > 0 ? ahead : free;
  return pool.toSorted((a, b) => b.requiredStars - a.requiredStars || a.id.localeCompare(b.id))[0];
}

export interface CityRewardResult {
  progress: ChildProgress;
  sticker?: StickerItem;
}

/** Ritira il premio di una città superata (una volta sola): la città è segnata e arriva una figurina. */
export function claimCityReward(progress: ChildProgress, cityId: string): CityRewardResult {
  if (!KNOWN_CITY_IDS.has(cityId) || progress.claimedCities.includes(cityId)) return { progress };
  const sticker = pickRewardSticker(progress);
  return {
    progress: {
      ...progress,
      claimedCities: [...progress.claimedCities, cityId],
      unlockedStickers: sticker ? [...progress.unlockedStickers, sticker.id] : progress.unlockedStickers,
    },
    sticker,
  };
}

/**
 * Migrazione: chi giocava prima delle isole riparte con le città già aperte
 * (basta aver giocato nel gioco corrispondente).
 */
export function seedCityStars(progress: Omit<ChildProgress, 'cityStars' | 'claimedCities'>): Record<string, number> {
  const played: Record<string, boolean> = {
    'it-borgo': progress.tracedUppercase.length + progress.tracedLowercase.length > 0,
    'it-porto': progress.completedBubbleLevels > 0,
    'it-parole': progress.completedWordQuizRounds > 0,
    'it-torre': progress.readWords.length > 0,
    'it-sillabe': progress.syllables.length > 0,
    'en-words': progress.englishWords.length > 0,
    'en-abc': progress.englishLetters.length > 0,
    'en-read': progress.englishFamilyWords.length + progress.englishSightWords.length > 0,
    'en-write': progress.englishTraced.length + progress.englishSpelledWords.length > 0,
    'en-stories': progress.englishStories.length > 0,
  };
  const out: Record<string, number> = {};
  for (const [id, yes] of Object.entries(played)) if (yes) out[id] = 1;
  return out;
}
