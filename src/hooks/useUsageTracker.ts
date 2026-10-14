import { useEffect, useRef } from 'react';
import type { TabId } from '../types';

const TICK_MS = 1000;
const FLUSH_EVERY_SECONDS = 10;

/**
 * Measures the seconds the page is actually visible on a given tab and reports them in batches
 * (every few seconds, on tab change, when the page is hidden and on unmount).
 */
export function useUsageTracker(tab: TabId, onFlush: (seconds: number, tab: TabId) => void) {
  const pending = useRef(0);
  const flushRef = useRef(onFlush);
  flushRef.current = onFlush;

  useEffect(() => {
    const flush = () => {
      if (pending.current > 0) {
        const secs = pending.current;
        pending.current = 0;
        flushRef.current(secs, tab);
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pending.current += 1;
      if (pending.current >= FLUSH_EVERY_SECONDS) flush();
    }, TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [tab]);
}
