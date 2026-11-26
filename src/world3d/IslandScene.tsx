import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Lock, Star } from 'lucide-react';
import type { ChildProgress } from '../types';
import type { IslandDef } from '../world';
import { cityStars, isCityCleared, isCityUnlocked } from '../state/world';
import { buildIsland, type BuiltIsland } from './islandBuilder';
import { createEngine, makeToonGradient, type Engine } from './engine';

interface IslandSceneProps {
  island: IslandDef;
  progress: ChildProgress;
  /** Città in cui si trova il personaggio (e su cui si centra la vista). */
  currentCityId: string;
  /** Chiamata quando si tocca una città: subito se è bloccata, ad arrivo avvenuto se è aperta. */
  onSelectCity: (cityId: string) => void;
}

function buildWalker(color: string): THREE.Group {
  const toon = makeToonGradient();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 4, 10), new THREE.MeshToonMaterial({ color, gradientMap: toon }));
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshToonMaterial({ color: '#ffd9b8', gradientMap: toon }));
  head.position.y = 1.2;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 10), new THREE.MeshToonMaterial({ color: '#ef4444', gradientMap: toon }));
  hat.position.y = 1.58;
  g.add(body, head, hat);
  return g;
}

/** Isola in 3D: terreno low-poly, città toccabili, sentieri e un personaggio che cammina da una città all'altra. */
export const IslandScene: React.FC<IslandSceneProps> = ({ island, progress, currentCityId, onSelectCity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const apiRef = useRef<{ walkTo(cityId: string): void; focus(cityId: string): void } | null>(null);
  const builtRef = useRef<BuiltIsland | null>(null);
  const progressRef = useRef(progress);
  const selectRef = useRef(onSelectCity);
  const currentRef = useRef(currentCityId);
  progressRef.current = progress;
  selectRef.current = onSelectCity;
  currentRef.current = currentCityId;

  const view = useMemo(() => {
    const unlocked = new Set<string>();
    const cleared = new Set<string>();
    for (const c of island.cities) {
      if (isCityUnlocked(progress, island, c.id)) unlocked.add(c.id);
      if (isCityCleared(progress, c)) cleared.add(c.id);
    }
    return { unlocked, cleared };
  }, [island, progress]);
  const viewRef = useRef(view);
  viewRef.current = view;

  const handleSelect = (cityId: string) => {
    if (viewRef.current.unlocked.has(cityId) && apiRef.current && cityId !== currentRef.current) apiRef.current.walkTo(cityId);
    else selectRef.current(cityId);
  };
  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let engine: Engine;
    try {
      engine = createEngine(container);
    } catch {
      return;
    }
    const built = buildIsland(island);
    builtRef.current = built;
    engine.scene.add(built.group);
    built.applyView(viewRef.current);

    const walker = buildWalker(island.palette.accent);
    const startPoint = built.cityPoint[currentRef.current] ?? Object.values(built.cityPoint)[0];
    walker.position.copy(startPoint).add(new THREE.Vector3(1.6, 0.1, 1.8));
    engine.scene.add(walker);

    // Inquadratura: tutta l'isola se è piccola, altrimenti la città corrente.
    const center = new THREE.Vector3((built.bounds.minX + built.bounds.maxX) / 2, 0, (built.bounds.minZ + built.bounds.maxZ) / 2);
    const extent = Math.max(built.bounds.maxX - built.bounds.minX, (built.bounds.maxZ - built.bounds.minZ) * 1.15);
    const aspect = Math.max(0.5, container.clientWidth / Math.max(1, container.clientHeight));
    const fitDist = (extent / 2) / (Math.tan(THREE.MathUtils.degToRad(engine.camera.fov / 2)) * Math.min(aspect, 1.6)) * 0.95;
    const dist = Math.min(Math.max(fitDist, 22), 36);
    const focus = fitDist <= 36 ? center : startPoint.clone();
    engine.controls.target.copy(focus);
    engine.camera.position.set(focus.x, focus.y + dist * 0.85, focus.z + dist * 0.62);
    engine.controls.update();

    const clampTarget = () => {
      const t = engine.controls.target;
      t.x = THREE.MathUtils.clamp(t.x, built.bounds.minX, built.bounds.maxX);
      t.z = THREE.MathUtils.clamp(t.z, built.bounds.minZ, built.bounds.maxZ);
      t.y = 0;
    };
    engine.controls.addEventListener('change', clampTarget);

    // Camera: segue la città scelta con un movimento dolce.
    const desired = new THREE.Vector3().copy(focus);
    let following = false;
    // Camminata lungo il sentiero.
    let walk: { pts: THREE.Vector3[]; seg: number; pos: number; target: string } | null = null;
    apiRef.current = {
      focus(cityId) {
        const p = built.cityPoint[cityId];
        if (!p || walk) return;
        walker.position.copy(p).add(new THREE.Vector3(1.6, 0.1, 1.8));
        desired.set(p.x, 0, p.z);
        following = true;
      },
      walkTo(cityId) {
        const from = currentRef.current;
        const pts = built.route(from, cityId);
        if (pts.length < 2) {
          selectRef.current(cityId);
          return;
        }
        walk = { pts, seg: 0, pos: 0, target: cityId };
        desired.set(built.cityPoint[cityId].x, 0, built.cityPoint[cityId].z);
        following = true;
      },
    };
    const dir = new THREE.Vector3();
    engine.onTick((dt, t) => {
      built.update(dt, t);
      if (following) {
        const delta = desired.clone().sub(engine.controls.target).multiplyScalar(Math.min(1, dt * 3));
        engine.controls.target.add(delta);
        engine.camera.position.add(delta);
        if (delta.lengthSq() < 1e-5) following = false;
      }
      if (walk) {
        const a = walk.pts[walk.seg];
        const b = walk.pts[walk.seg + 1];
        dir.copy(b).sub(a);
        const len = dir.length() || 1;
        walk.pos += dt * 7;
        const k = Math.min(1, walk.pos / len);
        walker.position.copy(a).lerp(b, k);
        walker.position.y += Math.abs(Math.sin(t * 14)) * 0.18;
        walker.rotation.y = Math.atan2(dir.x, dir.z);
        if (k >= 1) {
          walk.seg++;
          walk.pos = 0;
          if (walk.seg >= walk.pts.length - 1) {
            const target = walk.target;
            walk = null;
            selectRef.current(target);
          }
        }
      } else {
        walker.position.y += Math.sin(t * 3) * 0.002;
      }
      // Etichette HTML ancorate alle città.
      for (const city of island.cities) {
        const el = labelRefs.current[city.id];
        if (!el) continue;
        const p = engine.project(built.labelPoint[city.id]);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        el.style.visibility = p.visible ? 'visible' : 'hidden';
      }
    });

    // Tocco diretto sulle città (distinto dal trascinamento).
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number; t: number } | null = null;
    const el = engine.renderer.domElement;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 500;
      down = null;
      if (moved > 8 || !quick) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, engine.camera);
      const hit = ray.intersectObjects(built.pickables, false)[0];
      const id = hit?.object.userData.cityId as string | undefined;
      if (id) handleSelectRef.current(id);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      engine.controls.removeEventListener('change', clampTarget);
      apiRef.current = null;
      builtRef.current = null;
      built.dispose();
      engine.dispose();
    };
  }, [island]);

  useEffect(() => {
    builtRef.current?.applyView(view);
  }, [view]);

  // La città scelta da fuori (ad esempio dall'elenco) porta il personaggio e la vista fin lì.
  useEffect(() => {
    apiRef.current?.focus(currentCityId);
  }, [currentCityId]);

  return (
    <div className="relative w-full h-full overflow-clip" data-testid="island-scene">
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none overflow-clip">
        {island.cities.map((city) => {
          const unlocked = view.unlocked.has(city.id);
          const cleared = view.cleared.has(city.id);
          const stars = Math.min(cityStars(progress, city), city.clearStars);
          return (
            <button
              key={city.id}
              ref={(el) => {
                labelRefs.current[city.id] = el;
              }}
              onClick={() => handleSelect(city.id)}
              aria-hidden="true"
              tabIndex={-1}
              data-city={city.id}
              className={`absolute left-0 top-0 pointer-events-auto flex items-center gap-1.5 min-h-11 px-2.5 py-1 rounded-2xl border-2 shadow-md text-xs sm:text-sm font-black whitespace-nowrap cursor-pointer active:scale-95 transition-colors ${
                unlocked
                  ? cleared
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-white border-white text-slate-900'
                  : 'bg-slate-200/95 border-slate-300 text-slate-500'
              }`}
            >
              <span aria-hidden="true">{city.emoji}</span>
              <span className="max-w-[9rem] truncate">{city.name}</span>
              {unlocked ? (
                <span className="flex items-center gap-0.5 text-xs font-bold text-amber-700">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {stars}/{city.clearStars}
                </span>
              ) : (
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
