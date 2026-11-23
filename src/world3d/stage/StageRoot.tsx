import { useEffect } from 'react';
import { Stage } from './stage';

/** Monta il palco 3D sopra la pagina finché è presente; non disegna nulla da solo. */
export default function StageRoot() {
  useEffect(() => {
    let stage: Stage | null = null;
    try {
      stage = new Stage(document.body);
    } catch {
      return;
    }
    document.documentElement.classList.add('stage3d-on');
    return () => {
      document.documentElement.classList.remove('stage3d-on');
      stage?.dispose();
    };
  }, []);
  return null;
}
