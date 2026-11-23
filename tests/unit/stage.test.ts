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
    expect(skin(undefined, 'ball')).toEqual({ 'data-skin': 'ball' });
    expect(skin('#fff', 'bubble')).toEqual({ 'data-skin': 'bubble', 'data-skin-color': '#fff' });
  });

  it('keeps 3D graphics on by default and remembers the parents choice', () => {
    expect(INITIAL_PROGRESS.graphics3d).toBe(true);
    expect(sanitizeProgress({}).graphics3d).toBe(true);
    expect(sanitizeProgress({ graphics3d: false }).graphics3d).toBe(false);
    expect(sanitizeProgress({ graphics3d: 'no' }).graphics3d).toBe(true);
  });
});

import { parseStrokes, strokeFill } from '../../src/world3d/stage/props/letterProp';
import { PROPS } from '../../src/world3d/stage/props';

describe('3D letter and props', () => {
  it('reads strokes from the attribute and ignores garbage', () => {
    expect(parseStrokes(null)).toEqual([]);
    expect(parseStrokes('not json')).toEqual([]);
    expect(parseStrokes('{"a":1}')).toEqual([]);
    const ok = parseStrokes(JSON.stringify([[{ x: 1, y: 2 }, { x: 3, y: 4 }], [{ x: 1, y: 1 }], 5, [{ x: 0, y: 0 }, { x: 'a' }, { x: 9, y: 9 }]]));
    expect(ok).toHaveLength(2); // il tratto con un solo punto e quello non valido cadono
    expect(ok[1]).toEqual([{ x: 0, y: 0 }, { x: 9, y: 9 }]);
  });

  it('fills the strokes one after the other as the drawing advances', () => {
    expect(strokeFill(0, 2, 0)).toBe(0);
    expect(strokeFill(0, 2, 0.25)).toBeCloseTo(0.5);
    expect(strokeFill(1, 2, 0.25)).toBe(0);
    expect(strokeFill(0, 2, 0.75)).toBe(1);
    expect(strokeFill(1, 2, 0.75)).toBeCloseTo(0.5);
    expect(strokeFill(1, 2, 1)).toBe(1);
    expect(strokeFill(0, 0, 1)).toBe(0);
  });

  it('registers the props by name', () => {
    expect(Object.keys(PROPS).sort()).toEqual(['clock3d', 'curtain', 'letter3d', 'shape3d', 'trophy']);
  });
});

import { clockAngles } from '../../src/world3d/stage/props/clockProp';
import { shapeOutline } from '../../src/world3d/stage/props/shapeProp';

describe('math props', () => {
  it('turns a time into hand angles (hour hand moves with the minutes)', () => {
    expect(clockAngles(3, 0)).toEqual({ hour: 90, minute: 0 });
    expect(clockAngles(12, 0)).toEqual({ hour: 0, minute: 0 });
    expect(clockAngles(2, 30)).toEqual({ hour: 75, minute: 180 });
    expect(clockAngles(15, 0).hour).toBe(90); // 15:00 = le 3
    expect(clockAngles(-1, 0).hour).toBe(330);
  });

  it('outlines every shape of the game, with the right number of corners', () => {
    expect(shapeOutline('cerchio')).toBeNull();
    expect(shapeOutline('quadrato')).toHaveLength(4);
    expect(shapeOutline('rettangolo')).toHaveLength(4);
    expect(shapeOutline('triangolo')).toHaveLength(3);
    expect(shapeOutline('pentagono')).toHaveLength(5);
    expect(shapeOutline('esagono')).toHaveLength(6);
    const rect = shapeOutline('rettangolo')!;
    const width = Math.max(...rect.map((p) => p[0])) - Math.min(...rect.map((p) => p[0]));
    const height = Math.max(...rect.map((p) => p[1])) - Math.min(...rect.map((p) => p[1]));
    expect(width).toBeGreaterThan(height);
  });
});
