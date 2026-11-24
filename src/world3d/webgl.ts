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

let software: boolean | null = null;

/** True se WebGL gira su CPU (SwiftShader, llvmpipe…): lì conviene un rendering più leggero. */
export function isSoftwareRenderer(): boolean {
  if (software !== null) return software;
  software = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl?.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '') : '';
    software = /swiftshader|llvmpipe|software|softpipe/i.test(name);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    software = false;
  }
  return software;
}

/** Millisecondi minimi tra due fotogrammi: più larghi su CPU, così il resto della pagina resta reattivo. */
export function frameInterval(): number {
  return isSoftwareRenderer() ? 50 : 0;
}
