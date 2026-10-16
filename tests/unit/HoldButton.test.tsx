import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HoldButton } from '../../src/components/HoldButton';

function setup(holdMs = 3000) {
  vi.useFakeTimers();
  const onHoldComplete = vi.fn();
  render(
    <HoldButton ariaLabel="Area genitori" onHoldComplete={onHoldComplete} holdMs={holdMs}>
      <span>Apri</span>
    </HoldButton>
  );
  return { onHoldComplete, button: screen.getByRole('button', { name: 'Area genitori' }) };
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('HoldButton', () => {
  it('does nothing on a simple tap or click, and explains what to do', () => {
    const { onHoldComplete, button } = setup();
    fireEvent.click(button);
    expect(onHoldComplete).not.toHaveBeenCalled();
    fireEvent.pointerDown(button);
    wait(400);
    fireEvent.pointerUp(button);
    expect(screen.getByRole('status')).toHaveTextContent('Tieni premuto per 3 secondi');
    wait(5000);
    expect(onHoldComplete).not.toHaveBeenCalled();
  });

  it('hides the hint after a few seconds', () => {
    const { button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    expect(screen.getByRole('status')).toBeInTheDocument();
    wait(2600);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fires once after the button has been held long enough', () => {
    const { onHoldComplete, button } = setup();
    fireEvent.pointerDown(button);
    wait(2900);
    expect(onHoldComplete).not.toHaveBeenCalled();
    wait(200);
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(button);
    wait(5000);
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('is cancelled when the finger slides away', () => {
    const { onHoldComplete, button } = setup();
    fireEvent.pointerDown(button);
    wait(1500);
    fireEvent.pointerLeave(button);
    wait(5000);
    expect(onHoldComplete).not.toHaveBeenCalled();
  });

  it('shows the progress while holding', () => {
    const { button } = setup();
    expect(screen.getByTestId('hold-progress').style.width).toBe('0%');
    fireEvent.pointerDown(button);
    expect(screen.getByTestId('hold-progress').style.width).toBe('100%');
    fireEvent.pointerUp(button);
    expect(screen.getByTestId('hold-progress').style.width).toBe('0%');
  });

  it('works with the keyboard too (hold Enter or Space)', () => {
    const { onHoldComplete, button } = setup(1000);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    wait(1100);
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button, { key: 'Enter' });

    fireEvent.keyDown(button, { key: ' ' });
    wait(300);
    fireEvent.keyUp(button, { key: ' ' });
    wait(2000);
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
  });

  it('does not open the context menu on a long touch', () => {
    const { button } = setup();
    const notPrevented = fireEvent.contextMenu(button);
    expect(notPrevented).toBe(false);
  });

  it('cleans up its timers when removed', () => {
    const { onHoldComplete, button } = setup();
    fireEvent.pointerDown(button);
    wait(1000);
    screen.getByRole('button').remove();
    cleanupTimers();
    expect(onHoldComplete).not.toHaveBeenCalled();
  });
});

function cleanupTimers() {
  act(() => {
    vi.clearAllTimers();
  });
}
