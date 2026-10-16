import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnglishListen } from '../../src/components/EnglishListen';
import { EnglishAlphabet } from '../../src/components/EnglishAlphabet';
import { EnglishFamilies } from '../../src/components/EnglishFamilies';
import { dayNumber } from '../../src/data/dailyWords';
import { ENGLISH_WORLDS, englishRoundOrder } from '../../src/data/englishWords';
import { ENGLISH_ALPHABET, englishLetterOrder } from '../../src/data/englishAlphabet';
import { WORD_FAMILIES, familyRoundOrder } from '../../src/data/englishFamilies';
import {
  ENGLISH_FAMILY_REWARD_STARS,
  ENGLISH_LETTER_REWARD_STARS,
  ENGLISH_REPEAT_REWARD_STARS,
  ENGLISH_WORD_REWARD_STARS,
} from '../../src/state/progress';
import { sound } from '../../src/utils/sound';
import type { TextStyle } from '../../src/types';

interface Callbacks {
  onRewardStars: Mock<(stars: number) => void>;
  onDone: Mock<(item: string) => void>;
  onWrongAnswer: Mock<() => void>;
}

const makeCallbacks = (): Callbacks => ({
  onRewardStars: vi.fn<(stars: number) => void>(),
  onDone: vi.fn<(item: string) => void>(),
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
  vi.spyOn(sound, 'speakEnglish').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// ------------------------------------------------------------------ vocabulary

function ListenHarness({ initial, textStyle = 'upper', cb }: { initial: string[]; textStyle?: TextStyle; cb: Callbacks }) {
  const [learned, setLearned] = useState(initial);
  return (
    <EnglishListen
      learnedWords={learned}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onWordLearned={(w) => {
        cb.onDone(w);
        setLearned((l) => (l.includes(w) ? l : [...l, w]));
      }}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}

function setupListen(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb = makeCallbacks();
  render(<ListenHarness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}

const pictures = () => screen.getAllByRole('button', { name: /^Immagine / });
const rightPicture = () => pictures().find((b) => b.dataset.correct === 'true')!;
const wrongPictures = () => pictures().filter((b) => b.dataset.correct === 'false');

describe('EnglishListen', () => {
  it('starts from the first world with three pictures and the English word hidden', () => {
    setupListen();
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    expect(pictures()).toHaveLength(3);
    expect(rightPicture()).toHaveAccessibleName(`Immagine ${word.emoji}`);
    expect(screen.getByRole('button', { name: /^Colori: 0 parole su 8/ })).toHaveAttribute('aria-pressed', 'true');
    // nothing to read before the word is found
    expect(screen.queryByText(word.word, { exact: false })).not.toBeInTheDocument();
  });

  it('says what to do and then the English word, as one instruction', () => {
    setupListen();
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/Ascolta e tocca/) },
      expect.objectContaining({ text: word.word, lang: 'en-GB' }),
    ]);
  });

  it('plays the word again from the big listen button', () => {
    setupListen();
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la parola inglese' }));
    expect(sound.speakEnglish).toHaveBeenCalledWith(word.word);
  });

  it('rewards a right answer once, shows the written word and offers the next one', () => {
    const cb = setupListen();
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    fireEvent.click(rightPicture());
    expect(cb.onDone).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_WORD_REWARD_STARS);
    expect(screen.getByText(/Nuova parola inglese/)).toBeInTheDocument();
    expect(screen.getByText(word.word.toUpperCase())).toBeInTheDocument();

    pictures().forEach((b) => expect(b).toBeDisabled());
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledTimes(1);

    advance(500);
    expect(sound.speakParts).toHaveBeenCalledWith([
      { text: 'Bravissima!' },
      expect.objectContaining({ text: word.word, lang: 'en-GB' }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    const next = englishRoundOrder('colors', [], today() + 'colors'.length)[1];
    expect(rightPicture()).toHaveAccessibleName(`Immagine ${next.emoji}`);
    expect(screen.queryByText(/Nuova parola inglese/)).not.toBeInTheDocument();
  });

  it('writes the word in the style chosen by the parents', () => {
    setupListen([], 'lower');
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    fireEvent.click(rightPicture());
    expect(screen.getByText(word.word)).toBeInTheDocument();
  });

  it('gives a wrong answer a second chance: the picture is greyed out and the word is repeated', () => {
    const cb = setupListen();
    const word = englishRoundOrder('colors', [], today() + 'colors'.length)[0];
    fireEvent.click(wrongPictures()[0]);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).not.toHaveBeenCalled();
    expect(cb.onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/Ascolta ancora/);
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(word.word);
    const greyed = wrongPictures().filter((b) => b.hasAttribute('disabled'));
    expect(greyed).toHaveLength(1);

    fireEvent.click(greyed[0]); // no second penalty for the same picture
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_WORD_REWARD_STARS);
  });

  it('gives a smaller reward for a word that was already learned', () => {
    const everything = ENGLISH_WORLDS.flatMap((w) => w.words.map((x) => x.word));
    const cb = setupListen(everything); // the whole vocabulary is known: every word is a repetition
    fireEvent.click(rightPicture());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova parola inglese/)).not.toBeInTheDocument();
  });

  it('opens on the first world with words left, and lets the child change world', () => {
    setupListen(ENGLISH_WORLDS[0].words.map((w) => w.word));
    expect(screen.getByRole('button', { name: /^Numeri: 0 parole su 8/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /^Animali: / }));
    const word = englishRoundOrder('animals', [], today() + 'animals'.length)[0];
    expect(rightPicture()).toHaveAccessibleName(`Immagine ${word.emoji}`);
    pictures().forEach((b) => {
      const world = ENGLISH_WORLDS[2].words.map((w) => `Immagine ${w.emoji}`);
      expect(world).toContain(b.getAttribute('aria-label'));
    });
  });

  it('shows how many words are learned in each world', () => {
    setupListen(['red', 'blue', 'dog']);
    expect(screen.getByRole('button', { name: 'Colori: 2 parole su 8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Animali: 1 parole su 8' })).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ alphabet

function AlphabetHarness({ initial, cb }: { initial: string[]; cb: Callbacks }) {
  const [learned, setLearned] = useState(initial);
  return (
    <EnglishAlphabet
      learnedLetters={learned}
      textStyle="upper"
      onRewardStars={cb.onRewardStars}
      onLetterLearned={(l) => {
        cb.onDone(l);
        setLearned((x) => (x.includes(l) ? x : [...x, l]));
      }}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}

function setupAlphabet(initial: string[] = []) {
  const cb = makeCallbacks();
  render(<AlphabetHarness initial={initial} cb={cb} />);
  return cb;
}

const letterChoices = () => screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ }).filter((b) => b.dataset.correct !== undefined);
const rightLetter = () => letterChoices().find((b) => b.dataset.correct === 'true')!;
const wrongLetters = () => letterChoices().filter((b) => b.dataset.correct === 'false');

describe('EnglishAlphabet - explore', () => {
  it('shows the 26 letters and tells the child to touch one', () => {
    setupAlphabet();
    expect(within(screen.getByTestId('english-letters')).getAllByRole('button')).toHaveLength(26);
    advance(400);
    expect(sound.speakInstruction).toHaveBeenCalledWith(expect.stringMatching(/Tocca una lettera/));
  });

  it('says the name of the letter and the picture word when it is touched', () => {
    setupAlphabet();
    fireEvent.click(screen.getByRole('button', { name: 'Lettera B' }));
    expect(sound.speakParts).toHaveBeenLastCalledWith([
      expect.objectContaining({ text: 'bee', lang: 'en-GB' }),
      expect.objectContaining({ text: 'B is for ball', lang: 'en-GB' }),
    ]);
    expect(screen.getByText('B IS FOR BALL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lettera B' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains the X, which is heard at the end of the word', () => {
    setupAlphabet();
    fireEvent.click(screen.getByRole('button', { name: 'Lettera X' }));
    expect(screen.getByText(/alla fine della parola/)).toBeInTheDocument();
  });

  it('marks the letters already learned and counts them', () => {
    setupAlphabet(['A', 'C']);
    expect(screen.getByText('2 su 26 lettere imparate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lettera A, imparata' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lettera B' })).toBeInTheDocument();
  });
});

describe('EnglishAlphabet - find the letter', () => {
  const openQuiz = () => fireEvent.click(screen.getByRole('button', { name: 'Trova la lettera' }));
  const firstTarget = (learned: string[] = []) => englishLetterOrder(learned, today())[0];

  it('says the letter name and offers three letters', () => {
    setupAlphabet();
    openQuiz();
    advance(400);
    const target = firstTarget();
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/Ascolta il nome/) },
      expect.objectContaining({ text: target.say, lang: 'en-GB' }),
    ]);
    expect(letterChoices()).toHaveLength(3);
    expect(rightLetter()).toHaveAccessibleName(`Lettera ${target.letter}`);
  });

  it('rewards a right answer once and shows the picture word', () => {
    const cb = setupAlphabet();
    openQuiz();
    const target = firstTarget();
    fireEvent.click(rightLetter());
    expect(cb.onDone).toHaveBeenCalledWith(target.letter);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_LETTER_REWARD_STARS);
    expect(screen.getByText(/Nuova lettera inglese/)).toBeInTheDocument();
    letterChoices().forEach((b) => expect(b).toBeDisabled());

    advance(500);
    expect(sound.speakParts).toHaveBeenLastCalledWith([
      { text: 'Bravissima!' },
      expect.objectContaining({ text: target.say }),
      expect.objectContaining({ text: `${target.letter} is for ${target.word}` }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Prossima lettera/ }));
    expect(rightLetter()).toHaveAccessibleName(`Lettera ${englishLetterOrder([], today())[1].letter}`);
  });

  it('gives a wrong answer a second chance and repeats the letter name', () => {
    const cb = setupAlphabet();
    openQuiz();
    const target = firstTarget();
    fireEvent.click(wrongLetters()[0]);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).not.toHaveBeenCalled();
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(target.say, 0.7);
    expect(screen.getByRole('status')).toHaveTextContent(/Ascolta ancora/);
    fireEvent.click(rightLetter());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_LETTER_REWARD_STARS);
  });

  it('pays less for a letter that was already learned', () => {
    const cb = setupAlphabet(ENGLISH_ALPHABET.map((l) => l.letter));
    openQuiz();
    fireEvent.click(rightLetter());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova lettera inglese/)).not.toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ word families

function FamiliesHarness({ initial, textStyle = 'upper', cb }: { initial: string[]; textStyle?: TextStyle; cb: Callbacks }) {
  const [read, setRead] = useState(initial);
  return (
    <EnglishFamilies
      readWords={read}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onWordRead={(w) => {
        cb.onDone(w);
        setRead((r) => (r.includes(w) ? r : [...r, w]));
      }}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}

function setupFamilies(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb = makeCallbacks();
  render(<FamiliesHarness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}

const onsetButtons = () => screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ });
const rightOnset = () => onsetButtons().find((b) => b.dataset.correct === 'true')!;
const wrongOnsets = () => onsetButtons().filter((b) => b.dataset.correct === 'false');
const firstWord = (family = 'at', read: string[] = []) => familyRoundOrder(family, read, today() + family.length)[0];

describe('EnglishFamilies', () => {
  it('starts from the -at family with the picture, an empty slot and three letters', () => {
    setupFamilies();
    const word = firstWord();
    expect(screen.getByTestId('rime')).toHaveTextContent('AT');
    expect(screen.getByTestId('onset-slot')).toHaveAttribute('data-filled', 'false');
    expect(screen.getByTestId('onset-slot')).toHaveTextContent('?');
    expect(onsetButtons()).toHaveLength(3);
    expect(rightOnset()).toHaveAccessibleName(`Lettera ${word.onset.toUpperCase()}`);
    expect(screen.getByText(word.emoji, { selector: 'div' })).toBeInTheDocument();
  });

  it('says what to do and then the English word', () => {
    setupFamilies();
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/lettera che manca/) },
      expect.objectContaining({ text: firstWord().word, lang: 'en-GB' }),
    ]);
  });

  it('builds the word, rewards it once and reads "at ... cat"', () => {
    const cb = setupFamilies();
    const word = firstWord();
    fireEvent.click(rightOnset());
    expect(cb.onDone).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_FAMILY_REWARD_STARS);
    expect(screen.getByText(/Nuova parola letta/)).toBeInTheDocument();
    expect(screen.getByTestId('onset-slot')).toHaveTextContent(word.onset.toUpperCase());
    expect(screen.queryAllByRole('button', { name: /^Lettera [A-Z]$/ })).toHaveLength(0);

    // first the ending, lit up, then the whole word
    expect(sound.speakEnglish).toHaveBeenLastCalledWith('at', 0.7);
    expect(screen.getByTestId('rime').className).toContain('bg-amber-200');
    advance(900);
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(word.word, 0.6);
    expect(screen.getByTestId('onset-slot').className).toContain('bg-amber-200');
    advance(900);
    expect(screen.getByTestId('rime').className).not.toContain('bg-amber-200');
  });

  it('lights up the words of the family as they are read', () => {
    setupFamilies(['cat']);
    const list = screen.getByRole('list', { name: 'Le parole di questa famiglia' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(within(list).getByLabelText('cat: letta')).toHaveAttribute('data-read', 'true');
    expect(within(list).getByLabelText('hat: da leggere')).toHaveAttribute('data-read', 'false');
  });

  it('moves on to the next word, which is a new one', () => {
    setupFamilies();
    fireEvent.click(rightOnset());
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    const next = familyRoundOrder('at', [], today() + 2)[1];
    expect(rightOnset()).toHaveAccessibleName(`Lettera ${next.onset.toUpperCase()}`);
    expect(screen.getByTestId('onset-slot')).toHaveAttribute('data-filled', 'false');
  });

  it('gives a wrong answer a second chance, and after two mistakes makes the right letter shine', () => {
    const cb = setupFamilies();
    const word = firstWord();
    const [first, second] = wrongOnsets();
    fireEvent.click(first);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).not.toHaveBeenCalled();
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(word.word);
    expect(first).toBeDisabled();
    expect(rightOnset()).not.toHaveAttribute('data-hint');

    fireEvent.click(second);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(2);
    expect(rightOnset()).toHaveAttribute('data-hint', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/lettera che brilla/);

    fireEvent.click(rightOnset());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_FAMILY_REWARD_STARS);
  });

  it('pays less for a word that was already read', () => {
    const everything = WORD_FAMILIES.flatMap((f) => f.words.map((w) => w.word));
    const cb = setupFamilies(everything); // every family is done: every word is a repetition
    fireEvent.click(rightOnset());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova parola letta/)).not.toBeInTheDocument();
  });

  it('lets the child pick another family, and opens on the first one with words left', () => {
    setupFamilies(WORD_FAMILIES[0].words.map((w) => w.word));
    expect(screen.getByTestId('rime')).toHaveTextContent('AN');
    fireEvent.click(screen.getByRole('button', { name: /finiscono con og/ }));
    expect(screen.getByTestId('rime')).toHaveTextContent('OG');
    expect(rightOnset()).toHaveAccessibleName(`Lettera ${firstWord('og').onset.toUpperCase()}`);
  });

  it('writes letters and endings in the style chosen by the parents', () => {
    setupFamilies([], 'lower');
    expect(screen.getByTestId('rime')).toHaveTextContent(/^at$/);
    expect(rightOnset()).toHaveTextContent(firstWord().onset);
  });

  it('reads the word again when the finished word is touched', () => {
    setupFamilies();
    const word = firstWord();
    fireEvent.click(rightOnset());
    advance(2000);
    (sound.speakEnglish as Mock).mockClear();
    fireEvent.click(screen.getByRole('button', { name: `Ascolta ${word.word}` }));
    expect(sound.speakEnglish).toHaveBeenCalledWith('at', 0.7);
  });
});
