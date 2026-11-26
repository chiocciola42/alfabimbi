import confetti from 'canvas-confetti';
import { TOP_LAYER_RESET_CSS, raiseInTopLayer } from './topLayer';

interface ConfettiLayer {
  canvas: HTMLCanvasElement;
  fire: ReturnType<typeof confetti.create>;
}

let layer: ConfettiLayer | null = null;
let pendingBursts = 0;

/**
 * Canvas dei coriandoli nel top layer (popover manuale): quello predefinito di canvas-confetti è un
 * normale elemento fisso e finirebbe sotto una finestra modale nativa. Restituisce null dove non si può.
 */
function confettiLayer(): ConfettiLayer | null {
  if (layer) return layer;
  if (typeof confetti.create !== 'function' || typeof HTMLElement.prototype.showPopover !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('popover', 'manual');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;${TOP_LAYER_RESET_CSS}`;
  document.body.appendChild(canvas);
  layer = { canvas, fire: confetti.create(canvas, { resize: false, useWorker: false }) };
  return layer;
}

/**
 * Best-effort confetti burst. Celebration is purely decorative, so a missing
 * canvas (tests, very old browsers) is reported to the console and never
 * interrupts the game flow.
 */
export function celebrate(options: confetti.Options): void {
  try {
    const opts = { ...options, disableForReducedMotion: true };
    const top = confettiLayer();
    if (!top) {
      void confetti(opts);
      return;
    }
    const { canvas, fire } = top;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    raiseInTopLayer(canvas); // in cima, anche sopra una modale già aperta
    pendingBursts++;
    const done = () => {
      pendingBursts--;
      if (pendingBursts === 0 && canvas.matches(':popover-open')) canvas.hidePopover();
    };
    const run = fire(opts);
    if (run) void run.then(done, done);
    else done();
  } catch (error) {
    console.warn('Confetti non disponibile:', error);
  }
}

