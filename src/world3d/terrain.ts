import * as THREE from 'three';
import type { IslandPalette } from '../world';
import type { Point2 } from '../world';

export const CITY_RADIUS = 5.2;
export const PATH_RADIUS = 2.6;
const LAND_LEVEL = 0.16;
const MAX_HEIGHT = 0.9;

export interface TerrainInput {
  cities: Point2[];
  edges: Array<{ a: Point2; b: Point2 }>;
  palette: IslandPalette;
  toon: THREE.Texture;
}

export interface Terrain {
  mesh: THREE.Mesh;
  heightAt(x: number, z: number): number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

function noise(x: number, z: number): number {
  return (Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.9 + 0.4) + Math.sin(x * 0.35 - z * 0.5) * 0.7) / 1.7;
}

function distToSegment(p: Point2, a: Point2, b: Point2): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len2 = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2));
  return Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
}

/** Terreno low-poly: le città e i sentieri "spingono fuori" la terra dal mare, quindi più città = isola più grande. */
export function buildTerrain({ cities, edges, palette, toon }: TerrainInput): Terrain {
  const coverage = (x: number, z: number): number => {
    const p = { x, z };
    let c = 0;
    for (const city of cities) c = Math.max(c, 1 - Math.hypot(x - city.x, z - city.z) / (CITY_RADIUS * 1.35));
    for (const e of edges) c = Math.max(c, 1 - distToSegment(p, e.a, e.b) / (PATH_RADIUS * 1.5));
    return c + noise(x, z) * 0.16;
  };
  const heightAt = (x: number, z: number): number => {
    const c = coverage(x, z);
    return Math.min(MAX_HEIGHT, Math.max(-0.8, (c - LAND_LEVEL) * 1.7));
  };

  const xs = cities.map((c) => c.x);
  const zs = cities.map((c) => c.z);
  const margin = CITY_RADIUS * 1.5 + 2;
  const bounds = {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minZ: Math.min(...zs) - margin,
    maxZ: Math.max(...zs) + margin,
  };
  const step = Math.max(0.8, Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 90);
  const nx = Math.ceil((bounds.maxX - bounds.minX) / step);
  const nz = Math.ceil((bounds.maxZ - bounds.minZ) / step);

  const geometry = new THREE.PlaneGeometry(nx * step, nz * step, nx, nz);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(bounds.minX + (nx * step) / 2, 0, bounds.minZ + (nz * step) / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));

  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  const fp = flat.attributes.position;
  const colors = new Float32Array(fp.count * 3);
  const sand = new THREE.Color(palette.sand);
  const wet = new THREE.Color(palette.sand).lerp(new THREE.Color('#5cc8e0'), 0.65);
  const grass = new THREE.Color(palette.grass);
  const grassDark = new THREE.Color(palette.grassDark);
  const tmp = new THREE.Color();
  for (let f = 0; f < fp.count; f += 3) {
    const cx = (fp.getX(f) + fp.getX(f + 1) + fp.getX(f + 2)) / 3;
    const cz = (fp.getZ(f) + fp.getZ(f + 1) + fp.getZ(f + 2)) / 3;
    const cy = (fp.getY(f) + fp.getY(f + 1) + fp.getY(f + 2)) / 3;
    if (cy < -0.05) tmp.copy(wet);
    else if (cy < 0.14) tmp.copy(sand);
    else tmp.copy(grass).lerp(grassDark, Math.min(1, Math.max(0, 0.5 + noise(cx * 1.7, cz * 1.7) * 0.6)));
    for (let k = 0; k < 3; k++) {
      colors[(f + k) * 3] = tmp.r;
      colors[(f + k) * 3 + 1] = tmp.g;
      colors[(f + k) * 3 + 2] = tmp.b;
    }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.dispose();

  const mesh = new THREE.Mesh(flat, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toon }));
  return { mesh, heightAt, bounds };
}
