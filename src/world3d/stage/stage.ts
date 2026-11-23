import * as THREE from 'three';
import { POP_DURATION, SHAKE_DURATION, approach, popCurve, shakeCurve, type Mood } from './animations';
import { paintElement, contentSignature } from './domTexture';
import { readSkinStyle, type SkinStyle } from './skinStyle';

export const SKIN_ATTR = 'data-skin';
const MAX_DPR = 2;
const BASE_DEPTH = 14;

interface Item {
  el: HTMLElement;
  group: THREE.Group;
  front: THREE.Mesh;
  base: THREE.Mesh;
  shadow: THREE.Mesh;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  sig: string;
  geoKey: string;
  mood: Mood;
  pop: number; // secondi dall'ultimo "bravo" (>= durata = fermo)
  shake: number;
  tiltX: number;
  tiltY: number;
  lift: number;
  seen: number;
}

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.max(0.5, Math.min(r, w / 2, h / 2));
  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * Il "palco" 3D: un canvas WebGL sopra i giochi che ridisegna come gettoni con spessore, luci e rimbalzi
 * gli elementi DOM marcati con `data-skin`. Il DOM resta quello vero: riceve i tocchi, ha etichette e voce.
 */
export class Stage {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(0, 1, 0, 1, -600, 600);
  private items = new Map<HTMLElement, Item>();
  private geos = new Map<string, { front: THREE.BufferGeometry; base: THREE.BufferGeometry }>();
  private shadowTex: THREE.CanvasTexture;
  private sparks: THREE.Points;
  private sparkData: Array<{ x: number; y: number; vx: number; vy: number; life: number; r: number; g: number; b: number }> = [];
  private raf = 0;
  private last = performance.now();
  private width = 0;
  private height = 0;
  private pointer = { x: -1e4, y: -1e4 };
  private frame = 0;
  private disposed = false;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:30';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.testid = 'stage-canvas';
    container.appendChild(this.canvas);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4d6, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-200, -300, 400);
    this.scene.add(sun);

    this.camera.position.z = 500;

    const sc = document.createElement('canvas');
    sc.width = sc.height = 64;
    const sx = sc.getContext('2d');
    if (sx) {
      const g = sx.createRadialGradient(32, 32, 4, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sx.fillStyle = g;
      sx.fillRect(0, 0, 64, 64);
    }
    this.shadowTex = new THREE.CanvasTexture(sc);

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
    const starCanvas = document.createElement('canvas');
    starCanvas.width = starCanvas.height = 32;
    const st = starCanvas.getContext('2d');
    if (st) {
      st.fillStyle = '#fff';
      st.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? 15 : 6;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        st.lineTo(16 + Math.cos(a) * rad, 16 + Math.sin(a) * rad);
      }
      st.closePath();
      st.fill();
    }
    this.sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        size: 16, vertexColors: true, transparent: true, depthTest: false, sizeAttenuation: false,
        map: new THREE.CanvasTexture(starCanvas), alphaTest: 0.2,
      })
    );
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 10;
    this.scene.add(this.sparks);

    window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
  };

  get itemCount(): number {
    return this.items.size;
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    this.renderer.setSize(w, h, false);
    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = h;
    this.camera.updateProjectionMatrix();
  }

  private geometries(w: number, h: number, r: number) {
    const key = `${Math.round(w)}x${Math.round(h)}x${Math.round(r)}`;
    let g = this.geos.get(key);
    if (!g) {
      if (this.geos.size > 96) {
        for (const v of this.geos.values()) {
          v.front.dispose();
          v.base.dispose();
        }
        this.geos.clear();
      }
      const shape = roundedShape(w, h, r);
      const front = new THREE.ShapeGeometry(shape, 10);
      const pos = front.attributes.position;
      const uv = front.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, 1 - (pos.getY(i) / h + 0.5));
      const depth = Math.min(BASE_DEPTH, Math.max(5, Math.min(w, h) * 0.22));
      const base = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
      base.translate(0, 0, -depth);
      g = { front, base };
      this.geos.set(key, g);
    }
    return { key, ...g };
  }

  private createItem(el: HTMLElement): Item {
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const frontMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05, transparent: true });
    const shadowMat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false });
    const front = new THREE.Mesh(new THREE.BufferGeometry(), frontMat);
    const base = new THREE.Mesh(new THREE.BufferGeometry(), baseMat);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    const group = new THREE.Group();
    group.add(shadow, base, front);
    this.scene.add(group);
    return { el, group, front, base, shadow, canvas, tex, sig: '', geoKey: '', mood: 'neutral', pop: 99, shake: 99, tiltX: 0, tiltY: 0, lift: 0, seen: 0 };
  }

  private removeItem(it: Item) {
    this.scene.remove(it.group);
    it.tex.dispose();
    (it.front.material as THREE.Material).dispose();
    (it.base.material as THREE.Material).dispose();
    (it.shadow.material as THREE.Material).dispose();
    it.shadow.geometry.dispose();
    this.items.delete(it.el);
  }

  /** Coriandoli di stelline dal centro di un elemento. */
  burst(x: number, y: number, color: { r: number; g: number; b: number }) {
    for (let i = 0; i < 14 && this.sparkData.length < 240; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 190;
      this.sparkData.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.7 + Math.random() * 0.5,
        r: Math.min(1, color.r / 255 + 0.35), g: Math.min(1, color.g / 255 + 0.35), b: Math.min(1, color.b / 255 + 0.1),
      });
    }
  }

  private updateSparks(dt: number) {
    const pos = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.sparks.geometry.attributes.color as THREE.BufferAttribute;
    let n = 0;
    this.sparkData = this.sparkData.filter((s) => {
      s.life -= dt;
      s.vy += 520 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      return s.life > 0;
    });
    for (const s of this.sparkData) {
      pos.setXYZ(n, s.x, s.y, 300);
      const f = Math.min(1, s.life * 2);
      col.setXYZ(n, s.r * f + (1 - f), s.g * f + (1 - f) * 0.9, s.b * f);
      n++;
    }
    this.sparks.geometry.setDrawRange(0, n);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private visibleItems(): HTMLElement[] {
    const found = Array.from(document.querySelectorAll<HTMLElement>(`[${SKIN_ATTR}]`));
    const out: HTMLElement[] = [];
    for (const el of found) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      // Icone, immagini o pulsanti dentro l'elemento non sarebbero disegnati: in quel caso resta com'è.
      if (el.querySelector('svg,img,canvas,button,input,video,[data-skin]')) continue;
      if (r.bottom < -40 || r.top > this.height + 40 || r.right < -40 || r.left > this.width + 40) continue;
      const cx = Math.min(this.width - 1, Math.max(0, r.left + r.width / 2));
      const cy = Math.min(this.height - 1, Math.max(0, r.top + r.height / 2));
      const top = document.elementFromPoint(cx, cy);
      if (!top || !(top === el || el.contains(top))) continue; // coperto da un velo o da un pannello
      out.push(el);
    }
    return out;
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) {
      this.last = now;
      return;
    }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frame++;
    this.resize();
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  /** Un passo di aggiornamento (separato dal ciclo per poterlo chiamare nei test e dopo i cambi di pagina). */
  update(dt: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const live = this.visibleItems();
    const seenFrame = this.frame;
    live.forEach((el, index) => {
      let it = this.items.get(el);
      if (!it) {
        it = this.createItem(el);
        this.items.set(el, it);
      }
      it.seen = seenFrame;
      const r = el.getBoundingClientRect();
      const st: SkinStyle = readSkinStyle(el, el.getAttribute(`${SKIN_ATTR}-color`) ?? undefined);
      const focused = el.matches(':focus-visible');
      const sig = contentSignature(el, r.width, r.height, st, focused);
      const geo = this.geometries(r.width, r.height, st.radius || Math.min(18, Math.min(r.width, r.height) * 0.2));
      if (geo.key !== it.geoKey) {
        it.front.geometry = geo.front;
        it.base.geometry = geo.base;
        it.geoKey = geo.key;
      }
      if (sig !== it.sig) {
        paintElement(it.canvas, el, r.width, r.height, st, focused, dpr);
        it.tex.needsUpdate = true;
        if (it.sig && st.mood !== it.mood) {
          if (st.mood === 'good') {
            it.pop = 0;
            this.burst(r.left + r.width / 2, r.top + r.height / 2, st.solid);
          } else if (st.mood === 'bad') it.shake = 0;
        }
        it.sig = sig;
        it.mood = st.mood;
      }
      it.pop += dt;
      it.shake += dt;

      const hovered = el.matches(':hover') && !(el as HTMLButtonElement).disabled;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = hovered ? Math.max(-1, Math.min(1, (this.pointer.x - cx) / (r.width / 2))) : 0;
      const ny = hovered ? Math.max(-1, Math.min(1, (this.pointer.y - cy) / (r.height / 2))) : 0;
      it.tiltX = approach(it.tiltX, ny * 0.22, dt);
      it.tiltY = approach(it.tiltY, -nx * 0.22, dt);
      it.lift = approach(it.lift, hovered ? 1 : 0, dt);

      const pop = popCurve(it.pop / POP_DURATION);
      const shake = shakeCurve(it.shake / SHAKE_DURATION);
      const s = 1 + pop * 0.12 + it.lift * 0.03;
      it.group.position.set(cx, cy, index * 0.2 + pop * 40 + it.lift * 14);
      it.group.scale.set(s, s, 1);
      it.group.rotation.set(it.tiltX, it.tiltY, shake * 0.07);
      const base = it.base.material as THREE.MeshStandardMaterial;
      base.color.setRGB(st.solid.r / 255, st.solid.g / 255, st.solid.b / 255, THREE.SRGBColorSpace);
      base.opacity = it.front.visible ? st.opacity : 0;
      (it.front.material as THREE.MeshBasicMaterial).opacity = st.opacity;
      it.base.visible = st.hasBg;
      it.shadow.visible = st.hasBg;
      it.shadow.scale.set(r.width * 1.25, r.height * 1.45, 1);
      it.shadow.position.set(0, 8 + it.lift * 6, -BASE_DEPTH - 4);
      it.group.visible = true;
    });
    for (const it of Array.from(this.items.values())) {
      if (it.seen !== seenFrame) {
        if (!it.el.isConnected) this.removeItem(it);
        else it.group.visible = false;
      }
    }
    this.updateSparks(dt);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onPointer);
    for (const it of Array.from(this.items.values())) this.removeItem(it);
    for (const g of this.geos.values()) {
      g.front.dispose();
      g.base.dispose();
    }
    this.geos.clear();
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.PointsMaterial).map?.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.shadowTex.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
