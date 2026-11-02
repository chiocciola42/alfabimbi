import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EnglishRead } from '../../src/components/EnglishRead';
import { EnglishSight } from '../../src/components/EnglishSight';
import { EnglishSpell } from '../../src/components/EnglishSpell';
import { EnglishStories } from '../../src/components/EnglishStories';
import { EnglishWrite } from '../../src/components/EnglishWrite';
import { dayNumber } from '../../src/data/dailyWords';
import { spellingOrder } from '../../src/data/englishFamilies';
import { SIGHT_WORDS, sightRoundOrder } from '../../src/data/englishSight';
import { ENGLISH_STORIES, storyWords } from '../../src/data/englishStories';
import {
  ENGLISH_REPEAT_REWARD_STARS,
  ENGLISH_SIGHT_REWARD_STARS,
  ENGLISH_SPELL_REWARD_STARS,
  ENGLISH_STORY_REWARD_STARS,
  ENGLISH_TRACE_REWARD_STARS,
} from '../../src/state/progress';
import { sound } from '../../src/utils/sound';
import type { LetterData, TextStyle } from '../../src/types';

// The tracing canvas needs real pointer drawing: a stand-in that exposes its props is enough here.
const tracing = vi.hoisted(() => ({ last: null as null | { letter: LetterData; english?: { reward: number; onSpeak: () => void } } }));
vi.mock('../../src/components/TracingCanvas', () => ({
  TracingCanvas: (props: {
    letter: LetterData;
    onLetterComplete: (id: string, upper: boolean) => void;
    onNextLetter?: () => void;
    onPrevLetter?: () => void;
    isCompletedUppercase: boolean;
    isCompletedLowercase: boolean;
    english?: { reward: number; onSpeak: () => void };
  }) => {
    tracing.last = props;
    return (
      <div data-testid="tracing">
        <span data-testid="tracing-letter">{props.letter.id}|{props.letter.word}|{props.letter.emoji}</span>
        <span data-testid="tracing-done">{String(props.isCompletedUppercase)}|{String(props.isCompletedLowercase)}</span>
        <button onClick={() => props.onLetterComplete(props.letter.id, true)}>trace upper</button>
        <button onClick={() => props.onLetterComplete(props.letter.id, false)}>trace lower</button>
        <button onClick={props.onNextLetter}>next letter</button>
        <button onClick={props.onPrevLetter}>previous letter</button>
        <button onClick={props.english?.onSpeak}>speak letter</button>
      </div>
    );
  },
}));

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
  vi.spyOn(sound, 'speakEncouragement').mockImplementation(() => {});
  vi.spyOn(sound, 'stopSpeaking').mockImplementation(() => {});
  tracing.last = null;
});
afterEach(() => vi.restoreAllMocks());

// ------------------------------------------------------------------ sight words

function SightHarness({ initial, textStyle = 'upper', cb }: { initial: string[]; textStyle?: TextStyle; cb: Callbacks }) {
  const [learned, setLearned] = useState(initial);
  return (
    <EnglishSight
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
function setupSight(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb = makeCallbacks();
  render(<SightHarness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}
const cards = () => screen.getAllByRole('button', { name: /^Parola / });
const rightCard = () => cards().find((b) => b.dataset.correct === 'true')!;
const wrongCards = () => cards().filter((b) => b.dataset.correct === 'false');
const firstSight = (set = 1, read: string[] = []) => sightRoundOrder(set, read, today() + set)[0];

describe('EnglishSight', () => {
  it('shows three written words and plays the English word, never showing the answer first', () => {
    setupSight();
    const word = firstSight();
    expect(cards()).toHaveLength(3);
    expect(rightCard()).toHaveAccessibleName(`Parola ${word.word}`);
    expect(rightCard()).toHaveTextContent(word.word.toUpperCase());
    expect(screen.getByRole('button', { name: /^Gruppo 1: 0 parole su 4/ })).toHaveAttribute('aria-pressed', 'true');
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/Ascolta e tocca la parola/) },
      expect.objectContaining({ text: word.word, lang: 'en-GB' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la parola inglese' }));
    expect(sound.speakEnglish).toHaveBeenCalledWith(word.word);
  });

  it('rewards a right answer once and offers the next word', () => {
    const cb = setupSight();
    const word = firstSight();
    fireEvent.click(rightCard());
    expect(cb.onDone).toHaveBeenCalledWith(word.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_SIGHT_REWARD_STARS);
    expect(screen.getByText(/Nuova parola riconosciuta/)).toBeInTheDocument();
    cards().forEach((b) => expect(b).toBeDisabled());
    advance(500);
    expect(sound.speakParts).toHaveBeenCalledWith([
      { text: 'Bravissima!' },
      expect.objectContaining({ text: word.word, lang: 'en-GB' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(rightCard()).toHaveAccessibleName(`Parola ${sightRoundOrder(1, [], today() + 1)[1].word}`);
  });

  it('makes the right card shine after the first mistake, since the child cannot read yet', () => {
    const cb = setupSight();
    const word = firstSight();
    expect(rightCard()).not.toHaveAttribute('data-hint');
    fireEvent.click(wrongCards()[0]);
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).not.toHaveBeenCalled();
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(word.word);
    expect(rightCard()).toHaveAttribute('data-hint', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/brilla/);
    expect(wrongCards().filter((b) => b.hasAttribute('disabled'))).toHaveLength(1);
    fireEvent.click(rightCard());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_SIGHT_REWARD_STARS);
  });

  it('pays less for a word already known and writes cards in the chosen style', () => {
    const cb = setupSight(SIGHT_WORDS.map((w) => w.word), 'lower');
    const word = firstSight(1, SIGHT_WORDS.map((w) => w.word));
    expect(rightCard()).toHaveTextContent(new RegExp(`^${word.word}$`));
    fireEvent.click(rightCard());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/Nuova parola riconosciuta/)).not.toBeInTheDocument();
  });

  it('opens on the first set with words left and lets the child change set', () => {
    setupSight(['the', 'i', 'a', 'my']);
    expect(screen.getByRole('button', { name: /^Gruppo 2: / })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Gruppo 4: / }));
    const word = firstSight(4);
    expect(rightCard()).toHaveAccessibleName(`Parola ${word.word}`);
  });
});

// ------------------------------------------------------------------ read tab (both modes)

describe('EnglishRead', () => {
  const props = () => ({
    families: { readWords: [], textStyle: 'upper' as TextStyle, onRewardStars: vi.fn(), onWordRead: vi.fn() },
    sight: { learnedWords: [], textStyle: 'upper' as TextStyle, onRewardStars: vi.fn(), onWordLearned: vi.fn() },
  });

  it('opens on the word families and switches to the sight words and back', () => {
    render(<EnglishRead {...props()} />);
    expect(screen.getByText('Forma la parola')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parole-rima' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: "A colpo d'occhio" }));
    expect(screen.queryByText('Forma la parola')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Parole-rima' }));
    expect(screen.getByText('Forma la parola')).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ build the word

function SpellHarness({ initial, textStyle = 'upper', cb }: { initial: string[]; textStyle?: TextStyle; cb: Callbacks }) {
  const [spelled, setSpelled] = useState(initial);
  return (
    <EnglishSpell
      spelledWords={spelled}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onWordSpelled={(w) => {
        cb.onDone(w);
        setSpelled((s) => (s.includes(w) ? s : [...s, w]));
      }}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}
function setupSpell(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb = makeCallbacks();
  render(<SpellHarness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}
const tile = (letter: string) => screen.getAllByRole('button', { name: `Lettera ${letter.toUpperCase()}` }).find((b) => !b.hasAttribute('disabled'))!;
const spellTarget = (spelled: string[] = []) => spellingOrder(spelled, today())[0];
const spellOut = (word: string) => word.split('').forEach((l) => fireEvent.click(tile(l)));

describe('EnglishSpell', () => {
  it('shows the picture, one empty slot per letter and the letters to touch', () => {
    setupSpell();
    const target = spellTarget();
    expect(within(screen.getByTestId('letter-slots')).getAllByText('·')).toHaveLength(target.word.length);
    expect(screen.getAllByRole('button', { name: /^Lettera [A-Z]$/ })).toHaveLength(target.word.length);
    advance(400);
    expect(sound.speakInstructionParts).toHaveBeenCalledWith([
      { text: expect.stringMatching(/metti le lettere in ordine/) },
      expect.objectContaining({ text: target.word, lang: 'en-GB' }),
    ]);
  });

  it('fills the slots in order, rewards the word once and says it', () => {
    const cb = setupSpell();
    const target = spellTarget();
    spellOut(target.word);
    expect(cb.onDone).toHaveBeenCalledWith(target.word);
    expect(cb.onRewardStars).toHaveBeenCalledTimes(1);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_SPELL_REWARD_STARS);
    expect(screen.getByText(/Hai scritto una nuova parola/)).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Lettera [A-Z]$/ })).toHaveLength(0);
    advance(500);
    expect(sound.speakParts).toHaveBeenCalledWith([
      { text: 'Bravissima!' },
      expect.objectContaining({ text: target.word, lang: 'en-GB' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Prossima parola/ }));
    expect(within(screen.getByTestId('letter-slots')).getAllByText('·').length).toBeGreaterThan(0);
  });

  it('counts a wrong letter, and after two mistakes makes the next right letter shine', () => {
    const cb = setupSpell();
    const target = spellTarget();
    const wrong = target.word.split('').slice(1); // letters that are not the first one
    fireEvent.click(tile(wrong[0]));
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/un’altra lettera/);
    fireEvent.click(tile(wrong[1]));
    expect(cb.onWrongAnswer).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(/lettera che brilla/);
    expect(tile(target.word[0])).toHaveAttribute('data-hint', 'true');
    spellOut(target.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_SPELL_REWARD_STARS);
  });

  it('starts over with the restart button without penalty', () => {
    const cb = setupSpell();
    const target = spellTarget();
    fireEvent.click(tile(target.word[0]));
    expect(within(screen.getByTestId('letter-slots')).getAllByText('·')).toHaveLength(target.word.length - 1);
    fireEvent.click(screen.getByRole('button', { name: /Ricomincia/ }));
    expect(within(screen.getByTestId('letter-slots')).getAllByText('·')).toHaveLength(target.word.length);
    expect(cb.onWrongAnswer).not.toHaveBeenCalled();
  });

  it('pays less for a word already built and uses the chosen style', () => {
    const everything = spellingOrder([], 0).map((w) => w.word);
    const cb = setupSpell(everything, 'lower');
    const target = spellTarget(everything);
    spellOut(target.word);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    expect(screen.queryByText(/nuova parola/)).not.toBeInTheDocument();
    expect(screen.getByText(target.word, { selector: 'span' })).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ write tab

function WriteHarness({ cb, traced = [] as string[], spelled = [] as string[] }: { cb: Callbacks; traced?: string[]; spelled?: string[] }) {
  return (
    <EnglishWrite
      tracedLetters={traced}
      spelledWords={spelled}
      textStyle="upper"
      onRewardStars={cb.onRewardStars}
      onLetterTraced={(l, upper) => cb.onDone(`${l}:${upper}`)}
      onWordSpelled={(w) => cb.onDone(w)}
      onWrongAnswer={cb.onWrongAnswer}
    />
  );
}

describe('EnglishWrite', () => {
  it('traces the English letter with its English picture word', () => {
    render(<WriteHarness cb={makeCallbacks()} />);
    expect(screen.getByTestId('tracing-letter')).toHaveTextContent('A|apple|🍎');
    expect(tracing.last?.english?.reward).toBe(ENGLISH_TRACE_REWARD_STARS);
    expect(tracing.last?.letter.strokesUppercase.length).toBeGreaterThan(0);
  });

  it('walks through the 26 letters in both directions, wrapping around', () => {
    render(<WriteHarness cb={makeCallbacks()} />);
    fireEvent.click(screen.getByRole('button', { name: 'next letter' }));
    expect(screen.getByTestId('tracing-letter')).toHaveTextContent('B|ball|⚽');
    fireEvent.click(screen.getByRole('button', { name: 'previous letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'previous letter' }));
    expect(screen.getByTestId('tracing-letter')).toHaveTextContent('Z|zebra|🦓');
    fireEvent.click(screen.getByRole('button', { name: 'next letter' }));
    expect(screen.getByTestId('tracing-letter')).toHaveTextContent('A|apple|🍎');
  });

  it('records the traced case and gives more stars the first time', () => {
    const cb = makeCallbacks();
    const { rerender } = render(<WriteHarness cb={cb} />);
    fireEvent.click(screen.getByRole('button', { name: 'trace upper' }));
    expect(cb.onDone).toHaveBeenLastCalledWith('A:true');
    expect(cb.onRewardStars).toHaveBeenLastCalledWith(ENGLISH_TRACE_REWARD_STARS);
    expect(sound.speakEncouragement).toHaveBeenCalled();

    rerender(<WriteHarness cb={cb} traced={['A']} />);
    expect(screen.getByTestId('tracing-done')).toHaveTextContent('true|false');
    fireEvent.click(screen.getByRole('button', { name: 'trace upper' }));
    expect(cb.onRewardStars).toHaveBeenLastCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    fireEvent.click(screen.getByRole('button', { name: 'trace lower' }));
    expect(cb.onDone).toHaveBeenLastCalledWith('A:false');
    expect(cb.onRewardStars).toHaveBeenLastCalledWith(ENGLISH_TRACE_REWARD_STARS);
  });

  it('says the letter name and the phrase from the speaker of the tracing page', () => {
    render(<WriteHarness cb={makeCallbacks()} />);
    fireEvent.click(screen.getByRole('button', { name: 'speak letter' }));
    expect(sound.speakParts).toHaveBeenLastCalledWith([
      expect.objectContaining({ text: 'ay', lang: 'en-GB' }),
      expect.objectContaining({ text: 'A is for apple', lang: 'en-GB' }),
    ]);
  });

  it('switches to building words and back to tracing', () => {
    render(<WriteHarness cb={makeCallbacks()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Costruisci le parole' }));
    expect(screen.queryByTestId('tracing')).not.toBeInTheDocument();
    expect(screen.getByText('Costruisci la parola')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Traccia le lettere' }));
    expect(screen.getByTestId('tracing')).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------ stories and songs

function StoriesHarness({ initial, textStyle = 'upper', cb }: { initial: string[]; textStyle?: TextStyle; cb: Callbacks }) {
  const [read, setRead] = useState(initial);
  return (
    <EnglishStories
      readStories={read}
      textStyle={textStyle}
      onRewardStars={cb.onRewardStars}
      onStoryRead={(id) => {
        cb.onDone(id);
        setRead((r) => (r.includes(id) ? r : [...r, id]));
      }}
    />
  );
}
function setupStories(initial: string[] = [], textStyle: TextStyle = 'upper') {
  const cb = makeCallbacks();
  render(<StoriesHarness initial={initial} textStyle={textStyle} cb={cb} />);
  return cb;
}
const lines = () => within(screen.getByTestId('story-lines')).getAllByRole('listitem');
const finishButton = () => screen.getByRole('button', { name: /Ho letto tutto/ });
const first = ENGLISH_STORIES[0];

describe('EnglishStories', () => {
  it('opens on the first story with a picture and a speaker for every line', () => {
    setupStories();
    expect(screen.getByRole('heading', { name: new RegExp(first.title, 'i') })).toBeInTheDocument();
    expect(lines()).toHaveLength(first.lines.length);
    expect(screen.getAllByRole('button', { name: /^Ascolta la riga / })).toHaveLength(first.lines.length);
    expect(screen.getByRole('button', { name: 'Ascolta la storia' })).toBeInTheDocument();
    advance(400);
    expect(sound.speakInstruction).toHaveBeenCalledWith(expect.stringMatching(/Ascolta e leggi con me/));
  });

  it('says a word when it is touched, and lights it up for a moment', () => {
    setupStories();
    const word = storyWords(first.lines[0].text)[0];
    fireEvent.click(within(lines()[0]).getAllByRole('button', { name: new RegExp(`^${word.text}$`, 'i') })[0]);
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(word.spoken, 0.7);
    expect(document.querySelectorAll('button[data-active="true"]')).toHaveLength(1);
    advance(2000);
    expect(document.querySelectorAll('button[data-active="true"]')).toHaveLength(0);
  });

  it('reads one line with the speaker next to it, then moves the light word by word', () => {
    setupStories();
    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la riga 2' }));
    advance(0);
    expect(sound.speakEnglish).toHaveBeenLastCalledWith(first.lines[1].text, 0.7);
    expect(lines()[1]).toHaveAttribute('data-active', 'true');
    const wordsOfLine = storyWords(first.lines[1].text);
    expect(within(lines()[1]).getAllByRole('button').filter((b) => b.dataset.active === 'true')).toHaveLength(1);
    advance(1000);
    expect(wordsOfLine.length).toBeGreaterThan(1);
    advance(5000);
    expect(document.querySelectorAll('[data-active="true"]')).toHaveLength(0);
  });

  it('plays the whole story line by line and then allows finishing', () => {
    const cb = setupStories();
    expect(finishButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(`0/${first.lines.length}`);

    fireEvent.click(screen.getByRole('button', { name: 'Ascolta la storia' }));
    expect(screen.getByRole('button', { name: 'Ascolta la storia' })).toBeDisabled();
    advance(60_000);
    first.lines.forEach((l) => expect(sound.speakEnglish).toHaveBeenCalledWith(l.text, 0.7));
    expect(screen.getByRole('button', { name: 'Ascolta la storia' })).not.toBeDisabled();
    expect(finishButton()).toBeEnabled();

    fireEvent.click(finishButton());
    expect(cb.onDone).toHaveBeenCalledWith(first.id);
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_STORY_REWARD_STARS);
    expect(screen.getByText(/Hai letto/)).toBeInTheDocument();
    advance(500);
    expect(sound.speak).toHaveBeenCalledWith(expect.stringContaining('Bravissima'));
  });

  it('also lets the child finish by listening to the lines one by one, once only', () => {
    const cb = setupStories();
    first.lines.forEach((_, i) => fireEvent.click(screen.getByRole('button', { name: `Ascolta la riga ${i + 1}` })));
    expect(finishButton()).toBeEnabled();
    fireEvent.click(finishButton());
    expect(cb.onRewardStars).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Ho letto tutto/ })).not.toBeInTheDocument();
  });

  it('pays less for a story read again, and moves on to the next one', () => {
    const cb = setupStories(ENGLISH_STORIES.map((s) => s.id));
    first.lines.forEach((_, i) => fireEvent.click(screen.getByRole('button', { name: `Ascolta la riga ${i + 1}` })));
    fireEvent.click(finishButton());
    expect(cb.onRewardStars).toHaveBeenCalledWith(ENGLISH_REPEAT_REWARD_STARS);
    fireEvent.click(screen.getByRole('button', { name: /Prossima storia/ }));
    expect(screen.getByRole('heading', { name: new RegExp(ENGLISH_STORIES[1].title, 'i') })).toBeInTheDocument();
    expect(finishButton()).toBeDisabled();
  });

  it('opens on the first story not read and lets the child pick any story or song', () => {
    setupStories([ENGLISH_STORIES[0].id]);
    expect(screen.getByRole('heading', { name: new RegExp(ENGLISH_STORIES[1].title, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(`^Storia ${first.title}: letta`) })).toBeInTheDocument();
    const song = ENGLISH_STORIES.find((s) => s.kind === 'song')!;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Canzoncina ${song.title}: da leggere`) }));
    expect(screen.getByRole('heading', { name: new RegExp(song.title, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ascolta la canzoncina' })).toBeInTheDocument();
    expect(lines()).toHaveLength(song.lines.length);
  });

  it('writes the text in the style chosen by the parents', () => {
    setupStories([], 'lower');
    const shown = within(lines()[0]).getAllByRole('button').filter((b) => !b.hasAttribute('aria-label')).map((b) => b.textContent);
    expect(shown).toEqual(storyWords(first.lines[0].text).map((w) => w.text.toLowerCase()));
  });
});
