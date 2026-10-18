import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ItalianPractice } from '../../src/components/ItalianPractice';
import { dayNumber } from '../../src/data/dailyWords';
import { directSyllables, gapChoices, gapQuestion, huntQueue, letterName, syllableQueue } from '../../src/data/italianPractice';
import { READING_WORDS, readingRoundOrder } from '../../src/data/readingWords';
import {
  HUNT_REWARD_STARS,
  READ_REPEAT_REWARD_STARS,
  READ_WORD_REWARD_STARS,
  SYLLABLE_REPEAT_REWARD_STARS,
  SYLLABLE_REWARD_STARS,
} from '../../src/state/progress';
import { sound } from '../../src/utils/sound';
import type { TextStyle } from '../../src/types';

interface Callbacks {
  onRewardStars: Mock<(stars: number) => void>;
  onWordRead: Mock<(word: string) => void>;
  onSyllableLearned: Mock<(syllable: string) => void>;
  onRoundComplete: Mock<() => void>;
  onWrongAnswer: Mock<() => void>;
}
const makeCallbacks = (): Callbacks => ({
  onRewardStars: vi.fn<(stars: number) => void>(),
  onWordRead: vi.fn<(word: string) => void>(),
  onSyllableLearned: vi.fn<(syllable: string) => void>(),
  onRoundComplete: vi.fn<() => void>(),
  onWrongAnswer: vi.fn<() => void>(),
});
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const today = () => dayNumber(new Date());

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(sound, 'speak').mockImplementation(() => {});
  vi.spyOn(sound, 'speakParts').mockImplementation(() => {});
  vi.spyOn(sound, 'speakInstruction').mockImplementation(() => {});
  vi.spyOn(sound, 'speakInstructionParts').mockImplementation(() => {});
  vi.spyOn(sound, 'speakEncouragement').mockImplementation(() => {});
  vi.spyOn(sound, 'stopSpeaking').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function Harness({
  readWords = [],
  syllables = [],
  textStyle = 'upper',
  cb,
}: {
  readWords?: string[];
  syllables?: string[];
  textStyle?: TextStyle;
  cb: Callbacks;
}) {
  const [read, setRead] = useState(readWords);
  const [learned, setLearned] = useState(syllables);
  return (
    <ItalianPractice
      readWords={read}
      learnedSyllables={learned}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onWordRead={(w) => {
        cb.onWordRead(w);
        setRead((r) => (r.includes(w) ? r : [...r, w]));
      }}
      onSyllableLearned={(s) => {
        cb.onSyllableLearned(s);
        setLearned((l) => (l.includes(s) ? l : [...l, s]));
      }}
      onRoundComplete={cb.onRoundComplete}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}
function setup(props: Omit<React.ComponentProps<typeof Harness>, 'cb'> = {}) {
  const cb = makeCallbacks();
  render(<Harness {...props} cb={cb} />);
  return cb;
}
const openMode = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));

describe('ItalianPractice: choosing the exercise', () => {
  it('opens on the syllables and offers six exercises, one pressed at a time', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Scegli l\'esercizio' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Sillabe', 'Trova la sillaba', 'Scrivi la sillaba', 'Completa la parola', 'Inizia con…', 'Cerchia le lettere',
    ]);
    expect(within(group).getByRole('button', { name: 'Sillabe' })).toHaveAttribute('aria-pressed', 'true');
    openMode('Completa la parola');
    expect(within(group).getByRole('button', { name: 'Sillabe' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(group).getByRole('button', { name: 'Completa la parola' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Leggi le sillabe', () => {
  it('shows L + A = LA → LAMA for each vowel, and the inverse syllables AL EL IL OL UL', () => {
    setup();
    const rows = within(screen.getByTestId('syllable-rows')).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent('L+A=LA→🦙LAMA');
    expect(rows[4]).toHaveTextContent('L+U=LU→🐺LUPO');
    const inverse = within(screen.getByTestId('inverse-row')).getAllByRole('button');
    expect(inverse.map((b) => b.textContent)).toEqual(['AL', 'EL', 'IL', 'OL', 'UL']);
  });

  it('reads a syllable, its word and whole rows aloud', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la sillaba LI' }));
    expect(sound.speak).toHaveBeenCalledWith('li', expect.any(Number), expect.any(Number));
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la parola LIMONE' }));
    expect(sound.speak).toHaveBeenCalledWith('limone', expect.any(Number), expect.any(Number));
    fireEvent.click(screen.getByRole('button', { name: 'Leggi tutta la fila' }));
    expect(sound.speakParts).toHaveBeenCalledWith(
      directSyllables('L').map((s) => expect.objectContaining({ text: s.toLowerCase() }))
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leggi al contrario' }));
    expect(sound.speakParts).toHaveBeenLastCalledWith(
      ['al', 'el', 'il', 'ol', 'ul'].map((s) => expect.objectContaining({ text: s }))
    );
  });

  it('switches consonant', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Consonante M' }));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('M+A=MA→✋MANO');
    expect(screen.getByRole('button', { name: 'Ascolta la sillaba UM' })).toBeInTheDocument();
  });

  it('follows the text style chosen by the parents', () => {
    setup({ textStyle: 'lower' });
    expect(screen.getByRole('button', { name: 'Ascolta la sillaba LA' })).toHaveTextContent('la');
  });
});

describe('Trova la sillaba', () => {
  const syllableButtons = () => screen.getAllByRole('button', { name: /^Sillaba / });
  const right = () => syllableButtons().find((b) => b.dataset.correct === 'true')!;
  const first = (learned: string[] = []) => syllableQueue('L', 'direct', learned, today())[0];

  it('plays the syllable and shows three written ones, the first being a new one', () => {
    setup();
    openMode('Trova la sillaba');
    expect(syllableButtons()).toHaveLength(3);
    expect(right()).toHaveAccessibleName(`Sillaba ${first()}`);
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/Ascolta la sillaba/) },
      expect.objectContaining({ text: first().toLowerCase() }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la sillaba' }));
    expect(sound.speak).toHaveBeenLastCalledWith(first().toLowerCase(), 0.7, 1.1);
  });

  it('rewards a right answer once, a repeat less, and moves to the next syllable', () => {
    const cb = setup();
    openMode('Trova la sillaba');
    const target = first();
    fireEvent.click(right());
    expect(cb.onSyllableLearned).toHaveBeenCalledWith(target);
    expect(cb.onRewardStars).toHaveBeenCalledWith(SYLLABLE_REWARD_STARS);
    expect(screen.getByText(/Nuova sillaba/)).toBeInTheDocument();
    syllableButtons().forEach((b) => expect(b).toBeDisabled());
    advance(500);
    expect(sound.speak).toHaveBeenLastCalledWith(`Bravissima! ${target.toLowerCase()}`, expect.any(Number), expect.any(Number));
    fireEvent.click(screen.getByRole('button', { name: /Prossima sillaba/ }));
    expect(right()).toHaveAccessibleName(`Sillaba ${syllableQueue('L', 'direct', [], today())[1]}`);
  });

  it('gives only the repeat reward for a syllable already known', () => {
    const cb = setup({ syllables: directSyllables('L') });
    openMode('Trova la sillaba');
    fireEvent.click(right());
    expect(cb.onRewardStars).toHaveBeenCalledWith(SYLLABLE_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova sillaba/)).not.toBeInTheDocument();
  });

  it('disables a wrong answer, counts it and repeats the syllable', () => {
    const cb = setup();
    openMode('Trova la sillaba');
    const wrong = syllableButtons().find((b) => b.dataset.correct === 'false')!;
    fireEvent.click(wrong);
    expect(wrong).toBeDisabled();
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onSyllableLearned).not.toHaveBeenCalled();
    expect(sound.speak).toHaveBeenLastCalledWith(first().toLowerCase(), 0.7, 1.1);
    expect(screen.getByRole('status')).toHaveTextContent(/Quasi/);
  });

  it('practises the inverse syllables too', () => {
    setup();
    openMode('Trova la sillaba');
    fireEvent.click(screen.getByRole('button', { name: 'AL EL IL' }));
    const target = syllableQueue('L', 'inverse', [], today())[0];
    expect(right()).toHaveAccessibleName(`Sillaba ${target}`);
    syllableButtons().forEach((b) => expect(b.textContent).toMatch(/^[AEIOU]L$/));
  });

  it('starts again from the first syllable when the consonant changes', () => {
    setup();
    openMode('Trova la sillaba');
    fireEvent.click(screen.getByRole('button', { name: 'Consonante M' }));
    expect(right()).toHaveAccessibleName(`Sillaba ${syllableQueue('M', 'direct', [], today())[0]}`);
  });
});

describe('Scrivi la sillaba', () => {
  const tile = (letter: string) => screen.getAllByRole('button', { name: `Lettera ${letter}` }).find((b) => !b.hasAttribute('disabled'))!;
  const slots = () => within(screen.getByTestId('letter-slots'));

  it('shows two empty slots and four letter tiles', () => {
    setup();
    openMode('Scrivi la sillaba');
    const target = syllableQueue('L', 'direct', [], today())[0];
    expect(screen.getByTestId('letter-slots').children).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ })).toHaveLength(4);
    expect(target).toHaveLength(2);
  });

  it('builds the syllable in order, rewards it and says it', () => {
    const cb = setup();
    openMode('Scrivi la sillaba');
    const target = syllableQueue('L', 'direct', [], today())[0];
    fireEvent.click(tile(target[0]));
    expect(slots().queryByText(target[0])).toBeInTheDocument();
    expect(cb.onSyllableLearned).not.toHaveBeenCalled();
    fireEvent.click(tile(target[1]));
    expect(cb.onSyllableLearned).toHaveBeenCalledWith(target);
    expect(cb.onRewardStars).toHaveBeenCalledWith(SYLLABLE_REWARD_STARS);
    expect(screen.getByText(/Nuova sillaba/)).toBeInTheDocument();
    advance(500);
    expect(sound.speak).toHaveBeenLastCalledWith(`Bravissima! ${target.toLowerCase()}`, expect.any(Number), expect.any(Number));
  });

  it('writes inverse syllables vowel first', () => {
    const cb = setup();
    openMode('Scrivi la sillaba');
    fireEvent.click(screen.getByRole('button', { name: 'AL EL IL' }));
    const target = syllableQueue('L', 'inverse', [], today())[0];
    fireEvent.click(tile(target[1])); // the consonant first is wrong
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    fireEvent.click(tile(target[0]));
    fireEvent.click(tile(target[1]));
    expect(cb.onSyllableLearned).toHaveBeenCalledWith(target);
  });

  it('lights up the next letter after two mistakes and lets the child start over', () => {
    setup();
    openMode('Scrivi la sillaba');
    const target = syllableQueue('L', 'direct', [], today())[0];
    const wrongLetter = screen
      .getAllByRole('button', { name: /^Lettera [AEIOU]$/ })
      .find((b) => b.textContent !== target[0] && b.textContent !== target[1] && !b.hasAttribute('data-hint'))!;
    fireEvent.click(wrongLetter);
    expect(screen.getByRole('status')).toHaveTextContent(/Quasi/);
    fireEvent.click(wrongLetter);
    expect(screen.getByRole('status')).toHaveTextContent(/Ti aiuto io/);
    expect(tile(target[0])).toHaveAttribute('data-hint', 'true');
    fireEvent.click(tile(target[0]));
    fireEvent.click(screen.getByRole('button', { name: /Ricomincia/ }));
    expect(tile(target[0])).not.toHaveAttribute('data-hint');
    expect(within(screen.getByTestId('letter-slots')).queryByText(target[0])).not.toBeInTheDocument();
  });
});

describe('Completa la parola', () => {
  const syllableButtons = () => screen.getAllByRole('button', { name: /^Sillaba / });
  const right = () => syllableButtons().find((b) => b.dataset.correct === 'true')!;
  const firstWord = (read: string[] = []) => readingRoundOrder(1, read, today())[0];

  it('hides one syllable of the word and offers three syllables', () => {
    setup();
    openMode('Completa la parola');
    const word = firstWord();
    const q = gapQuestion(word, 0);
    expect(syllableButtons()).toHaveLength(3);
    expect(right()).toHaveAccessibleName(`Sillaba ${q.missing}`);
    expect(screen.getByTestId('gap-slot')).toHaveTextContent('…');
    expect(screen.getByTestId('gap-word')).toHaveAccessibleName(/Parola da completare/);
    // the answer is not given away by the page text
    expect(screen.getByTestId('gap-word')).not.toHaveTextContent(word.word);
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/Completa la parola/) },
      expect.objectContaining({ text: word.word.toLowerCase() }),
    ]);
  });

  it('fills the gap, adds the word to the diary and rewards it', () => {
    const cb = setup();
    openMode('Completa la parola');
    const word = firstWord();
    fireEvent.click(right());
    expect(screen.getByTestId('gap-slot')).toHaveTextContent(gapQuestion(word, 0).missing);
    expect(cb.onWordRead).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_WORD_REWARD_STARS);
    expect(screen.getByText(/Nuova parola nel diario/)).toBeInTheDocument();
    expect(screen.queryByTestId('gap-choices')).not.toBeInTheDocument();
    advance(500);
    expect(sound.speak).toHaveBeenLastCalledWith(`Bravissima! ${word.word.toLowerCase()}`, expect.any(Number), expect.any(Number));
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(screen.getByTestId('gap-slot')).toHaveTextContent('…');
  });

  it('rewards less for a word already in the diary', () => {
    const allShort = READING_WORDS.filter((w) => w.level === 1).map((w) => w.word);
    const cb = setup({ readWords: allShort });
    openMode('Completa la parola');
    fireEvent.click(screen.getByRole('button', { name: 'Parole corte' }));
    const word = readingRoundOrder(1, allShort, today())[0];
    fireEvent.click(right());
    expect(cb.onWordRead).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(READ_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova parola nel diario/)).not.toBeInTheDocument();
  });

  it('shows the wrong syllables as unavailable and reads the word again', () => {
    const cb = setup();
    openMode('Completa la parola');
    const wrong = syllableButtons().find((b) => b.dataset.correct === 'false')!;
    fireEvent.click(wrong);
    expect(wrong).toBeDisabled();
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onWordRead).not.toHaveBeenCalled();
    expect(sound.speak).toHaveBeenLastCalledWith(firstWord().word.toLowerCase(), 0.8, 1.1);
    expect(screen.getByRole('status')).toHaveTextContent(/Quasi/);
  });

  it('changes the word length with the level buttons', () => {
    setup();
    openMode('Completa la parola');
    fireEvent.click(screen.getByRole('button', { name: 'Parole lunghe' }));
    const word = readingRoundOrder(3, [], today())[0];
    expect(right()).toHaveAccessibleName(`Sillaba ${gapQuestion(word, 0).missing}`);
  });

  it('uses the same readable choices the data module computes', () => {
    setup();
    openMode('Completa la parola');
    const q = gapQuestion(firstWord(), 0);
    syllableButtons().forEach((b) => expect(b.textContent).toHaveLength(q.missing.length));
    expect(gapChoices(q)).toContain(q.missing);
  });
});

describe('Inizia con…', () => {
  const pictures = () => within(screen.getByTestId('picture-grid')).getAllByRole('button');
  const starting = () => pictures().filter((b) => b.dataset.starts === 'true');
  const others = () => pictures().filter((b) => b.dataset.starts === 'false');

  it('shows six pictures for the letter L and asks for the ones that start with it', () => {
    setup();
    openMode('Inizia con…');
    expect(pictures()).toHaveLength(6);
    expect(starting()).toHaveLength(3);
    expect(screen.getByTestId('target-letter')).toHaveTextContent('L');
    advance(400);
    expect(sound.speakInstruction).toHaveBeenCalledWith(expect.stringContaining(letterName('L')));
  });

  it('turns circles green for right pictures and finishes the round when all are found', () => {
    const cb = setup();
    openMode('Inizia con…');
    const [a, b, c] = starting();
    fireEvent.click(a);
    expect(screen.getAllByTestId('circle-green')).toHaveLength(1);
    expect(a).toBeDisabled();
    expect(cb.onRoundComplete).not.toHaveBeenCalled();
    fireEvent.click(b);
    fireEvent.click(c);
    expect(screen.getAllByTestId('circle-green')).toHaveLength(3);
    expect(cb.onRoundComplete).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).toHaveBeenCalledWith(HUNT_REWARD_STARS);
    expect(screen.getByText(/Tutte trovate/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Altri disegni/ }));
    expect(screen.queryByText(/Tutte trovate/)).not.toBeInTheDocument();
    expect(starting()).toHaveLength(3);
  });

  it('counts a wrong picture, greys it out and lights up a right one after two mistakes', () => {
    const cb = setup();
    openMode('Inizia con…');
    const [w1, w2] = others();
    fireEvent.click(w1);
    expect(w1).toBeDisabled();
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('circle-green')).not.toBeInTheDocument();
    expect(starting().some((s) => s.hasAttribute('data-hint'))).toBe(false);
    fireEvent.click(w2);
    expect(starting().filter((s) => s.hasAttribute('data-hint'))).toHaveLength(1);
    expect(cb.onRoundComplete).not.toHaveBeenCalled();
  });

  it('speaks the name of every picture touched', () => {
    setup();
    openMode('Inizia con…');
    fireEvent.click(starting()[0]);
    expect(sound.speak).toHaveBeenCalledWith(expect.stringMatching(/^[a-zàèéìòù]+$/), expect.any(Number), expect.any(Number));
  });

  it('can mix all the letters', () => {
    setup();
    openMode('Inizia con…');
    fireEvent.click(screen.getByRole('button', { name: 'Tutte' }));
    expect(screen.getByRole('button', { name: 'Tutte' })).toHaveAttribute('aria-pressed', 'true');
    expect(starting()).toHaveLength(3);
    const letter = screen.getByTestId('target-letter').textContent!;
    expect(letter).toMatch(/^[A-Z]$/);
  });
});

describe('Cerchia le lettere', () => {
  const lettersOfWord = () => within(screen.getByTestId('hunt-word')).getAllByRole('button');
  const first = () => huntQueue('L', 1, today())[0];

  it('shows the word as letter buttons and the letter to circle', () => {
    setup();
    openMode('Cerchia le lettere');
    const item = first();
    expect(lettersOfWord().map((b) => b.textContent).join('')).toBe(item.word.word);
    expect(screen.getByTestId('target-letter')).toHaveTextContent('L');
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringContaining('elle') },
      expect.objectContaining({ text: item.word.word.toLowerCase() }),
    ]);
  });

  it('circles the right letters and completes the round when all are found', () => {
    const cb = setup();
    openMode('Cerchia le lettere');
    const mine = lettersOfWord().filter((b) => b.textContent === 'L');
    expect(mine.length).toBeGreaterThan(0);
    mine.forEach((b, i) => {
      expect(cb.onRoundComplete).not.toHaveBeenCalled();
      fireEvent.click(b);
      expect(b).toHaveAttribute('data-circled', 'true');
      if (i + 1 < mine.length) expect(screen.getByText(`Trovate ${i + 1} su ${mine.length}`)).toBeInTheDocument();
    });
    expect(cb.onRoundComplete).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).toHaveBeenCalledWith(HUNT_REWARD_STARS);
    expect(screen.getByText(/Tutte cerchiate/)).toBeInTheDocument();
    advance(600);
    expect(sound.speak).toHaveBeenLastCalledWith(
      expect.stringContaining(`ci sono ${mine.length}`)
    );
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(lettersOfWord().map((b) => b.textContent).join('')).toBe(huntQueue('L', 1, today())[1].word.word);
  });

  it('marks a wrong letter as a mistake and shines on a right one after two', () => {
    const cb = setup();
    openMode('Cerchia le lettere');
    const wrong = lettersOfWord().filter((b) => b.textContent !== 'L');
    fireEvent.click(wrong[0]);
    expect(wrong[0]).toBeDisabled();
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/Quasi/);
    fireEvent.click(wrong[1]);
    expect(lettersOfWord().filter((b) => b.hasAttribute('data-hint'))).toHaveLength(1);
    expect(lettersOfWord().find((b) => b.hasAttribute('data-hint'))).toHaveTextContent('L');
    expect(cb.onRoundComplete).not.toHaveBeenCalled();
  });

  it('can search any letter of each word, and a different letter on request', () => {
    setup();
    openMode('Cerchia le lettere');
    fireEvent.click(screen.getByRole('button', { name: 'Tutte' }));
    const letter = screen.getByTestId('target-letter').textContent!;
    expect(lettersOfWord().some((b) => b.textContent === letter)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Lettera da cercare M' }));
    expect(screen.getByTestId('target-letter')).toHaveTextContent('M');
    expect(lettersOfWord().some((b) => b.textContent === 'M')).toBe(true);
  });

  it('writes the word in the style chosen by the parents', () => {
    setup({ textStyle: 'lower' });
    openMode('Cerchia le lettere');
    expect(lettersOfWord().map((b) => b.textContent).join('')).toBe(first().word.word.toLowerCase());
    const l = lettersOfWord().find((b) => b.getAttribute('aria-label') === 'Lettera L')!;
    fireEvent.click(l);
    expect(l).toHaveAttribute('data-circled', 'true');
    expect(l).toHaveTextContent('l');
  });
});
