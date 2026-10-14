import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LetterExplorer } from '../../src/components/LetterExplorer';
import { ALPHABET_DATA } from '../../src/data/alphabet';

function setup() {
  const props = {
    letters: ALPHABET_DATA,
    masteredLetters: ['A'],
    tracedUppercase: ['A'],
    tracedLowercase: [],
    onSelectLetterToTrace: vi.fn(),
    onPlayGameWithLetter: vi.fn(),
  };
  render(<LetterExplorer {...props} />);
  return props;
}

describe('LetterExplorer', () => {
  it('lists the 26 letters', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /Scrivi/ })).toHaveLength(26);
  });

  it('filters by level', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Livello 1: Vocali/ }));
    expect(screen.getAllByRole('button', { name: /Scrivi/ })).toHaveLength(ALPHABET_DATA.filter((l) => l.level === 1).length);
    fireEvent.click(screen.getByRole('button', { name: /Tutte le Lettere/ }));
    expect(screen.getAllByRole('button', { name: /Scrivi/ })).toHaveLength(26);
  });

  it('marks mastered letters', () => {
    setup();
    expect(screen.getAllByTitle('Lettera completata!')).toHaveLength(1);
  });

  it('sends the child to the tracing page for the chosen letter', () => {
    const { onSelectLetterToTrace } = setup();
    fireEvent.click(screen.getAllByRole('button', { name: /Scrivi/ })[1]);
    expect(onSelectLetterToTrace).toHaveBeenCalledWith(ALPHABET_DATA[1]);
  });
});
