import * as THREE from 'three';
import type { CityTheme } from '../world';

const LOCKED_WALL = '#c9ccd4';
const LOCKED_ROOF = '#9aa0ad';

export interface CityLook {
  color: string;
  locked: boolean;
  toon: THREE.Texture;
}

type Mats = { wall: THREE.Material; roof: THREE.Material; accent: THREE.Material; wood: THREE.Material; green: THREE.Material; white: THREE.Material };

function makeMats({ color, locked, toon }: CityLook): Mats {
  const toonMat = (c: string) => new THREE.MeshToonMaterial({ color: c, gradientMap: toon });
  return {
    wall: toonMat(locked ? LOCKED_WALL : '#fff3dc'),
    roof: toonMat(locked ? LOCKED_ROOF : color),
    accent: toonMat(locked ? '#aeb2bd' : new THREE.Color(color).offsetHSL(0.08, 0, 0.12).getStyle()),
    wood: toonMat(locked ? '#a8a49c' : '#a9744a'),
    green: toonMat(locked ? '#a9b3ad' : '#3f9d52'),
    white: toonMat('#ffffff'),
  };
}

function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

function box(w: number, h: number, d: number, m: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 10): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
}
function cone(r: number, h: number, m: THREE.Material, seg = 4): THREE.Mesh {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
}
function ball(r: number, m: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
}

function house(m: Mats, w = 1.3, h = 1, d = 1.3): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(w, h, d, m.wall), 0, h / 2, 0));
  const roof = cone(Math.max(w, d) * 0.78, h * 0.8, m.roof, 4);
  roof.rotation.y = Math.PI / 4;
  g.add(at(roof, 0, h + h * 0.4, 0));
  g.add(at(box(0.3, 0.5, 0.05, m.wood), 0, 0.25, d / 2 + 0.01));
  return g;
}

function pine(m: Mats, s = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(at(cyl(0.12 * s, 0.16 * s, 0.5 * s, m.wood, 6), 0, 0.25 * s, 0));
  g.add(at(cone(0.6 * s, 1.1 * s, m.green, 7), 0, 0.95 * s, 0));
  g.add(at(cone(0.45 * s, 0.9 * s, m.green, 7), 0, 1.5 * s, 0));
  return g;
}

const BUILDERS: Record<CityTheme, (m: Mats) => THREE.Group> = {
  village: (m) => {
    const g = new THREE.Group();
    g.add(at(house(m), -1.4, 0, 0.3));
    g.add(at(house(m, 1.1, 0.9, 1.1), 1.3, 0, -0.7));
    g.add(at(house(m, 1.5, 1.2, 1.2), 0.2, 0, 1.6));
    return g;
  },
  harbor: (m) => {
    const g = new THREE.Group();
    g.add(at(house(m), -1.2, 0, -0.6));
    g.add(at(house(m, 1.1, 0.9, 1.1), 0.4, 0, -1.2));
    g.add(at(box(3.2, 0.12, 1.1, m.wood), 0.2, 0.08, 1.6));
    g.add(at(cyl(0.06, 0.06, 2.2, m.wood, 6), 0.9, 1.2, 1.6));
    const sail = box(0.04, 1.3, 1.0, m.white);
    g.add(at(sail, 0.9, 1.5, 2.05));
    g.add(at(box(1.1, 0.35, 0.5, m.roof), 0.9, 0.3, 1.6));
    return g;
  },
  castle: (m) => {
    const g = new THREE.Group();
    g.add(at(box(2.4, 1.6, 2.4, m.wall), 0, 0.8, 0));
    g.add(at(box(0.7, 1, 0.1, m.wood), 0, 0.5, 1.22));
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]] as const) {
      g.add(at(cyl(0.5, 0.55, 2.2, m.wall, 10), x, 1.1, z));
      g.add(at(cone(0.65, 0.9, m.roof, 10), x, 2.65, z));
    }
    g.add(at(cone(0.9, 1.3, m.accent, 4), 0, 2.25, 0));
    return g;
  },
  tower: (m) => {
    const g = new THREE.Group();
    g.add(at(cyl(0.8, 1.05, 4, m.wall, 12), 0, 2, 0));
    g.add(at(cyl(1.05, 1.05, 0.25, m.accent, 12), 0, 3.9, 0));
    g.add(at(cone(1.2, 1.7, m.roof, 12), 0, 4.95, 0));
    g.add(at(box(0.3, 0.55, 0.05, m.wood), 0, 0.3, 1.0));
    g.add(at(house(m, 1.0, 0.8, 1.0), -2, 0, 0.8));
    g.add(at(pine(m, 0.8), 1.9, 0, 0.9));
    return g;
  },
  market: (m) => {
    const g = new THREE.Group();
    const stall = (x: number, z: number, roof: THREE.Material) => {
      const s = new THREE.Group();
      s.add(at(box(1.3, 0.55, 0.8, m.wood), 0, 0.28, 0));
      const awning = box(1.6, 0.1, 1.1, roof);
      awning.rotation.x = 0.25;
      s.add(at(awning, 0, 1.2, 0));
      for (const px of [-0.7, 0.7]) s.add(at(cyl(0.05, 0.05, 1.2, m.wood, 6), px, 0.6, 0.45));
      return at(s, x, 0, z);
    };
    g.add(stall(-1.3, -0.4, m.roof));
    g.add(stall(1.3, -0.4, m.accent));
    g.add(stall(0, 1.3, m.roof));
    g.add(at(cyl(0.05, 0.05, 2.4, m.wood, 6), 0, 1.2, -1.4));
    g.add(at(box(0.8, 0.45, 0.04, m.accent), 0.4, 2.1, -1.4));
    return g;
  },
  lighthouse: (m) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const r = 0.9 - i * 0.12;
      g.add(at(cyl(r - 0.12, r, 1, i % 2 === 0 ? m.roof : m.white, 12), 0, 0.5 + i, 0));
    }
    g.add(at(cyl(0.75, 0.75, 0.15, m.wood, 12), 0, 4.1, 0));
    const lamp = ball(0.4, new THREE.MeshBasicMaterial({ color: '#ffe27a' }));
    g.add(at(lamp, 0, 4.5, 0));
    g.add(at(cone(0.6, 0.7, m.roof, 12), 0, 5.2, 0));
    g.add(at(house(m, 1.1, 0.8, 1.1), -2.1, 0, 0.8));
    return g;
  },
  forest: (m) => {
    const g = new THREE.Group();
    g.add(at(house(m, 1.2, 0.9, 1.2), 0, 0, 0));
    for (const [x, z, s] of [[-1.8, -0.8, 1.1], [1.7, -0.9, 0.9], [-1.4, 1.5, 0.8], [1.5, 1.4, 1.2], [0.2, -1.8, 1]] as const) {
      g.add(at(pine(m, s), x, 0, z));
    }
    return g;
  },
  lab: (m) => {
    const g = new THREE.Group();
    g.add(at(box(2.2, 1.1, 1.6, m.wall), 0, 0.55, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.roof);
    g.add(at(dome, 0.4, 1.1, 0));
    g.add(at(cyl(0.18, 0.18, 1.3, m.accent, 8), -0.8, 1.6, 0.2));
    for (const [x, y, z, r] of [[-0.8, 2.5, 0.2, 0.2], [-0.5, 3.0, 0.3, 0.14], [-1.0, 3.3, 0.1, 0.1]] as const) {
      g.add(at(ball(r, m.white), x, y, z));
    }
    return g;
  },
  theater: (m) => {
    const g = new THREE.Group();
    g.add(at(box(3, 1.6, 1.8, m.wall), 0, 0.8, 0));
    g.add(at(box(3.2, 0.3, 2.0, m.roof), 0, 1.75, 0));
    g.add(at(box(1.1, 0.9, 0.1, m.accent), 0, 0.7, 0.93));
    for (const x of [-1.2, 1.2]) g.add(at(cyl(0.16, 0.16, 1.6, m.white, 8), x, 0.8, 1.05));
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 14, Math.PI), m.roof);
    g.add(at(arch, 0, 1.2, 1.0));
    return g;
  },
};

/** Costruisce l'edificio della città per tema; le città bloccate sono grigie e coperte da una nuvola. */
export function buildCityModel(theme: CityTheme, look: CityLook): THREE.Group {
  const m = makeMats(look);
  const group = BUILDERS[theme](m);
  if (look.locked) {
    const cloudMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: look.toon, transparent: true, opacity: 0.92 });
    const cloud = new THREE.Group();
    for (const [x, y, z, r] of [[0, 0, 0, 1.3], [-1.2, -0.2, 0.2, 0.95], [1.2, -0.25, -0.1, 1.0], [0.3, 0.45, 0.2, 0.9]] as const) {
      cloud.add(at(ball(r, cloudMat), x, y, z));
    }
    cloud.position.set(0, 3.6, 0);
    cloud.name = 'lock-cloud';
    group.add(cloud);
  }
  return group;
}

/** Stella dorata che ruota sopra le città superate. */
export function buildStar(): THREE.Mesh {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.55 : 0.24;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false });
  geo.translate(0, 0, -0.09);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffc61a' }));
  mesh.name = 'clear-star';
  return mesh;
}
