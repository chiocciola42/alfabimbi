import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ChildProgress } from '../types';
import { ISLANDS } from '../world';
import { isCityCleared, isCityUnlocked, islandStats } from '../state/world';
import { buildIsland, type BuiltIsland } from './islandBuilder';
import { createEngine } from './engine';

interface ArchipelagoSceneProps {
  progress: ChildProgress;
  onChooseIsland: (islandId: string) => void;
}

const ISLAND_SCALE = 0.33;
const SPACING = 19;

/** L'arcipelago: le isole delle materie, una accanto all'altra, da toccare per sbarcare. */
export const ArchipelagoScene: React.FC<ArchipelagoSceneProps> = ({ progress, onChooseIsland }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const builtRef = useRef<Array<{ id: string; built: BuiltIsland }>>([]);
  const chooseRef = useRef(onChooseIsland);
  chooseRef.current = onChooseIsland;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const views = useMemo(
    () =>
      ISLANDS.map((island) => ({
        id: island.id,
        unlocked: new Set(island.cities.filter((c) => isCityUnlocked(progress, island, c.id)).map((c) => c.id)),
        cleared: new Set(island.cities.filter((c) => isCityCleared(progress, c)).map((c) => c.id)),
      })),
    [progress]
  );
  const viewsRef = useRef(views);
  viewsRef.current = views;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let engine;
    try {
      engine = createEngine(container);
    } catch {
      return;
    }
    const portrait = container.clientWidth < container.clientHeight * 1.05;
    const scale = portrait ? 0.3 : ISLAND_SCALE;
    const entries: Array<{ id: string; built: BuiltIsland; holder: THREE.Group; anchor: THREE.Vector3 }> = [];
    ISLANDS.forEach((island, i) => {
      const built = buildIsland(island, { detail: 'mini' });
      const holder = new THREE.Group();
      holder.add(built.group);
      const cx = (built.bounds.minX + built.bounds.maxX) / 2;
      const cz = (built.bounds.minZ + built.bounds.maxZ) / 2;
      built.group.position.set(-cx, 0, -cz);
      holder.scale.setScalar(scale);
      if (portrait) holder.position.set(i === 1 ? 2.5 : -1.5, 0, (i - (ISLANDS.length - 1) / 2) * 12.5);
      else holder.position.set((i - (ISLANDS.length - 1) / 2) * SPACING, 0, i === 1 ? -4 : 3);
      // Disco per il tocco, grande quanto l'isola.
      const w = (built.bounds.maxX - built.bounds.minX) * 0.8;
      const d = (built.bounds.maxZ - built.bounds.minZ) * 0.8;
      const hit = new THREE.Mesh(new THREE.BoxGeometry(w, 6, d), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(0, 2, 0);
      hit.userData.islandId = island.id;
      holder.add(hit);
      engine.scene.add(holder);
      entries.push({ id: island.id, built, holder, anchor: new THREE.Vector3() });
      built.applyView(viewsRef.current[i]);
    });
    builtRef.current = entries;

    if (portrait) engine.camera.position.set(0, 46, 24);
    else engine.camera.position.set(0, 28, 34);
    engine.controls.target.set(0, 0, 0);
    engine.controls.enablePan = false;
    engine.controls.enableZoom = false;
    engine.controls.minAzimuthAngle = -0.35;
    engine.controls.maxAzimuthAngle = 0.35;
    engine.controls.update();

    engine.onTick((dt, t) => {
      entries.forEach((e, i) => {
        e.built.update(dt, t);
        e.holder.position.y = Math.sin(t * 0.8 + i * 1.7) * 0.12;
        e.anchor.set(e.holder.position.x, 5.4, e.holder.position.z + (portrait ? 0 : 2));
        const el = labelRefs.current[e.id];
        if (!el) return;
        const p = engine.project(e.anchor);
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        el.style.visibility = p.visible ? 'visible' : 'hidden';
      });
    });

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
      const hits = entries.flatMap((en) => en.holder.children.filter((c) => c.userData.islandId));
      const hit = ray.intersectObjects(hits, false)[0];
      const id = hit?.object.userData.islandId as string | undefined;
      if (id) chooseRef.current(id);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      entries.forEach((e) => e.built.dispose());
      builtRef.current = [];
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    builtRef.current.forEach((e, i) => e.built.applyView(views[i]));
  }, [views]);

  return (
    <div className="relative w-full h-full overflow-clip" data-testid="archipelago-scene">
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none overflow-clip">
        {ISLANDS.map((island) => {
          const stats = islandStats(progress, island);
          return (
            <button
              key={island.id}
              ref={(el) => {
                labelRefs.current[island.id] = el;
              }}
              onClick={() => onChooseIsland(island.id)}
              aria-label={`${island.name}: ${stats.cleared} città su ${stats.total} superate`}
              data-island={island.id}
              className="absolute left-0 top-0 pointer-events-auto flex flex-col items-center min-h-14 px-4 py-2 rounded-3xl bg-white border-2 border-white shadow-lg text-slate-900 cursor-pointer active:scale-95"
            >
              <span className="text-sm sm:text-lg font-black leading-tight whitespace-nowrap">
                <span aria-hidden="true">{island.emoji} </span>
                {island.name}
              </span>
              <span className="text-xs font-bold text-amber-700">
                {stats.cleared}/{stats.total} città · {stats.stars} ★
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
