import * as THREE from 'three';
import { layoutIsland, islandEdges, parentCityId } from '../world';
import type { IslandDef, Point2 } from '../world';
import { buildCityModel, buildStar } from './cityModels';
import { makeToonGradient } from './engine';
import { CITY_RADIUS, PATH_RADIUS, buildTerrain } from './terrain';

export interface IslandView {
  unlocked: ReadonlySet<string>;
  cleared: ReadonlySet<string>;
}

export interface BuiltIsland {
  group: THREE.Group;
  /** Punto al suolo di ogni città (per etichette e camminata). */
  cityPoint: Record<string, THREE.Vector3>;
  /** Punto sopra il tetto, dove ancorare l'etichetta. */
  labelPoint: Record<string, THREE.Vector3>;
  /** Oggetti toccabili: `userData.cityId` indica la città. */
  pickables: THREE.Object3D[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Percorso al suolo da una città all'altra, lungo i sentieri. */
  route(fromId: string, toId: string): THREE.Vector3[];
  applyView(view: IslandView): void;
  update(dt: number, t: number): void;
  dispose(): void;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function segDist(p: Point2, a: Point2, b: Point2): number {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len2 = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len2));
  return Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
}

/**
 * Costruisce la scena 3D di un'isola a partire dai dati: terreno, sentieri, città, alberi, mare.
 * Nuove città in `IslandDef` compaiono qui senza altro codice.
 */
export function buildIsland(island: IslandDef, opts: { detail?: 'full' | 'mini' } = {}): BuiltIsland {
  const detail = opts.detail ?? 'full';
  const toon = makeToonGradient();
  const layout = layoutIsland(island);
  const edges = islandEdges(island);
  const cityList = island.cities.map((c) => ({ ...layout[c.id], id: c.id }));
  const edgeSegs = edges.map((e) => ({ ...e, a: layout[e.from], b: layout[e.to] }));

  const group = new THREE.Group();
  const terrain = buildTerrain({ cities: cityList, edges: edgeSegs, palette: island.palette, toon });
  group.add(terrain.mesh);

  // Mare: piano a facce piatte che ondeggia piano.
  const seaSize = 260;
  const seaGeo = new THREE.PlaneGeometry(seaSize, seaSize, 36, 36);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(
    seaGeo.toNonIndexed(),
    new THREE.MeshToonMaterial({ color: '#46bff0', gradientMap: toon })
  );
  seaGeo.dispose();
  sea.position.set((terrain.bounds.minX + terrain.bounds.maxX) / 2, -0.12, (terrain.bounds.minZ + terrain.bounds.maxZ) / 2);
  const seaPos = sea.geometry.attributes.position as THREE.BufferAttribute;
  const seaBase = Float32Array.from(seaPos.array as ArrayLike<number>);
  group.add(sea);

  // Sentieri a sassi.
  const stones: Array<{ p: THREE.Vector3; to: string; rot: number; s: number }> = [];
  const routePts: Record<string, THREE.Vector3[]> = {};
  for (const e of edgeSegs) {
    const len = Math.hypot(e.b.x - e.a.x, e.b.z - e.a.z);
    const n = Math.max(4, Math.round(len / 0.75));
    const nx = -(e.b.z - e.a.z) / len;
    const nz = (e.b.x - e.a.x) / len;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bend = Math.sin(t * Math.PI) * 1.1 * (hashString(e.to) % 2 === 0 ? 1 : -1);
      const x = e.a.x + (e.b.x - e.a.x) * t + nx * bend;
      const z = e.a.z + (e.b.z - e.a.z) * t + nz * bend;
      pts.push(new THREE.Vector3(x, Math.max(0.12, terrain.heightAt(x, z)) + 0.05, z));
    }
    routePts[`${e.from}>${e.to}`] = pts;
    pts.forEach((p, i) => {
      if (i > 1 && i < pts.length - 1) stones.push({ p, to: e.to, rot: (i * 1.7) % 3, s: 0.8 + ((i * 37) % 5) / 12 });
    });
  }
  const stoneMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.34, 0.4, 0.14, 6),
    new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toon }),
    Math.max(1, stones.length)
  );
  const dummy = new THREE.Object3D();
  stones.forEach((st, i) => {
    dummy.position.copy(st.p);
    dummy.rotation.set(0, st.rot, 0);
    dummy.scale.set(st.s, 1, st.s);
    dummy.updateMatrix();
    stoneMesh.setMatrixAt(i, dummy.matrix);
  });
  stoneMesh.count = stones.length;
  group.add(stoneMesh);

  // Alberi e rocce sparsi, lontani da città e sentieri.
  const rng = mulberry32(hashString(island.id));
  const treeSpots: Array<{ x: number; z: number; s: number }> = [];
  const attempts = detail === 'full' ? 260 : 90;
  const w = terrain.bounds.maxX - terrain.bounds.minX;
  const d = terrain.bounds.maxZ - terrain.bounds.minZ;
  for (let i = 0; i < attempts && treeSpots.length < (detail === 'full' ? 120 : 40); i++) {
    const x = terrain.bounds.minX + rng() * w;
    const z = terrain.bounds.minZ + rng() * d;
    const y = terrain.heightAt(x, z);
    if (y < 0.4) continue;
    if (cityList.some((c) => Math.hypot(c.x - x, c.z - z) < CITY_RADIUS * 0.62)) continue;
    if (edgeSegs.some((e) => segDist({ x, z }, e.a, e.b) < PATH_RADIUS * 0.75)) continue;
    treeSpots.push({ x, z, s: 0.7 + rng() * 0.7 });
  }
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6),
    new THREE.MeshToonMaterial({ color: '#a9744a', gradientMap: toon }),
    Math.max(1, treeSpots.length)
  );
  const crowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.62, 1.5, 7),
    new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toon }),
    Math.max(1, treeSpots.length)
  );
  const crownColor = new THREE.Color();
  treeSpots.forEach((t, i) => {
    const y = terrain.heightAt(t.x, t.z);
    dummy.rotation.set(0, rng() * 6, 0);
    dummy.scale.setScalar(t.s);
    dummy.position.set(t.x, y + 0.3 * t.s, t.z);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, y + 1.25 * t.s, t.z);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crownColor.set(island.palette.grassDark).offsetHSL(0, 0.05, -0.12 + rng() * 0.1);
    crowns.setColorAt(i, crownColor);
  });
  trunks.count = crowns.count = treeSpots.length;
  group.add(trunks, crowns);

  // Nuvole che scivolano lente.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toon, transparent: true, opacity: 0.9 });
  const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
  const cloudCount = detail === 'full' ? 7 : 3;
  for (let i = 0; i < cloudCount; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.scale.set(1.6 - k * 0.2, 0.8, 1.1);
      puff.position.set((k - 1) * 1.5, k === 1 ? 0.4 : 0, 0);
      c.add(puff);
    }
    c.position.set(terrain.bounds.minX - 10 + rng() * (w + 20), 11 + rng() * 4, terrain.bounds.minZ - 8 + rng() * (d + 16));
    c.userData.speed = 0.4 + rng() * 0.5;
    clouds.add(c);
  }
  group.add(clouds);

  // Città.
  const cityPoint: Record<string, THREE.Vector3> = {};
  const labelPoint: Record<string, THREE.Vector3> = {};
  const cityGroups: Record<string, THREE.Group> = {};
  const pickables: THREE.Object3D[] = [];
  island.cities.forEach((city) => {
    const p = layout[city.id];
    const y = Math.max(0.2, terrain.heightAt(p.x, p.z));
    cityPoint[city.id] = new THREE.Vector3(p.x, y, p.z);
    labelPoint[city.id] = new THREE.Vector3(p.x, y + 4.4, p.z);
    const holder = new THREE.Group();
    holder.position.set(p.x, y, p.z);
    holder.userData.cityId = city.id;
    // Piazzola rotonda sotto gli edifici.
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.4, 0.22, 20),
      new THREE.MeshToonMaterial({ color: '#f0e4c8', gradientMap: toon })
    );
    plaza.position.y = 0.02;
    holder.add(plaza);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 2.4;
    hit.userData.cityId = city.id;
    holder.add(hit);
    pickables.push(hit);
    group.add(holder);
    cityGroups[city.id] = holder;
  });

  const stars: Record<string, THREE.Mesh> = {};
  const models: Record<string, THREE.Object3D | undefined> = {};
  const lockedState: Record<string, boolean | undefined> = {};
  const unlockedAt: Record<string, number> = {};

  const lit = new THREE.Color('#fff6dc');
  const dim = new THREE.Color('#aab0bc');

  function applyView(view: IslandView) {
    island.cities.forEach((city) => {
      const locked = !view.unlocked.has(city.id);
      if (lockedState[city.id] !== locked) {
        const holder = cityGroups[city.id];
        const old = models[city.id];
        if (old) {
          holder.remove(old);
          old.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            (m.material as THREE.Material | undefined)?.dispose?.();
          });
        }
        const model = buildCityModel(city.theme, { color: city.color, locked, toon });
        holder.add(model);
        models[city.id] = model;
        lockedState[city.id] = locked;
        if (!locked) unlockedAt[city.id] = performance.now();
      }
      const holder = cityGroups[city.id];
      const hasStar = view.cleared.has(city.id);
      if (hasStar && !stars[city.id]) {
        const star = buildStar();
        star.position.set(0, 4.2, 0);
        holder.add(star);
        stars[city.id] = star;
      } else if (!hasStar && stars[city.id]) {
        holder.remove(stars[city.id]);
        delete stars[city.id];
      }
    });
    stones.forEach((st, i) => stoneMesh.setColorAt(i, view.unlocked.has(st.to) ? lit : dim));
    if (stoneMesh.instanceColor) stoneMesh.instanceColor.needsUpdate = true;
  }

  const parentOf: Record<string, string | null> = {};
  island.cities.forEach((c, i) => (parentOf[c.id] = parentCityId(island, i)));
  const chain = (id: string): string[] => {
    const out: string[] = [];
    let cur: string | null = id;
    while (cur) {
      out.push(cur);
      cur = parentOf[cur] ?? null;
    }
    return out;
  };

  function route(fromId: string, toId: string): THREE.Vector3[] {
    const up = chain(fromId);
    const down = chain(toId);
    const common = up.find((id) => down.includes(id));
    if (!common) return [cityPoint[fromId].clone(), cityPoint[toId].clone()];
    const pts: THREE.Vector3[] = [];
    const push = (list: THREE.Vector3[]) => list.forEach((p) => pts.push(p.clone()));
    for (const id of up) {
      if (id === common) break;
      const parent = parentOf[id];
      if (parent) push((routePts[`${parent}>${id}`] ?? []).toReversed());
    }
    const downPath = down.slice(0, down.indexOf(common)).reverse();
    let prev = common;
    for (const id of downPath) {
      push(routePts[`${prev}>${id}`] ?? []);
      prev = id;
    }
    if (pts.length === 0) pts.push(cityPoint[toId].clone());
    return pts;
  }

  function update(dt: number, t: number) {
    for (let i = 0; i < seaPos.count; i++) {
      const x = seaBase[i * 3];
      const z = seaBase[i * 3 + 2];
      seaPos.setY(i, Math.sin(x * 0.45 + t * 0.9) * 0.07 + Math.cos(z * 0.38 + t * 0.7) * 0.07);
    }
    seaPos.needsUpdate = true;
    for (const c of clouds.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > terrain.bounds.maxX + 14) c.position.x = terrain.bounds.minX - 14;
    }
    for (const id of Object.keys(stars)) {
      stars[id].rotation.y = t * 1.6;
      stars[id].position.y = 4.2 + Math.sin(t * 2 + id.length) * 0.15;
    }
    const now = performance.now();
    for (const id of Object.keys(unlockedAt)) {
      const k = Math.min(1, (now - unlockedAt[id]) / 600);
      const model = models[id];
      if (model) model.scale.setScalar(k < 1 ? 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.12 : 1);
      if (k >= 1) delete unlockedAt[id];
    }
  }

  function dispose() {
    toon.dispose();
  }

  return { group, cityPoint, labelPoint, pickables, bounds: terrain.bounds, route, applyView, update, dispose };
}
