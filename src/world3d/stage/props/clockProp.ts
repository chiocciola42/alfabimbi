import * as THREE from 'three';
import { disposeGroup, type PropFactory } from './types';

/** Angoli (gradi, in senso orario da ore 12) delle lancette per un orario a ore o mezz'ore. */
export function clockAngles(hour: number, minute: number): { hour: number; minute: number } {
  return { hour: (((hour % 12) + 12) % 12) * 30 + minute * 0.5, minute: minute * 6 };
}

function faceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#334155';
    x.font = '800 30px system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let n = 1; n <= 12; n++) {
      const a = (n * 30 - 90) * (Math.PI / 180);
      x.fillText(String(n), 128 + 94 * Math.cos(a), 128 + 94 * Math.sin(a));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // la scena ha l'asse y verso il basso, come la pagina
  return t;
}

/** Orologio 3D: quadrante con i numeri, bordo dorato e lancette che si muovono sull'orario (`data-stage-hour`, `data-stage-minute`). */
export const createClockProp: PropFactory = () => {
  const group = new THREE.Group();
  const clock = new THREE.Group();
  group.add(clock);
  const tex = faceTexture();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  face.position.z = 0.03;
  clock.add(face);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.06, 48), new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.35, metalness: 0.2 }));
  body.rotation.x = Math.PI / 2;
  clock.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.03, 12, 48), new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.3, metalness: 0.3 }));
  rim.position.z = 0.03;
  clock.add(rim);

  const makeHand = (len: number, w: number, color: string, z: number) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.03), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    m.position.y = -len / 2 + 0.04; // punta verso l'alto (y negativo = su, perché l'asse y è rovesciato)
    pivot.add(m);
    pivot.position.z = z;
    clock.add(pivot);
    return pivot;
  };
  const hourHand = makeHand(0.27, 0.05, '#0f172a', 0.07);
  const minuteHand = makeHand(0.38, 0.03, '#e11d48', 0.095);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
  cap.position.z = 0.1;
  clock.add(cap);

  let hAngle = 0;
  let mAngle = 0;
  return {
    group,
    update(dt, time, el) {
      const target = clockAngles(parseFloat(el.getAttribute('data-stage-hour') ?? '12') || 0, parseFloat(el.getAttribute('data-stage-minute') ?? '0') || 0);
      const k = 1 - Math.exp(-6 * dt);
      hAngle += (target.hour - hAngle) * k;
      mAngle += (target.minute - mAngle) * k;
      hourHand.rotation.z = (hAngle * Math.PI) / 180;
      minuteHand.rotation.z = (mAngle * Math.PI) / 180;
      clock.rotation.y = Math.sin(time * 0.8) * 0.35;
      clock.rotation.x = Math.sin(time * 0.6) * 0.12;
    },
    dispose() {
      tex.dispose();
      disposeGroup(group);
    },
  };
};
