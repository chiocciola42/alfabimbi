import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QUIZ_CHOICES, WordMatchQuiz } from '../../src/components/WordMatchQuiz';
import { CURATED_SPELL_WORDS as SPELL_WORDS } from '../../src/data/dailyWords';
import { ALPHABET_DATA } from '../../src/data/alphabet';

function setup() {
  const props = { onRewardStars: vi.fn(), onCompleteRound: vi.fn(), onWrongAnswer: vi.fn() };
  render(<WordMatchQuiz letters={ALPHABET_DATA} spellWords={SPELL_WORDS} {...props} />);
  return props;
}

const first = ALPHABET_DATA[0]; // A come Ape

describe('WordMatchQuiz - initial letter', () => {
  it('shows the word and three distinct options including the right one', () => {
    setup();
    expect(screen.getByRole('heading', { name: first.word.toUpperCase() })).toBeInTheDocument();
    const options = screen
      .getAllByRole('button')
      .filter((b) => /^[A-Z]$/.test(b.textContent ?? ''))
      .map((b) => b.textContent);
    expect(options).toHaveLength(3);
    expect(new Set(options).size).toBe(3);
    expect(options).toContain(first.letter);
  });

  it('rewards a correct answer once and moves to the next word', () => {
    const { onRewardStars, onCompleteRound, onWrongAnswer } = setup();
    fireEvent.click(screen.getByRole('button', { name: first.letter }));
    expect(onRewardStars).toHaveBeenCalledWith(3);
    expect(onCompleteRound).toHaveBeenCalledWith('quiz');
    expect(onWrongAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(/Esatto!/)).toBeInTheDocument();

    // the buttons are locked after a correct answer: no double reward
    fireEvent.click(screen.getByRole('button', { name: first.letter }));
    expect(onRewardStars).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Prossima Parola/ }));
    expect(screen.getByRole('heading', { name: ALPHABET_DATA[1].word.toUpperCase() })).toBeInTheDocument();
  });

  it('reports a wrong answer without rewarding, then allows retrying', () => {
    const { onRewardStars, onCompleteRound, onWrongAnswer } = setup();
    const wrong = screen
      .getAllByRole('button')
      .find((b) => /^[A-Z]$/.test(b.textContent ?? '') && b.textContent !== first.letter)!;
    fireEvent.click(wrong);
    expect(onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(onRewardStars).not.toHaveBeenCalled();
    expect(onCompleteRound).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Riprova ora/ }));
    fireEvent.click(screen.getByRole('button', { name: first.letter }));
    expect(onRewardStars).toHaveBeenCalledWith(3);
  });
});

describe('WordMatchQuiz - spelling', () => {
  const target = SPELL_WORDS[0].word; // APE

  const openSpelling = () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: /Componi la Parolina/ }));
    return props;
  };

  it('offers exactly the letters of the word', () => {
    openSpelling();
    const tiles = screen
      .getAllByRole('button')
      .filter((b) => /^[A-Z]$/.test(b.textContent ?? ''))
      .map((b) => b.textContent)
      .sort();
    expect(tiles).toEqual(target.split('').sort());
  });

  it('completes the word when letters are tapped in order and rewards 5 stars', () => {
    const { onRewardStars, onCompleteRound } = openSpelling();
    for (const ch of target) {
      fireEvent.click(screen.getAllByRole('button', { name: ch })[0]);
    }
    expect(onRewardStars).toHaveBeenCalledWith(5);
    expect(onCompleteRound).toHaveBeenCalledWith('spelling');
    expect(screen.getByText(new RegExp(`Hai scritto "${target}"`))).toBeInTheDocument();
  });

  it('ignores letters tapped out of order', () => {
    const { onRewardStars } = openSpelling();
    fireEvent.click(screen.getByRole('button', { name: 'E' })); // APE starts with A
    fireEvent.click(screen.getByRole('button', { name: 'P' }));
    expect(onRewardStars).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button').filter((b) => /^[A-Z]$/.test(b.textContent ?? ''))).toHaveLength(3);
  });

  it('can be restarted midway', () => {
    openSpelling();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(screen.getAllByRole('button').filter((b) => /^[A-Z]$/.test(b.textContent ?? ''))).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Ricomincia parola/ }));
    expect(screen.getAllByRole('button').filter((b) => /^[A-Z]$/.test(b.textContent ?? ''))).toHaveLength(3);
  });

  it('handles words with repeated letters (CASA)', () => {
    const { onCompleteRound } = openSpelling();
    // advance to the "CASA" entry
    const casaIdx = SPELL_WORDS.findIndex((w: { word: string }) => w.word === 'CASA');
    for (let i = 0; i < casaIdx; i++) {
      for (const ch of SPELL_WORDS[i].word) fireEvent.click(screen.getAllByRole('button', { name: ch })[0]);
      fireEvent.click(screen.getByRole('button', { name: /Prossima Parola/ }));
    }
    onCompleteRound.mockClear();
    for (const ch of 'CASA') fireEvent.click(screen.getAllByRole('button', { name: ch })[0]);
    expect(onCompleteRound).toHaveBeenCalledTimes(1);
  });
});

describe('WordMatchQuiz - text style and touch', () => {
  it('writes the word as chosen by the parents', () => {
    render(<WordMatchQuiz letters={ALPHABET_DATA} spellWords={SPELL_WORDS} onRewardStars={vi.fn()} textStyle="lower" />);
    expect(screen.getByRole('heading', { name: first.word.toLowerCase() })).toBeInTheDocument();
  });

  it('shows few choices, each one big enough for a small finger', () => {
    setup();
    const options = screen.getAllByRole('button').filter((b) => /^[A-Z]$/.test(b.textContent ?? ''));
    expect(options).toHaveLength(QUIZ_CHOICES);
    options.forEach((b) => expect(b.className).toContain('h-24'));
    screen.getAllByRole('button').forEach((b) => expect(b.className, b.textContent ?? '').toMatch(/min-h-14|h-24|h-14|w-14/));
  });

  it('has a speaker for the question', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Ascolta la domanda' })).toBeInTheDocument();
  });
});
