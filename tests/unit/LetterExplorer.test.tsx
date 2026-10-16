import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LetterExplorer } from '../../src/components/LetterExplorer';
import { ALPHABET_DATA } from '../../src/data/alphabet';
import { sound } from '../../src/utils/sound';
import type { TextStyle } from '../../src/types';

function setup(textStyle?: TextStyle) {
  const props = {
    letters: ALPHABET_DATA,
    masteredLetters: ['A'],
    tracedUppercase: ['A'],
    tracedLowercase: [],
    onSelectLetterToTrace: vi.fn(),
    onPlayGameWithLetter: vi.fn(),
  };
  render(<LetterExplorer {...props} textStyle={textStyle} />);
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

describe('LetterExplorer - less text, more voice', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads the instructions out loud instead of explaining them in a paragraph', () => {
    const instruction = vi.spyOn(sound, 'speakInstruction').mockImplementation(() => {});
    setup();
    expect(screen.queryByText(/amico speciale/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta le istruzioni' }));
    expect(instruction).toHaveBeenCalledWith(expect.stringMatching(/Tocca una lettera/), 0.9, 1.1);
  });

  it('has a speaker on every letter card', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    setup();
    const speakers = screen.getAllByRole('button', { name: 'Ascolta pronuncia' });
    expect(speakers).toHaveLength(26);
    fireEvent.click(speakers[0]);
    expect(speak).toHaveBeenCalledWith(`A come ${ALPHABET_DATA[0].word}!`, 0.9, 1.1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reads the letter and its fun fact when a card is opened, and again on request', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByText(ALPHABET_DATA[0].word.toUpperCase()));
    expect(speak).toHaveBeenCalledWith(
      `${ALPHABET_DATA[0].phonics}. ${ALPHABET_DATA[0].funFact}`,
      0.88,
      1.1
    );
    speak.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la curiosità' }));
    expect(speak).toHaveBeenCalledWith(ALPHABET_DATA[0].funFact, 0.9, 1.1);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can listen to the other words of the letter', () => {
    const speak = vi.spyOn(sound, 'speak').mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByText(ALPHABET_DATA[0].word.toUpperCase()));
    const sample = ALPHABET_DATA[0].sampleWords[1];
    fireEvent.click(screen.getByRole('button', { name: `Ascolta ${sample.word.toUpperCase()}` }));
    expect(speak).toHaveBeenLastCalledWith(sample.word, 0.85, 1.15);
  });
});

describe('LetterExplorer - text style', () => {
  it('writes the words in capital letters by default', () => {
    setup();
    expect(screen.getByText(ALPHABET_DATA[0].word.toUpperCase())).toBeInTheDocument();
    expect(screen.getByText(ALPHABET_DATA[0].phonics.toUpperCase())).toBeInTheDocument();
  });

  it('follows the style chosen by the parents', () => {
    setup('lower');
    expect(screen.getByText(ALPHABET_DATA[0].word.toLowerCase())).toBeInTheDocument();
  });

  it('uses the school cursive typeface', () => {
    setup('cursive');
    const word = screen.getByText(ALPHABET_DATA[0].word.toLowerCase());
    expect(word.className).toContain('font-cursive');
  });
});

describe('LetterExplorer - touch targets', () => {
  it('makes the filters, the write buttons and the speakers at least 56px', () => {
    setup();
    const controls = [
      ...screen.getAllByRole('button', { name: /Livello|Tutte/ }),
      ...screen.getAllByRole('button', { name: /Scrivi/ }),
      ...screen.getAllByRole('button', { name: 'Ascolta pronuncia' }),
    ];
    expect(controls.length).toBeGreaterThan(30);
    controls.forEach((b) => expect(b.className, b.textContent ?? '').toContain('min-h-14'));
  });
});
