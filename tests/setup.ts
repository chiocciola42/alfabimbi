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

// jsdom non implementa showModal()/close() di <dialog>: lo simula, compreso l'evento "close".
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
  if (!this.hasAttribute('open')) return;
  this.removeAttribute('open');
  if (returnValue !== undefined) this.returnValue = returnValue;
  setTimeout(() => this.dispatchEvent(new Event('close')), 0);
};
