import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ReadingGame } from '../../src/components/ReadingGame';
import { dayNumber } from '../../src/data/dailyWords';
import {
  READING_LEVEL_UP_AFTER,
  readingRoundOrder,
  wordsOfLevel,
  type ReadingLevel,
  type ReadingWord,
} from '../../src/data/readingWords';
import { READ_REPEAT_REWARD_STARS, READ_WORD_REWARD_STARS } from '../../src/state/progress';
import { sound } from '../../src/utils/sound';
import type { TextStyle } from '../../src/types';

const orderFor = (level: ReadingLevel, read: string[] = []): ReadingWord[] =>
  readingRoundOrder(level, read, dayNumber(new Date()) + level);

interface Callbacks {
  onRewardStars: Mock<(stars: number) => void>;
  onWordRead: Mock<(word: string) => void>;
  onWrongAnswer: Mock<() => void>;
}

/** Keeps the diary in state, like the real app does, so the game sees its own progress. */
function Harness({ initial, textStyle, cb }: { initial: string[]; textStyle: TextStyle; cb: Callbacks }) {
  const [read, setRead] = useState(initial);
  return (
    <ReadingGame
      readWords={read}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onWordRead={(w) => {
        cb.onWordRead(w);
        setRead((r) => (r.includes(w) ? r : [...r, w]));
      }}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}

function setup(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb: Callbacks = {
    onRewardStars: vi.fn<(stars: number) => void>(),
    onWordRead: vi.fn<(word: string) => void>(),
    onWrongAnswer: vi.fn<() => void>(),
  };
  render(<Harness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}

const pictures = () => screen.getAllByRole('button', { name: /^Immagine / });
const rightPicture = () => pictures().find((b) => b.dataset.correct === 'true')!;
const wrongPictures = () => pictures().filter((b) => b.dataset.correct === 'false');
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(sound, 'speak').mockImplementation(() => {});
  vi.spyOn(sound, 'speakInstruction').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('ReadingGame - read and choose', () => {
  it('shows the first word of the easiest level, split in syllables, with three pictures', () => {
    setup();
    const word = orderFor(1)[0];
    const shown = screen.getByRole('img', { name: word.word });
    expect(shown.textContent).toBe(word.syllables.join(''));
    expect(shown.querySelectorAll('span')).toHaveLength(word.syllables.length);
    expect(pictures()).toHaveLength(3);
    expect(rightPicture()).toHaveAccessibleName(`Immagine ${word.emoji}`);
    expect(screen.getByRole('button', { name: 'Parole corte' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('tells the child what to do, out loud, as soon as the game starts', () => {
    setup();
    advance(400);
    expect(sound.speakInstruction).toHaveBeenCalledWith(expect.stringMatching(/Leggi la parola/));
  });

  it('rewards a right answer once, writes the word in the diary and offers the next one', () => {
    const cb = setup();
    const word = orderFor(1)[0];
    fireEvent.click(rightPicture());
    expect(cb.onWordRead).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_WORD_REWARD_STARS);
    expect(screen.getByText(/Nuova parola nel diario/)).toBeInTheDocument();
    expect(screen.getByTestId('diary-count')).toHaveTextContent('1');

    // pictures are locked after the win: no double reward
    pictures().forEach((b) => expect(b).toBeDisabled());
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(screen.getByRole('img', { name: orderFor(1)[1].word })).toBeInTheDocument();
    expect(screen.queryByText(/Nuova parola nel diario/)).not.toBeInTheDocument();
  });

  it('gives a wrong answer a second chance: the picture is greyed out and the syllables are read', () => {
    const cb = setup();
    const word = orderFor(1)[0];
    fireEvent.click(wrongPictures()[0]);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).not.toHaveBeenCalled();
    expect(cb.onWordRead).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/Ascolta le sillabe/);
    expect(wrongPictures().filter((b) => b.hasAttribute('disabled'))).toHaveLength(1);

    // the syllables are read one by one (and highlighted), then the whole word
    advance(0);
    expect(sound.speak).toHaveBeenLastCalledWith(word.syllables[0].toLowerCase(), 0.8, 1.1);
    expect(document.querySelectorAll('[data-active="true"]')).toHaveLength(1);
    advance(750 * word.syllables.length);
    expect(sound.speak).toHaveBeenLastCalledWith(word.word.toLowerCase(), 0.85, 1.1);
    expect(document.querySelectorAll('[data-active="true"]')).toHaveLength(0);

    // picking the same wrong picture again does nothing; the right one wins
    fireEvent.click(wrongPictures().find((b) => b.hasAttribute('disabled'))!);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_WORD_REWARD_STARS);
  });

  it('highlights the syllables one after the other when the word is touched', () => {
    setup();
    const word = orderFor(1)[0];
    fireEvent.click(screen.getByRole('button', { name: /sillaba per sillaba/ }));
    const activeText = () => document.querySelector('[data-active="true"]')?.textContent;
    advance(0);
    expect(activeText()).toBe(word.syllables[0]);
    advance(750);
    expect(activeText()).toBe(word.syllables[1]);
    advance(750);
    expect(activeText()).toBeUndefined();
    expect(sound.speak).toHaveBeenLastCalledWith(word.word.toLowerCase(), 0.85, 1.1);
  });

  it('gives a smaller reward when a word is read again', () => {
    const cb = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Parole corte' })); // stay on this level by hand
    const word = orderFor(1)[0];
    fireEvent.click(rightPicture()); // new word
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    // go through the whole level until the first word comes back
    const levelSize = wordsOfLevel(1).length;
    for (let i = 1; i < levelSize; i++) {
      fireEvent.click(rightPicture());
      fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    }
    expect(screen.getByRole('img', { name: word.word })).toBeInTheDocument();
    cb.onRewardStars.mockClear();
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova parola nel diario/)).not.toBeInTheDocument();
  });

  it('plays unread words before the ones already in the diary', () => {
    const read = wordsOfLevel(1).slice(0, 3).map((w) => w.word);
    setup(read);
    const shown = orderFor(1, read)[0];
    expect(read).not.toContain(shown.word);
    expect(screen.getByRole('img', { name: shown.word })).toBeInTheDocument();
  });
});

describe('ReadingGame - levels', () => {
  it('lets the child pick the length of the words', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Parole lunghe' }));
    expect(screen.getByRole('button', { name: 'Parole lunghe' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Parole corte' })).toHaveAttribute('aria-pressed', 'false');
    const word = orderFor(3)[0];
    expect(word.syllables.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('img', { name: word.word })).toBeInTheDocument();
  });

  it('starts at the level that fits the words already read', () => {
    setup(wordsOfLevel(1).slice(0, READING_LEVEL_UP_AFTER).map((w) => w.word));
    expect(screen.getByRole('button', { name: 'Parole medie' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves up on its own between two words, never in the middle of one', () => {
    const almost = wordsOfLevel(1).slice(0, READING_LEVEL_UP_AFTER - 1).map((w) => w.word);
    setup(almost);
    expect(screen.getByRole('button', { name: 'Parole corte' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(rightPicture()); // the 8th word of the level: now level 2 would be suggested
    expect(screen.getByRole('button', { name: 'Parole corte' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Nuova parola nel diario/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(screen.getByRole('button', { name: 'Parole medie' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the level chosen by hand', () => {
    const almost = wordsOfLevel(1).slice(0, READING_LEVEL_UP_AFTER - 1).map((w) => w.word);
    setup(almost);
    fireEvent.click(screen.getByRole('button', { name: 'Parole corte' }));
    fireEvent.click(rightPicture());
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(screen.getByRole('button', { name: 'Parole corte' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ReadingGame - put in order', () => {
  const openOrder = (cb = setup()) => {
    fireEvent.click(screen.getByRole('button', { name: /Metti in ordine/ }));
    return cb;
  };
  const tiles = () => within(document.body).getAllByRole('button').filter((b) => b.className.includes('border-2') && b.className.includes('h-16'));
  const tileFor = (syl: string) => tiles().find((b) => b.textContent === syl && !b.hasAttribute('disabled'))!;

  it('shows the picture, one empty slot per syllable and the scrambled syllables', () => {
    openOrder();
    const word = orderFor(1)[0];
    expect(screen.getByTestId('syllable-slots').children).toHaveLength(word.syllables.length);
    expect(tiles().map((t) => t.textContent).sort()).toEqual([...word.syllables].sort());
    expect(tiles().map((t) => t.textContent)).not.toEqual(word.syllables);
    expect(screen.getByText(word.emoji)).toBeInTheDocument();
  });

  it('completes the word when the syllables are tapped in the right order', () => {
    const cb = openOrder();
    const word = orderFor(1)[0];
    word.syllables.forEach((syl) => fireEvent.click(tileFor(syl)));
    expect(cb.onWordRead).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_WORD_REWARD_STARS);
    expect(cb.onWrongAnswer).not.toHaveBeenCalled();
    expect(screen.getByText(/Nuova parola nel diario/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prossima parola/ })).toBeInTheDocument();
  });

  it('a wrong syllable is gently refused and, after two mistakes, the right one shines', () => {
    const cb = openOrder();
    const word = orderFor(1)[0];
    const wrong = tiles().find((t) => t.textContent === word.syllables[1])!;
    fireEvent.click(wrong);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/Quasi/);
    expect(document.querySelector('[data-hint="true"]')).toBeNull();

    fireEvent.click(wrong);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(/brilla/);
    expect(document.querySelector('[data-hint="true"]')?.textContent).toBe(word.syllables[0]);
    expect(cb.onRewardStars).not.toHaveBeenCalled();

    // the hint is the right tile: following it finishes the word
    fireEvent.click(document.querySelector('[data-hint="true"]')!);
    expect(document.querySelector('[data-hint="true"]')).toBeNull();
    fireEvent.click(tileFor(word.syllables[1]));
    expect(cb.onWordRead).toHaveBeenCalledWith(word.word);
  });

  it('can start the word again', () => {
    openOrder();
    const word = orderFor(1)[0];
    fireEvent.click(tileFor(word.syllables[0]));
    expect(tiles().filter((t) => t.hasAttribute('disabled'))).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Ricomincia/ }));
    expect(tiles().filter((t) => t.hasAttribute('disabled'))).toHaveLength(0);
  });

  it('tells the word to put together when it starts', () => {
    openOrder();
    advance(400);
    expect(sound.speakInstruction).toHaveBeenLastCalledWith(
      expect.stringContaining(orderFor(1)[0].word.toLowerCase())
    );
  });
});

describe('ReadingGame - text style and diary', () => {
  it('writes the word as chosen by the parents', () => {
    const word = orderFor(1)[0];
    const { unmount } = render(
      <ReadingGame readWords={[]} textStyle="lower" onRewardStars={vi.fn()} onWordRead={vi.fn()} />
    );
    expect(screen.getByRole('img', { name: word.word.toLowerCase() })).toBeInTheDocument();
    unmount();

    render(<ReadingGame readWords={[]} textStyle="cursive" onRewardStars={vi.fn()} onWordRead={vi.fn()} />);
    const shown = screen.getByRole('img', { name: word.word.toLowerCase() });
    expect(shown.className).toContain('font-cursive');
  });

  it('opens the diary with the words read so far', () => {
    const read = wordsOfLevel(1).slice(0, 2).map((w) => w.word);
    setup(read);
    fireEvent.click(screen.getByRole('button', { name: /Diario/ }));
    const dialog = screen.getByRole('dialog', { name: /diario delle parole/ });
    expect(dialog.querySelectorAll('[data-read="true"]')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses big touch targets for every control of the game', () => {
    setup();
    const small = screen
      .getAllByRole('button')
      .filter((b) => !/min-h-14|h-24|h-16/.test(b.className));
    expect(small.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([]);
  });

  it('stops its timers when it is closed', () => {
    const { unmount } = render(
      <ReadingGame readWords={[]} textStyle="upper" onRewardStars={vi.fn()} onWordRead={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /sillaba per sillaba/ }));
    unmount();
    vi.mocked(sound.speak).mockClear();
    advance(5000);
    expect(sound.speak).not.toHaveBeenCalled();
  });
});
