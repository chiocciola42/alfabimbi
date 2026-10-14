import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUsageTracker } from '../../src/hooks/useUsageTracker';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
});
afterEach(() => setVisibility('visible'));

describe('useUsageTracker', () => {
  it('reports ten seconds batches', () => {
    const onFlush = vi.fn();
    renderHook(() => useUsageTracker('tracing', onFlush));
    vi.advanceTimersByTime(25_000);
    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenCalledWith(10, 'tracing');
  });

  it('flushes the remaining seconds on unmount', () => {
    const onFlush = vi.fn();
    const { unmount } = renderHook(() => useUsageTracker('words', onFlush));
    vi.advanceTimersByTime(4_000);
    expect(onFlush).not.toHaveBeenCalled();
    unmount();
    expect(onFlush).toHaveBeenCalledWith(4, 'words');
  });

  it('attributes time to the tab that was active when it was measured', () => {
    const onFlush = vi.fn();
    const { rerender } = renderHook(({ tab }) => useUsageTracker(tab, onFlush), {
      initialProps: { tab: 'explorer' as 'explorer' | 'bubbles' },
    });
    vi.advanceTimersByTime(3_000);
    rerender({ tab: 'bubbles' });
    vi.advanceTimersByTime(2_000);
    expect(onFlush).toHaveBeenCalledWith(3, 'explorer');
    rerender({ tab: 'explorer' });
    expect(onFlush).toHaveBeenCalledWith(2, 'bubbles');
  });

  it('does not count time while the page is hidden and flushes when it hides', () => {
    const onFlush = vi.fn();
    renderHook(() => useUsageTracker('explorer', onFlush));
    vi.advanceTimersByTime(5_000);
    setVisibility('hidden');
    expect(onFlush).toHaveBeenCalledWith(5, 'explorer');
    onFlush.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('stops its timer on unmount', () => {
    const onFlush = vi.fn();
    const { unmount } = renderHook(() => useUsageTracker('explorer', onFlush));
    unmount();
    onFlush.mockClear();
    vi.advanceTimersByTime(60_000);
    expect(onFlush).not.toHaveBeenCalled();
  });
});
