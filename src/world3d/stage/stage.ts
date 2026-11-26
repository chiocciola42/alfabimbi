import * as THREE from 'three';
import { frameInterval, isSoftwareRenderer } from '../webgl';
import { POP_DURATION, SHAKE_DURATION, approach, popCurve, shakeCurve, type Mood } from './animations';
import { paintElement, contentSignature } from './domTexture';
import { PROPS, PROP_ATTR, type PropInstance } from './props';
import { cssToRgba, readSkinStyle, type SkinStyle } from './skinStyle';
import { TOP_LAYER_EVENT, TOP_LAYER_RESET_CSS, raiseInTopLayer } from '../../utils/topLayer';

export const SKIN_ATTR = 'data-skin';
const MAX_DPR = isSoftwareRenderer() ? 1 : 2;
const BASE_DEPTH = 14;

interface Item {
  el: HTMLElement;
  group: THREE.Group;
  front: THREE.Mesh;
  base: THREE.Mesh;
  sphere: THREE.Mesh;
  shadow: THREE.Mesh;
  kind: string;
  lastRect: { x: number; y: number; w: number };
  lastColor: { r: number; g: number; b: number };
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
  drawnSig: string;
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
  private props = new Map<HTMLElement, { inst: PropInstance; seen: number }>();
  private geos = new Map<string, { front: THREE.BufferGeometry; base: THREE.BufferGeometry }>();
  private shadowTex: THREE.CanvasTexture;
  private sphereGeo = new THREE.SphereGeometry(0.5, 28, 20);
  private sparks: THREE.Points;
  private sparkData: Array<{ x: number; y: number; vx: number; vy: number; life: number; r: number; g: number; b: number }> = [];
  private raf = 0;
  private last = performance.now();
  private width = 0;
  private height = 0;
  private pointer = { x: -1e4, y: -1e4 };
  private frame = 0;
  private time = 0;
  private lastVisibleCount = -1;
  private lastItemCount = -1;
  private disposed = false;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isSoftwareRenderer(), premultipliedAlpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60;${TOP_LAYER_RESET_CSS}`;
    // Come popover entra nel top layer: così il trofeo 3D si vede anche sopra una finestra modale.
    if ('popover' in HTMLElement.prototype) this.canvas.setAttribute('popover', 'manual');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.testid = 'stage-canvas';
    container.appendChild(this.canvas);
    raiseInTopLayer(this.canvas);
    window.addEventListener(TOP_LAYER_EVENT, this.onTopLayerOpened);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcdd6e6, 2.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
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

  private onTopLayerOpened = () => raiseInTopLayer(this.canvas);

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
    const sphereMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.62 });
    const sphere = new THREE.Mesh(this.sphereGeo, sphereMat);
    sphere.visible = false;
    const group = new THREE.Group();
    group.add(shadow, base, sphere, front);
    this.scene.add(group);
    return { el, group, front, base, sphere, kind: '', lastRect: { x: 0, y: 0, w: 0 }, lastColor: { r: 255, g: 255, b: 255 }, shadow, canvas, tex, sig: '', geoKey: '', mood: 'neutral', pop: 99, shake: 99, tiltX: 0, tiltY: 0, lift: 0, seen: 0, drawnSig: '' };
  }

  private removeItem(it: Item) {
    this.scene.remove(it.group);
    it.tex.dispose();
    (it.front.material as THREE.Material).dispose();
    (it.base.material as THREE.Material).dispose();
    (it.shadow.material as THREE.Material).dispose();
    (it.sphere.material as THREE.Material).dispose();
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

  /** Vero se l'elemento è davvero in cima: si controllano il centro e quattro punti interni. */
  private onTopCache = new WeakMap<HTMLElement, { frame: number; value: boolean }>();

  private isOnTop(el: HTMLElement, r: DOMRect): boolean {
    const cached = this.onTopCache.get(el);
    if (cached && this.frame - cached.frame < 4) return cached.value;
    const value = this.checkOnTop(el, r);
    this.onTopCache.set(el, { frame: this.frame, value });
    return value;
  }

  private checkOnTop(el: HTMLElement, r: DOMRect): boolean {
    const pts: Array<[number, number]> = [[0.5, 0.5], [0.22, 0.25], [0.78, 0.25], [0.22, 0.75], [0.78, 0.75]];
    for (const [fx, fy] of pts) {
      const x = Math.min(this.width - 1, Math.max(0, r.left + r.width * fx));
      const y = Math.min(this.height - 1, Math.max(0, r.top + r.height * fy));
      const top = document.elementFromPoint(x, y);
      if (!top || !(top === el || el.contains(top))) return false;
    }
    return true;
  }

  private updateProps(dt: number) {
    const seenFrame = this.frame;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[${PROP_ATTR}]`))) {
      const factory = PROPS[el.getAttribute(PROP_ATTR) ?? ''];
      if (!factory) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > this.height || !this.isOnTop(el, r)) continue;
      let entry = this.props.get(el);
      if (!entry) {
        entry = { inst: factory(el), seen: seenFrame };
        this.scene.add(entry.inst.group);
        this.props.set(el, entry);
      }
      entry.seen = seenFrame;
      const unit = Math.min(r.width, r.height);
      entry.inst.group.position.set(r.left + r.width / 2, r.top + r.height / 2, 120);
      entry.inst.group.scale.set(unit, unit, unit);
      entry.inst.group.visible = true;
      entry.inst.update(dt, this.time, el);
    }
    for (const [el, entry] of Array.from(this.props.entries())) {
      if (entry.seen === seenFrame) continue;
      if (el.isConnected) entry.inst.group.visible = false;
      else {
        this.scene.remove(entry.inst.group);
        entry.inst.dispose();
        this.props.delete(el);
      }
    }
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
      if (!this.isOnTop(el, r)) continue; // coperto da un velo, da un pannello o dall'intestazione
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
    if (now - this.last < frameInterval()) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.frame++;
    this.resize();
    const needsRender = this.update(dt);
    if (needsRender) this.renderer.render(this.scene, this.camera);
  };

  /** Un passo di aggiornamento (separato dal ciclo per poterlo chiamare nei test e dopo i cambi di pagina). */
  update(dt: number): boolean {
    let dirty = false;
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
      const kind = el.getAttribute(SKIN_ATTR) || 'tile';
      const skinColor = el.getAttribute(`${SKIN_ATTR}-color`) ?? undefined;
      let st: SkinStyle = readSkinStyle(el, skinColor);
      const round = kind === 'bubble' || kind === 'ball';
      if (round) {
        const c = skinColor ? cssToRgba(skinColor) : st.hasBg ? st.solid : cssToRgba('#7dd3fc');
        st = { ...st, solid: c, hasBg: false, borderWidth: 0, radius: r.width / 2, mood: 'neutral' };
      }
      it.kind = kind;
      it.lastRect = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
      it.lastColor = { r: st.solid.r, g: st.solid.g, b: st.solid.b };
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
      const px = cx;
      const py = cy;
      if (it.group.position.x !== px || it.group.position.y !== py || pop > 0 || shake !== 0 || it.lift > 0.001 || Math.abs(it.tiltX) > 0.001 || it.sig !== it.drawnSig) dirty = true;
      it.drawnSig = it.sig;
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
      if (round) dirty = kind === 'bubble' || dirty; // le bolle respirano: si ridisegnano sempre
      if (round) {
        const sm = it.sphere.material as THREE.MeshStandardMaterial;
        sm.color.setRGB(st.solid.r / 255, st.solid.g / 255, st.solid.b / 255, THREE.SRGBColorSpace);
        sm.opacity = (kind === 'ball' ? 1 : 0.62) * st.opacity;
        sm.roughness = kind === 'ball' ? 0.28 : 0.08;
        it.sphere.visible = true;
        it.base.visible = false;
        it.shadow.visible = false;
        const breathe = kind === 'ball' ? 1 : 1 + Math.sin(this.time * 2.2 + (cx + cy) * 0.01) * 0.025;
        it.sphere.scale.set(r.width * breathe, r.width * breathe, r.width);
        it.sphere.position.z = -r.width * 0.2;
        it.front.position.z = r.width * 0.32;
        it.group.rotation.set(it.tiltX * 0.4, it.tiltY * 0.4, 0);
        it.group.position.z = index * 0.2;
      }
      it.group.visible = true;
    });
    for (const it of Array.from(this.items.values())) {
      if (it.seen !== seenFrame) {
        if (!it.el.isConnected) {
          // Una bolla scoppiata (tolta dalla pagina mentre è ancora in vista) fa una nuvola di stelline.
          if (it.kind === 'bubble' && it.lastRect.y > 0 && it.lastRect.y < this.height) this.burst(it.lastRect.x, it.lastRect.y, it.lastColor);
          this.removeItem(it);
        }
        else it.group.visible = false;
      }
    }
    const hadProps = this.props.size > 0;
    this.updateProps(dt);
    const hadSparks = this.sparkData.length > 0;
    this.updateSparks(dt);
    const visibleChange = this.lastVisibleCount !== live.length;
    this.lastVisibleCount = live.length;
    const removed = this.items.size !== this.lastItemCount;
    this.lastItemCount = this.items.size;
    return dirty || hadProps || hadSparks || visibleChange || removed || this.frame < 3;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onPointer);
    window.removeEventListener(TOP_LAYER_EVENT, this.onTopLayerOpened);
    for (const it of Array.from(this.items.values())) this.removeItem(it);
    for (const entry of this.props.values()) {
      this.scene.remove(entry.inst.group);
      entry.inst.dispose();
    }
    this.props.clear();
    for (const g of this.geos.values()) {
      g.front.dispose();
      g.base.dispose();
    }
    this.geos.clear();
    this.sparks.geometry.dispose();
    (this.sparks.material as THREE.PointsMaterial).map?.dispose();
    (this.sparks.material as THREE.Material).dispose();
    this.shadowTex.dispose();
    this.sphereGeo.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
