import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeakButton } from '../../src/components/SpeakButton';
import { sound } from '../../src/utils/sound';

afterEach(() => vi.restoreAllMocks());

describe('SpeakButton', () => {
  it('reads the text out loud when pressed', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<SpeakButton text="La luna è nel cielo" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta' }));
    expect(speak).toHaveBeenCalledWith('La luna è nel cielo', 0.9, 1.1);
  });

  it('can remember the text as the instruction to repeat', () => {
    const instruction = vi.spyOn(sound, 'speakInstruction').mockImplementation(() => {});
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    render(<SpeakButton text="Tocca la lettera" asInstruction label="Ascolta le istruzioni" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta le istruzioni' }));
    expect(instruction).toHaveBeenCalledWith('Tocca la lettera', 0.9, 1.1);
    expect(speak).not.toHaveBeenCalled();
  });

  it('does not trigger the card it sits in', () => {
    vi.spyOn(sound, 'speak').mockImplementation(() => {});
    const onCard = vi.fn();
    render(
      <div onClick={onCard}>
        <SpeakButton text="ciao" />
      </div>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onCard).not.toHaveBeenCalled();
  });

  it('is a big touch target, with an optional visible label', () => {
    const { rerender } = render(<SpeakButton text="ciao" />);
    expect(screen.getByRole('button').className).toContain('min-h-14');
    expect(screen.getByRole('button').classList.contains('w-14')).toBe(true);
    expect(screen.queryByText('Ascolta')).not.toBeInTheDocument();
    rerender(<SpeakButton text="ciao" withLabel />);
    expect(screen.getByText('Ascolta')).toBeInTheDocument();
    expect(screen.getByRole('button').classList.contains('w-14')).toBe(false);
  });
});
