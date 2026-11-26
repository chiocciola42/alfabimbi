import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TracingCanvas } from '../../src/components/TracingCanvas';
import { ALPHABET_DATA } from '../../src/data/alphabet';

const SIZE = 400; // CSS px; devicePixelRatio is 1 in jsdom
const letter = ALPHABET_DATA[0]; // A: three straight strokes

const ctxStub = new Proxy({}, { get: () => vi.fn(), set: () => true });

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(
    () => ({ left: 0, top: 0, width: SIZE, height: SIZE, right: SIZE, bottom: SIZE, x: 0, y: 0, toJSON() {} }) as DOMRect
  );
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

const canvas = () => document.querySelectorAll('canvas')[0] as HTMLCanvasElement;

function pointer(type: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) {
  fireEvent[type](canvas(), { clientX: x, clientY: y, pointerId: 1 });
}

/** Draws a polyline given in guide coordinates (0-100). */
function drawPath(points: Array<{ x: number; y: number }>) {
  const px = (v: number) => (v / 100) * SIZE;
  pointer('pointerDown', px(points[0].x), px(points[0].y));
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (let t = 0; t <= 1; t += 0.05) {
      pointer('pointerMove', px(a.x + (b.x - a.x) * t), px(a.y + (b.y - a.y) * t));
    }
  }
  pointer('pointerUp', 0, 0);
}

function setup(overrides: Partial<React.ComponentProps<typeof TracingCanvas>> = {}) {
  const props: React.ComponentProps<typeof TracingCanvas> = {
    letter,
    onLetterComplete: vi.fn(),
    onNextLetter: vi.fn(),
    onPrevLetter: vi.fn(),
    isCompletedUppercase: false,
    isCompletedLowercase: false,
    ...overrides,
  };
  render(<TracingCanvas {...props} />);
  return props;
}

describe('TracingCanvas', () => {
  it('shows the letter to trace, uppercase first', () => {
    setup();
    expect(screen.getByText(`come ${letter.word}`)).toBeInTheDocument();
    expect(screen.getByText('Lettera Maiuscola')).toBeInTheDocument();
  });

  it('completes the uppercase letter when the guide is followed', () => {
    const { onLetterComplete } = setup();
    for (const stroke of letter.strokesUppercase) drawPath(stroke.points);
    expect(onLetterComplete).toHaveBeenCalledTimes(1);
    expect(onLetterComplete).toHaveBeenCalledWith(letter.id, true);
  });

  it('does not complete on a random scribble far from the guide', () => {
    const { onLetterComplete } = setup();
    drawPath([
      { x: 2, y: 2 },
      { x: 10, y: 4 },
      { x: 4, y: 8 },
    ]);
    expect(onLetterComplete).not.toHaveBeenCalled();
  });

  it('reports lowercase completion after switching case', () => {
    const { onLetterComplete } = setup();
    fireEvent.click(screen.getByRole('button', { name: /minuscolo/ }));
    expect(screen.getByText('Lettera minuscola')).toBeInTheDocument();
    for (const stroke of letter.strokesLowercase) drawPath(stroke.points);
    expect(onLetterComplete).toHaveBeenCalledWith(letter.id, false);
  });

  it('only reports completion once', () => {
    const { onLetterComplete } = setup();
    for (const stroke of letter.strokesUppercase) drawPath(stroke.points);
    for (const stroke of letter.strokesUppercase) drawPath(stroke.points);
    expect(onLetterComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps accepting strokes after 75% and lets the percentage reach 100%', () => {
    const { onLetterComplete } = setup();
    const [s1, s2, s3] = letter.strokesUppercase;
    drawPath(s1.points);
    drawPath(s2.points);
    expect(onLetterComplete).toHaveBeenCalledTimes(1);
    const reached = Number(screen.getByText(/Completato: \d+%/).textContent!.match(/\d+/)![0]);
    expect(reached).toBeGreaterThanOrEqual(75);
    expect(reached).toBeLessThan(100);

    drawPath(s3.points); // the child finishes the letter
    expect(screen.getByText('Completato: 100%')).toBeInTheDocument();
    expect(onLetterComplete).toHaveBeenCalledTimes(1); // reported only once
  });

  it('navigates between letters', () => {
    const { onNextLetter, onPrevLetter } = setup();
    fireEvent.click(screen.getByTitle('Lettera successiva'));
    fireEvent.click(screen.getByTitle('Lettera precedente'));
    expect(onNextLetter).toHaveBeenCalled();
    expect(onPrevLetter).toHaveBeenCalled();
  });

  it('survives a missing 2D context (e.g. unsupported browser)', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    const { onLetterComplete } = setup();
    expect(() => drawPath(letter.strokesUppercase[0].points)).not.toThrow();
    expect(onLetterComplete).not.toHaveBeenCalled();
  });
});
describe('TracingCanvas - tastiera e tecnologie assistive', () => {
  const letterE = ALPHABET_DATA[1]; // E: tratti dritti
  const board = () => screen.getByRole('application', { name: /Lavagna: traccia la lettera E/ });
  const press = (key: string, times = 1) => {
    for (let i = 0; i < times; i++) fireEvent.keyDown(board(), { key });
  };
  const percent = () => Number(screen.getByText(/Completato: \d+%/).textContent!.match(/\d+/)![0]);

  it('names the drawing board, the progress and the toggles', () => {
    setup({ letter: letterE });
    expect(board()).toHaveAttribute('tabindex', '0');
    expect(board()).toHaveAccessibleDescription(/frecce muovono la penna/);
    expect(screen.getByRole('progressbar', { name: 'Obiettivo scrittura' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: /MAIUSCOLO/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /minuscolo/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('slider', { name: 'Spessore pennarello' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lettera successiva' })).toBeInTheDocument();
    expect(document.querySelector('svg[viewBox="0 0 100 100"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('moves the pen without writing while it is up', () => {
    setup({ letter: letterE });
    press('ArrowDown', 10);
    expect(percent()).toBe(0);
  });

  it('writes the whole letter with the arrow keys, Space and Enter', () => {
    const { onLetterComplete } = setup({ letter: letterE });
    // La penna parte dall'inizio del primo tratto (30, 15).
    press(' ');
    press('ArrowDown', 24); // tratto 1: giù fino alla base
    press(' ');
    press('ArrowUp', 24);
    press('Enter');
    press('ArrowRight', 15); // tratto 2: in alto verso destra
    press('Enter');
    press('ArrowLeft', 15);
    press('ArrowDown', 12);
    press(' ');
    press('ArrowRight', 12); // tratto 3: barra centrale
    press(' ');
    press('ArrowDown', 12);
    press('ArrowLeft', 12);
    press(' ');
    press('ArrowRight', 15); // tratto 4: base
    press(' ');
    expect(onLetterComplete).toHaveBeenCalledWith(letterE.id, true);
    expect(onLetterComplete).toHaveBeenCalledTimes(1);
  });

  it('lifts the pen on Escape and when the board loses focus', () => {
    setup({ letter: letterE });
    press(' ');
    press('ArrowDown', 8);
    const written = percent();
    expect(written).toBeGreaterThan(0);
    press('Escape');
    press('ArrowDown', 8);
    expect(percent()).toBe(written);

    press(' ');
    press('ArrowDown', 2);
    const afterTwo = percent();
    fireEvent.blur(board());
    press('ArrowDown', 6);
    expect(percent()).toBe(afterTwo);
  });
});
