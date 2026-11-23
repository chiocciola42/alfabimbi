import * as THREE from 'three';
import { disposeGroup, type PropFactory } from './types';

export type StrokePoints = Array<Array<{ x: number; y: number }>>;

export const LETTER_TUBE_RADIUS = 0.04;

/** Legge i tratti dall'attributo (JSON), scartando tutto ciò che non è un punto valido. */
export function parseStrokes(raw: string | null): StrokePoints {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((stroke) =>
        Array.isArray(stroke)
          ? stroke.filter((p): p is { x: number; y: number } => !!p && typeof p.x === 'number' && typeof p.y === 'number')
          : []
      )
      .filter((s) => s.length >= 2);
  } catch {
    return [];
  }
}

/** Quanto è "fatto" il tratto i-esimo su n, dato l'avanzamento totale 0-1 (i tratti si riempiono in ordine). */
export function strokeFill(i: number, n: number, progress: number): number {
  if (n <= 0) return 0;
  return Math.max(0, Math.min(1, progress * n - i));
}

/** La lettera da scrivere come tubi 3D lungo le guide: si colora man mano che il disegno avanza. */
export const createLetterProp: PropFactory = (el) => {
  const group = new THREE.Group();
  const letter = new THREE.Group();
  group.add(letter);
  let sig = '';
  const tubes: Array<{ mat: THREE.MeshStandardMaterial; cap: THREE.MeshStandardMaterial }> = [];
  const idle = new THREE.Color('#9db4d3');
  const done = new THREE.Color('#f59e0b');
  const tmp = new THREE.Color();

  const rebuild = (strokes: StrokePoints) => {
    for (const child of [...letter.children]) {
      letter.remove(child);
      disposeGroup(child);
    }
    tubes.length = 0;
    for (const stroke of strokes) {
      const pts = stroke.map((p) => new THREE.Vector3((p.x - 50) / 100, (p.y - 50) / 100, 0));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const mat = new THREE.MeshStandardMaterial({ color: idle, roughness: 0.4, metalness: 0.1 });
      const cap = new THREE.MeshStandardMaterial({ color: '#34d399', roughness: 0.4 });
      letter.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 10), LETTER_TUBE_RADIUS, 10, false), mat));
      const start = new THREE.Mesh(new THREE.SphereGeometry(LETTER_TUBE_RADIUS * 1.5, 12, 10), cap);
      start.position.copy(pts[0]);
      letter.add(start);
      const end = new THREE.Mesh(new THREE.SphereGeometry(LETTER_TUBE_RADIUS, 12, 10), mat);
      end.position.copy(pts[pts.length - 1]);
      letter.add(end);
      tubes.push({ mat, cap });
    }
  };

  return {
    group,
    update(_dt, time, node) {
      const raw = node.getAttribute('data-stage-strokes');
      if (raw !== sig) {
        sig = raw ?? '';
        rebuild(parseStrokes(raw));
      }
      const progress = Math.max(0, Math.min(1, parseFloat(node.getAttribute('data-stage-progress') ?? '0') || 0));
      tubes.forEach((t, i) => {
        const f = strokeFill(i, tubes.length, progress);
        tmp.copy(idle).lerp(done, f);
        t.mat.color.copy(tmp);
        t.mat.emissive.copy(done).multiplyScalar(f * 0.25);
      });
      letter.rotation.y = Math.sin(time * 0.9) * (progress >= 1 ? 0.9 : 0.45);
      letter.rotation.x = Math.sin(time * 0.6) * 0.12;
      const pop = progress >= 1 ? 1 + Math.sin(time * 6) * 0.04 : 1;
      letter.scale.setScalar(pop);
    },
    dispose() {
      disposeGroup(group);
    },
  };
};
