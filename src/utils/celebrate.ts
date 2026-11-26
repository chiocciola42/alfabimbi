import confetti from 'canvas-confetti';

/**
 * Best-effort confetti burst. Celebration is purely decorative, so a missing
 * canvas (tests, very old browsers) is reported to the console and never
 * interrupts the game flow.
 */
export function celebrate(options: confetti.Options): void {
  try {
    void confetti({ ...options, disableForReducedMotion: true });
  } catch (error) {
    console.warn('Confetti non disponibile:', error);
  }
}
