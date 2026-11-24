import * as THREE from 'three';
import { disposeGroup, type PropFactory } from './types';

/** Contorno (coordinate -0.5..0.5, y verso il basso) delle figure del gioco; `null` per il cerchio. */
export function shapeOutline(name: string): Array<[number, number]> | null {
  const poly = (sides: number, r = 0.42, cy = 0.02): Array<[number, number]> =>
    Array.from({ length: sides }, (_, i) => {
      const a = (-90 + (360 / sides) * i) * (Math.PI / 180);
      return [r * Math.cos(a), cy + r * Math.sin(a)];
    });
  switch (name) {
    case 'quadrato':
      return [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]];
    case 'rettangolo':
      return [[-0.46, -0.25], [0.46, -0.25], [0.46, 0.25], [-0.46, 0.25]];
    case 'triangolo':
      return [[0, -0.4], [0.42, 0.36], [-0.42, 0.36]];
    case 'pentagono':
      return poly(5);
    case 'esagono':
      return poly(6, 0.42, 0);
    default:
      return null;
  }
}

/** Figura geometrica estrusa con bordi arrotondati che ruota piano (`data-stage-shape`, `data-stage-color`). */
export const createShapeProp: PropFactory = (el) => {
  const group = new THREE.Group();
  const name = el.getAttribute('data-stage-shape') ?? 'cerchio';
  const outline = shapeOutline(name);
  const shape = new THREE.Shape();
  if (!outline) shape.absarc(0, 0, 0.4, 0, Math.PI * 2, false);
  else outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  if (outline) shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 32 });
  geo.translate(0, 0, -0.06);
  const mat = new THREE.MeshStandardMaterial({ color: el.getAttribute('data-stage-color') ?? '#f43f5e', roughness: 0.4, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  return {
    group,
    update(_dt, time) {
      mesh.rotation.y = Math.sin(time * 0.9) * 0.55;
      mesh.rotation.x = Math.sin(time * 0.7) * 0.18;
    },
    dispose() {
      disposeGroup(group);
    },
  };
};
