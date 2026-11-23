import { describe, expect, it } from 'vitest';
import { POP_DURATION, SHAKE_DURATION, approach, moodOfColor, popCurve, shakeCurve } from '../../src/world3d/stage/animations';
import { skin } from '../../src/world3d/stage/skin';
import { INITIAL_PROGRESS } from '../../src/data/alphabet';
import { sanitizeProgress } from '../../src/storage/persistence';

describe('stage animations', () => {
  it('pops up and settles, and is still outside its duration', () => {
    expect(popCurve(0)).toBe(0);
    expect(popCurve(1)).toBe(0);
    expect(popCurve(-1)).toBe(0);
    expect(popCurve(0.5)).toBeGreaterThan(0.5);
    expect(popCurve(POP_DURATION / POP_DURATION)).toBe(0);
  });

  it('shakes with a decaying swing', () => {
    expect(shakeCurve(0)).toBe(0);
    expect(shakeCurve(1)).toBe(0);
    const early = Math.max(...[0.05, 0.1, 0.15].map((t) => Math.abs(shakeCurve(t))));
    const late = Math.max(...[0.85, 0.9, 0.95].map((t) => Math.abs(shakeCurve(t))));
    expect(early).toBeGreaterThan(late);
    expect(SHAKE_DURATION).toBeGreaterThan(0);
  });

  it('tells right answers (green) from wrong ones (red/pink) and ignores neutral colours', () => {
    expect(moodOfColor(16, 185, 129)).toBe('good'); // emerald
    expect(moodOfColor(34, 197, 94)).toBe('good');
    expect(moodOfColor(244, 63, 94)).toBe('bad'); // rose
    expect(moodOfColor(239, 68, 68)).toBe('bad');
    expect(moodOfColor(255, 251, 235)).toBe('neutral'); // cream page
    expect(moodOfColor(245, 158, 11)).toBe('neutral'); // amber
    expect(moodOfColor(255, 255, 255)).toBe('neutral');
    expect(moodOfColor(20, 20, 20)).toBe('neutral');
  });

  it('approaches a target without overshooting, whatever the frame time', () => {
    let v = 0;
    for (let i = 0; i < 30; i++) v = approach(v, 1, 0.016);
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1);
    expect(approach(0, 1, 5)).toBeLessThanOrEqual(1);
    expect(approach(0.3, 0.3, 0.016)).toBeCloseTo(0.3);
  });
});

describe('skin attributes and the 3D setting', () => {
  it('marks an element for the 3D stage, with an optional colour', () => {
    expect(skin()).toEqual({ 'data-skin': '' });
    expect(skin('#f59e0b')).toEqual({ 'data-skin': '', 'data-skin-color': '#f59e0b' });
  });

  it('keeps 3D graphics on by default and remembers the parents choice', () => {
    expect(INITIAL_PROGRESS.graphics3d).toBe(true);
    expect(sanitizeProgress({}).graphics3d).toBe(true);
    expect(sanitizeProgress({ graphics3d: false }).graphics3d).toBe(false);
    expect(sanitizeProgress({ graphics3d: 'no' }).graphics3d).toBe(true);
  });
});
