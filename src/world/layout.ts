import type { IslandDef } from './types';

export interface Point2 {
  x: number;
  z: number;
}

export const CITY_SPACING = 9;

/** Il genitore di una città: da dove parte il sentiero che la raggiunge (null per la prima città). */
export function parentCityId(island: IslandDef, index: number): string | null {
  const city = island.cities[index];
  if (city.branchFrom) return city.branchFrom;
  for (let i = index - 1; i >= 0; i--) {
    if (!island.cities[i].branchFrom) return island.cities[i].id;
  }
  return null;
}

/**
 * Dispone le città lungo un sentiero a serpentina (righe alternate sinistra-destra);
 * le diramazioni escono dal genitore verso il retro dell'isola. Una `pos` esplicita ha la precedenza.
 * Aggiungere città allunga la serpentina: l'isola cresce da sola.
 */
export function layoutIsland(island: IslandDef): Record<string, Point2> {
  const out: Record<string, Point2> = {};
  const main = island.cities.filter((c) => !c.branchFrom);
  const cols = main.length <= 5 ? Math.max(main.length, 1) : 4;
  main.forEach((city, k) => {
    if (city.pos) {
      out[city.id] = city.pos;
      return;
    }
    const row = Math.floor(k / cols);
    const colRaw = k % cols;
    const col = row % 2 === 0 ? colRaw : cols - 1 - colRaw;
    out[city.id] = {
      x: (col - (cols - 1) / 2) * CITY_SPACING + Math.sin(k * 2.3) * 1.2,
      z: row * CITY_SPACING * 0.9 + Math.cos(k * 1.7) * 1.4,
    };
  });
  const branchCount: Record<string, number> = {};
  island.cities.forEach((city) => {
    if (!city.branchFrom) return;
    if (city.pos) {
      out[city.id] = city.pos;
      return;
    }
    const parent = out[city.branchFrom] ?? { x: 0, z: 0 };
    const n = (branchCount[city.branchFrom] = (branchCount[city.branchFrom] ?? 0) + 1);
    const side = n % 2 === 1 ? -1 : 1;
    out[city.id] = { x: parent.x + side * CITY_SPACING * 0.4 * n, z: parent.z - CITY_SPACING * 0.85 };
  });
  return out;
}

export interface IslandEdge {
  from: string;
  to: string;
}

/** I sentieri: ogni città (tranne la prima) è collegata al suo genitore. */
export function islandEdges(island: IslandDef): IslandEdge[] {
  const edges: IslandEdge[] = [];
  island.cities.forEach((city, i) => {
    const parent = parentCityId(island, i);
    if (parent) edges.push({ from: parent, to: city.id });
  });
  return edges;
}
