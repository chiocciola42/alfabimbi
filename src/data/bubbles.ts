/** Logica pura delle Bolle Magiche: nascita e movimento delle bolle (il disegno sta nel componente). */

export interface Bubble {
  id: number;
  letter: string;
  x: number; // percentuale 8-86
  y: number; // percentuale: parte da 105 (sotto la scena) e sale verso -20
  speed: number;
  size: number; // px 72-90
  color: string; // classi Tailwind del gradiente (versione senza 3D)
  hex: string; // stesso tono per la bolla 3D
  isPopping: boolean;
}

export const BUBBLE_GOAL = 5;
export const SPAWN_EVERY_MS = 850;
export const TARGET_CHANCE = 0.42;
export const MAX_BUBBLES = 13;

export const BUBBLE_PALETTE: ReadonlyArray<{ color: string; hex: string }> = [
  { color: 'from-cyan-300/80 to-blue-400/80', hex: '#38bdf8' },
  { color: 'from-pink-300/80 to-rose-400/80', hex: '#f472b6' },
  { color: 'from-amber-200/80 to-yellow-400/80', hex: '#fbbf24' },
  { color: 'from-emerald-300/80 to-teal-400/80', hex: '#34d399' },
  { color: 'from-purple-300/80 to-violet-400/80', hex: '#a78bfa' },
];

/** Una nuova bolla: con probabilità `TARGET_CHANCE` porta la lettera da cercare, altrimenti una a caso. */
export function makeBubble(id: number, target: string, pool: readonly string[], rnd: () => number = Math.random): Bubble {
  const letter = rnd() < TARGET_CHANCE || pool.length === 0 ? target : pool[Math.floor(rnd() * pool.length)];
  const tone = BUBBLE_PALETTE[Math.floor(rnd() * BUBBLE_PALETTE.length)];
  return {
    id,
    letter,
    x: 8 + rnd() * 78,
    y: 105,
    speed: 0.28 + rnd() * 0.22,
    size: 72 + rnd() * 18,
    color: tone.color,
    hex: tone.hex,
    isPopping: false,
  };
}

/** Un passo di movimento: tutte salgono; escono di scena quelle in cima o già scoppiate. */
export function stepBubbles(bubbles: readonly Bubble[]): Bubble[] {
  return bubbles.map((b) => ({ ...b, y: b.y - b.speed })).filter((b) => b.y > -20 && !b.isPopping);
}

/** Aggiunge una bolla tenendone al massimo `MAX_BUBBLES`. */
export function withNewBubble(bubbles: readonly Bubble[], bubble: Bubble): Bubble[] {
  return [...bubbles.slice(-(MAX_BUBBLES - 1)), bubble];
}
