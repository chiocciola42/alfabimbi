/** True se il browser sa creare un contesto WebGL (in test e su dispositivi vecchi può mancare). */
export function supportsWebGL(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
