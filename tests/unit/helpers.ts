import { act, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PARENT_HOLD_MS } from '../../src/utils/ui';

/** Presses and holds a button for `ms` (needs fake timers, which this switches on). */
export function holdButton(button: HTMLElement, ms: number = PARENT_HOLD_MS) {
  vi.useFakeTimers();
  fireEvent.pointerDown(button);
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  fireEvent.pointerUp(button);
}

/** Opens the parents' area (profile and settings) with the required long press. */
export function openParentArea() {
  holdButton(screen.getByRole('button', { name: /Area genitori/ }));
}
