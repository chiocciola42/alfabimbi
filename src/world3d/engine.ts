import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Engine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  /** Registra una funzione chiamata a ogni fotogramma con (dt, tempo totale) in secondi. */
  onTick(fn: (dt: number, t: number) => void): void;
  /** Coordinate in pixel (relative al contenitore) di un punto del mondo. */
  project(point: THREE.Vector3): { x: number; y: number; visible: boolean };
  dispose(): void;
}

export const SKY_COLOR = 0xbfe9ff;

/** Gradiente a 3 toni per l'ombreggiatura "a cartone" dei materiali toon. */
export function makeToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Crea renderer, luci, camera e controlli dentro `container`; il ciclo di rendering si ferma quando la scheda è nascosta. */
export function createEngine(container: HTMLElement): Engine {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, 70, 170);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9ccfe6, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d0, 2.1);
  sun.position.set(-18, 30, 14);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  camera.position.set(0, 30, 30);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = false;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.1;
  controls.minAzimuthAngle = -0.7;
  controls.maxAzimuthAngle = 0.7;
  controls.minDistance = 12;
  controls.maxDistance = 80;

  const ticks: Array<(dt: number, t: number) => void> = [];
  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;
  let width = 1;
  let height = 1;

  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  resize();

  const frame = () => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      clock.getDelta();
      return;
    }
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    for (const fn of ticks) fn(dt, t);
    controls.update();
    renderer.render(scene, camera);
  };
  frame();

  const tmp = new THREE.Vector3();
  return {
    scene,
    camera,
    renderer,
    controls,
    onTick: (fn) => ticks.push(fn),
    project(point) {
      tmp.copy(point).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height, visible: tmp.z > -1 && tmp.z < 1 };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
