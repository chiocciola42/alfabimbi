import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

// jsdom has no canvas / speech / audio: stub what the app touches.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
