import type * as THREE from 'three';

/** Un oggetto 3D legato a un elemento "ancora" della pagina (`data-stage-prop`). */
export interface PropInstance {
  group: THREE.Group;
  /** Chiamata a ogni fotogramma; `el` fornisce i parametri letti da `data-stage-*`. */
  update(dt: number, time: number, el: HTMLElement): void;
  dispose(): void;
}

export type PropFactory = (el: HTMLElement) => PropInstance;

export const PROP_ATTR = 'data-stage-prop';

export function disposeGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
