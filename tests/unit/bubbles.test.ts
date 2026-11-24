import { describe, expect, it } from 'vitest';
import { BUBBLE_GOAL, MAX_BUBBLES, TARGET_CHANCE, makeBubble, stepBubbles, withNewBubble } from '../../src/data/bubbles';

const rndSeq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('bubbles', () => {
  it('gives the target letter with the target chance and a random letter otherwise', () => {
    const target = makeBubble(1, 'A', ['B', 'C'], rndSeq(TARGET_CHANCE - 0.01, 0.2, 0.2, 0.2, 0.2, 0.2));
    expect(target.letter).toBe('A');
    const other = makeBubble(2, 'A', ['B', 'C'], rndSeq(0.9, 0.9, 0.2, 0.2, 0.2, 0.2));
    expect(other.letter).toBe('C');
  });

  it('starts below the scene, inside the width, with a usable size and tone', () => {
    for (let i = 0; i < 50; i++) {
      const b = makeBubble(i, 'A', ['A', 'B']);
      expect(b.y).toBe(105);
      expect(b.x).toBeGreaterThanOrEqual(8);
      expect(b.x).toBeLessThanOrEqual(86);
      expect(b.size).toBeGreaterThanOrEqual(72);
      expect(b.size).toBeLessThanOrEqual(90);
      expect(b.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(b.isPopping).toBe(false);
    }
  });

  it('rises each step and drops popped bubbles and those that left the scene', () => {
    const a = { ...makeBubble(1, 'A', ['A']), y: 50, speed: 0.4 };
    const popped = { ...makeBubble(2, 'A', ['A']), y: 50, isPopping: true };
    const gone = { ...makeBubble(3, 'A', ['A']), y: -19.9, speed: 0.3 };
    const next = stepBubbles([a, popped, gone]);
    expect(next.map((b) => b.id)).toEqual([1]);
    expect(next[0].y).toBeCloseTo(49.6);
    expect(a.y).toBe(50); // non muta l'originale
  });

  it('keeps at most MAX_BUBBLES and a goal of 5', () => {
    let list = [] as ReturnType<typeof makeBubble>[];
    for (let i = 0; i < MAX_BUBBLES + 5; i++) list = withNewBubble(list, makeBubble(i, 'A', ['A']));
    expect(list).toHaveLength(MAX_BUBBLES);
    expect(list[list.length - 1].id).toBe(MAX_BUBBLES + 4);
    expect(BUBBLE_GOAL).toBe(5);
  });
});
