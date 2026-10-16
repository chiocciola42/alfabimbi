import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PARENT_HOLD_MS } from '../utils/ui';

interface HoldButtonProps {
  /** Called once the button has been held for `holdMs`. */
  onHoldComplete: () => void;
  holdMs?: number;
  ariaLabel: string;
  title?: string;
  /** Shown for a moment when the button is released too early. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Button that only works when held down (a simple "parents only" gate: a quick tap by a child does
 * nothing but explain what to do). Works with mouse, touch, pen and the keyboard (hold Enter / Space).
 */
export const HoldButton: React.FC<HoldButtonProps> = ({
  onHoldComplete,
  holdMs = PARENT_HOLD_MS,
  ariaLabel,
  title,
  hint = 'Tieni premuto per 3 secondi',
  className = '',
  children,
}) => {
  const [holding, setHolding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onHoldComplete);
  onCompleteRef.current = onHoldComplete;

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [clearTimers]
  );

  const start = () => {
    if (holdTimer.current) return;
    setShowHint(false);
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      onCompleteRef.current();
    }, holdMs);
  };

  const cancel = () => {
    if (!holdTimer.current) return;
    clearTimers();
    setHolding(false);
    setShowHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowHint(false), 2500);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        title={title ?? hint}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') cancel();
        }}
        onBlur={cancel}
        className={`relative overflow-hidden select-none ${className}`}
      >
        {/* The bar fills up while the button is held */}
        <span
          aria-hidden="true"
          data-testid="hold-progress"
          className="absolute inset-y-0 left-0 bg-amber-300/60 pointer-events-none"
          style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${holdMs}ms linear` : 'none' }}
        />
        <span className="relative flex items-center gap-2">{children}</span>
      </button>
      {showHint && (
        <span
          role="status"
          className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl bg-slate-800 text-white text-xs font-bold px-3 py-2 shadow-lg text-center"
        >
          {hint}
        </span>
      )}
    </span>
  );
};
