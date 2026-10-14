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
