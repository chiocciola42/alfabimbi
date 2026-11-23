import * as THREE from 'three';
import { disposeGroup, type PropFactory } from './types';

function starGeometry(outer: number, inner: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Coppa dorata che gira con tante stelle intorno quante ne ha guadagnate (attributo `data-stage-stars`, 0-3). */
export const createTrophyProp: PropFactory = () => {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.3, metalness: 0.35, emissive: '#b45309', emissiveIntensity: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.6 });
  const cup = new THREE.Group();
  group.add(cup);

  const profile = [
    new THREE.Vector2(0.0, -0.1), new THREE.Vector2(0.14, -0.1), new THREE.Vector2(0.1, 0.02),
    new THREE.Vector2(0.28, 0.12), new THREE.Vector2(0.34, 0.4), new THREE.Vector2(0.3, 0.45), new THREE.Vector2(0.0, 0.2),
  ];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), gold);
  bowl.position.y = 0.05;
  cup.add(bowl);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 12), gold);
  stem.position.y = -0.18;
  cup.add(stem);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.3), dark);
  base.position.y = -0.36;
  cup.add(base);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16, Math.PI), gold);
    handle.position.set(side * 0.34, 0.3, 0);
    handle.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    cup.add(handle);
  }
  const crown = new THREE.Mesh(starGeometry(0.15, 0.065, 0.05), gold);
  crown.position.set(0, 0.62, 0);
  cup.add(crown);

  const orbit = new THREE.Group();
  group.add(orbit);
  const orbitStars: THREE.Mesh[] = [];
  const starGeo = starGeometry(0.1, 0.045, 0.04);
  const starMat = new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', emissiveIntensity: 0.5, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    orbit.add(s);
    orbitStars.push(s);
  }

  return {
    group,
    update(_dt, time, el) {
      const stars = Math.max(0, Math.min(3, Math.round(parseFloat(el.getAttribute('data-stage-stars') ?? '3') || 0)));
      cup.rotation.y = time * 1.1;
      cup.position.y = Math.sin(time * 2) * 0.03;
      orbitStars.forEach((s, i) => {
        s.visible = i < stars;
        const a = time * 1.4 + (i / Math.max(1, stars)) * Math.PI * 2;
        s.position.set(Math.cos(a) * 0.62, 0.15 + Math.sin(time * 2 + i) * 0.08, Math.sin(a) * 0.3);
        s.rotation.y = time * 2;
      });
    },
    dispose() {
      starGeo.dispose();
      disposeGroup(group);
    },
  };
};
