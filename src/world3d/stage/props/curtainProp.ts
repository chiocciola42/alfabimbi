import * as THREE from 'three';
import { disposeGroup, type PropFactory } from './types';

/** Sipario rosso con note musicali che saltellano: si anima di più quando `data-stage-active="true"` (si sta ascoltando). */
export const createCurtainProp: PropFactory = () => {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#fb4a6e', roughness: 0.7, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.4, metalness: 0.1 });
  const curtains: Array<{ mesh: THREE.Mesh; base: Float32Array; side: number }> = [];
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.3, 0.95, 20, 1);
    const mesh = new THREE.Mesh(geo, red);
    mesh.position.set(side * 0.43, 0, 0);
    group.add(mesh);
    curtains.push({ mesh, base: Float32Array.from(geo.attributes.position.array as ArrayLike<number>), side });
  }
  const valance = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.08), gold);
  valance.position.y = -0.5; // in alto (l'asse y della scena va verso il basso)
  group.add(valance);

  const upright = new THREE.Group(); // le note sono modellate "in piedi" (y verso l'alto)
  upright.rotation.x = Math.PI;
  group.add(upright);
  const notes: THREE.Group[] = [];
  const noteMat = new THREE.MeshStandardMaterial({ color: '#6366f1', roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const note = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), noteMat);
    head.scale.set(1.2, 0.85, 0.8);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), noteMat);
    stem.position.set(0.06, 0.11, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.02), noteMat);
    flag.position.set(0.1, 0.2, 0);
    flag.rotation.z = -0.5;
    note.add(head, stem, flag);
    note.scale.setScalar(1.5);
    note.position.x = (i - 1) * 0.22;
    upright.add(note);
    notes.push(note);
  }

  return {
    group,
    update(_dt, time, el) {
      const active = el.getAttribute('data-stage-active') === 'true';
      const amp = active ? 0.035 : 0.012;
      for (const c of curtains) {
        const pos = c.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = c.base[i * 3];
          const y = c.base[i * 3 + 1];
          pos.setZ(i, Math.sin(x * 38 + time * (active ? 3 : 1.2)) * amp * (0.6 + (0.5 - y) * 0.8));
        }
        pos.needsUpdate = true;
      }
      notes.forEach((n, i) => {
        const t = time * (active ? 3.2 : 1.4) + i * 1.7;
        n.position.y = -0.1 + Math.abs(Math.sin(t)) * (active ? 0.28 : 0.1);
        n.rotation.z = Math.sin(t) * 0.25;
      });
    },
    dispose() {
      disposeGroup(group);
    },
  };
};
