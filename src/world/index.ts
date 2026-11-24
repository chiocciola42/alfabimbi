import type { CityDef, GameDef, IslandDef } from './types';
import { ITALIAN_ISLAND } from './islands/italian';
import { MATH_ISLAND } from './islands/math';
import { ENGLISH_ISLAND } from './islands/english';

export * from './types';
export * from './layout';

/** L'arcipelago: per aggiungere un'isola basta aggiungerla qui. */
export const ISLANDS: IslandDef[] = [ITALIAN_ISLAND, MATH_ISLAND, ENGLISH_ISLAND];

export const ALL_CITIES: CityDef[] = ISLANDS.flatMap((i) => i.cities);
export const KNOWN_CITY_IDS = new Set(ALL_CITIES.map((c) => c.id));

export function findIsland(id: string): IslandDef | undefined {
  return ISLANDS.find((i) => i.id === id);
}

export function findIslandBySection(section: IslandDef['section']): IslandDef {
  return ISLANDS.find((i) => i.section === section) ?? ISLANDS[0];
}

export function findCity(id: string): { island: IslandDef; city: CityDef; index: number } | undefined {
  for (const island of ISLANDS) {
    const index = island.cities.findIndex((c) => c.id === id);
    if (index >= 0) return { island, city: island.cities[index], index };
  }
  return undefined;
}

export function findGame(city: CityDef, gameId: string): GameDef | undefined {
  return city.games.find((g) => g.id === gameId);
}
