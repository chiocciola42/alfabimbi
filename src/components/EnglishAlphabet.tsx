import React, { useEffect, useMemo, useRef, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { Check, Gamepad2, LayoutGrid, Volume2 } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  ENGLISH_ALPHABET,
  englishLetterOrder,
  letterPhrase,
  pickLetterChoices,
  type EnglishLetter,
} from '../data/englishAlphabet';
import { dayNumber } from '../data/dailyWords';
import { ENGLISH_LETTER_REWARD_STARS, ENGLISH_REPEAT_REWARD_STARS } from '../state/progress';
import { sound, type SpeechPart } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishAlphabetProps {
  /** English letters already recognised (uppercase). */
  learnedLetters: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A letter was recognised by its name: it goes among the learned ones. */
  onLetterLearned: (letter: string) => void;
  onWrongAnswer?: () => void;
}

type Mode = 'explore' | 'quiz';

const CHOICES = 3;
const QUIZ_INSTRUCTION = 'Ascolta il nome della lettera e toccala!';
const EXPLORE_INSTRUCTION = 'Tocca una lettera per ascoltare come si chiama in inglese!';

/** What the voice says for a letter: its English name, then "A is for apple". */
const letterParts = (entry: EnglishLetter): SpeechPart[] => [
  { text: entry.say, lang: 'en-GB', rate: 0.7, pitch: 1.05 },
  { text: letterPhrase(entry), lang: 'en-GB', rate: 0.75, pitch: 1.05 },
];

/** The English alphabet: listen and explore the 26 letters, then recognise them by their name. */
export const EnglishAlphabet: React.FC<EnglishAlphabetProps> = ({
  learnedLetters,
  textStyle,
  onRewardStars,
  onLetterLearned,
  onWrongAnswer,
}) => {
  const [mode, setMode] = useState<Mode>('explore');
  const [selected, setSelected] = useState<EnglishLetter | null>(null);

  // --- Quiz: the order is fixed once, so letters learned meanwhile do not reshuffle it.
  const [startLearned] = useState(learnedLetters);
  const queue = useMemo(() => englishLetterOrder(startLearned, dayNumber(new Date())), [startLearned]);
  const [index, setIndex] = useState(0);
  const target = queue[index % queue.length];
  const choices = useMemo(() => pickLetterChoices(target, CHOICES), [target, index]);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const quizParts: SpeechPart[] = [{ text: QUIZ_INSTRUCTION }, { text: target.say, lang: 'en-GB', rate: 0.7, pitch: 1.05 }];

  // A new round (or switching game): reset and say what to do.
  useEffect(() => {
    clearTimer();
    setWrongPicks([]);
    setSolved(false);
    setWasNew(false);
    const t = setTimeout(() => {
      if (mode === 'quiz') sound.speakInstructionParts(quizParts);
      else sound.speakInstruction(EXPLORE_INSTRUCTION);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode]);

  const handleCard = (entry: EnglishLetter) => {
    setSelected(entry);
    sound.speakParts(letterParts(entry));
  };

  const handleChoice = (picked: EnglishLetter) => {
    if (solved || wrongPicks.includes(picked.letter)) return;
    if (picked.letter === target.letter) {
      const isNew = !learnedLetters.includes(target.letter);
      sound.playSuccessChime();
      setWasNew(isNew);
      setSolved(true);
      onLetterLearned(target.letter);
      onRewardStars(isNew ? ENGLISH_LETTER_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
      celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      clearTimer();
      timer.current = setTimeout(() => sound.speakParts([{ text: 'Bravissima!' }, ...letterParts(target)]), 400);
    } else {
      sound.playErrorSoft();
      setWrongPicks((prev) => [...prev, picked.letter]);
      onWrongAnswer?.();
      sound.speakEnglish(target.say, 0.7);
    }
  };

  const modeButton = (id: Mode, Icon: typeof LayoutGrid, label: string) => (
    <button
      {...skin()}
      type="button"
      onClick={() => {
        setMode(id);
        sound.playClick();
      }}
      aria-pressed={mode === id}
      className={`inline-flex items-center justify-center gap-2 px-5 ${TOUCH_TARGET} rounded-2xl font-bold text-sm transition-all cursor-pointer ${
        mode === id
          ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300'
          : 'bg-white text-slate-700 hover:bg-emerald-50 border border-emerald-200'
      }`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {modeButton('explore', LayoutGrid, 'Ascolta le lettere')}
        {modeButton('quiz', Gamepad2, 'Trova la lettera')}
      </div>
      <p className="text-center text-sm font-bold text-emerald-800 mb-4 tabular-nums">
        {learnedLetters.length} su {ENGLISH_ALPHABET.length} lettere imparate
      </p>

      {mode === 'explore' ? (
        <>
          {/* Big card of the letter just touched */}
          <div
            aria-live="polite"
            className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-200 shadow-md mb-5 text-center min-h-44 flex flex-col items-center justify-center gap-3"
          >
            {selected ? (
              <>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-7xl sm:text-8xl font-black text-emerald-700 leading-none">
                    {selected.letter}
                    <span className="text-5xl sm:text-6xl text-emerald-500">{selected.lowercase}</span>
                  </span>
                  <span className="text-6xl sm:text-7xl" aria-hidden="true">{selected.emoji}</span>
                </div>
                <p className={`text-lg font-black text-slate-800 ${textStyleClass(textStyle)}`}>
                  {applyTextStyle(letterPhrase(selected), textStyle)}
                </p>
                {selected.note && <p className="text-xs font-semibold text-slate-600">{selected.note}</p>}
                <div className="flex items-center gap-2">
                  <SpeakButton
                    withLabel
                    text={selected.say}
                    lang="en-GB"
                    rate={0.7}
                    label="Ascolta il nome della lettera"
                  />
                  <SpeakButton
                    withLabel
                    text={letterPhrase(selected)}
                    lang="en-GB"
                    rate={0.75}
                    label="Ascolta la parola"
                  />
                </div>
              </>
            ) : (
              <>
                <span className="text-5xl" aria-hidden="true">🇬🇧</span>
                <p className="font-bold text-emerald-900 text-balance">{EXPLORE_INSTRUCTION}</p>
                <SpeakButton withLabel asInstruction text={EXPLORE_INSTRUCTION} label="Ascolta le istruzioni" />
              </>
            )}
          </div>

          <ul className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2 sm:gap-3" data-testid="english-letters">
            {ENGLISH_ALPHABET.map((entry) => {
              const done = learnedLetters.includes(entry.letter);
              const isSelected = selected?.letter === entry.letter;
              return (
                <li key={entry.letter}>
                  <button
                    {...skin()}
                    type="button"
                    onClick={() => handleCard(entry)}
                    aria-label={`Lettera ${entry.letter}${done ? ', imparata' : ''}`}
                    aria-pressed={isSelected}
                    className={`relative w-full min-h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-100 border-emerald-500 shadow-md'
                        : done
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    {done && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                      </span>
                    )}
                    <span className="text-3xl sm:text-4xl font-black text-slate-800 leading-none" aria-hidden="true">
                      {entry.letter}
                      <span className="text-xl sm:text-2xl text-emerald-600">{entry.lowercase}</span>
                    </span>
                    <span className="text-2xl" aria-hidden="true">{entry.emoji}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 shadow-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Trova la lettera</span>
            <SpeakButton text={QUIZ_INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
          </div>

          <button
            {...skin()}
            type="button"
            onClick={() => sound.speakEnglish(target.say, 0.7)}
            aria-label="Ascolta il nome della lettera"
            className="mx-auto flex flex-col items-center justify-center gap-1 w-36 h-36 rounded-full bg-emerald-50 border-4 border-emerald-300 hover:bg-emerald-100 text-emerald-800 shadow-md cursor-pointer active:scale-95 transition-transform"
          >
            <Volume2 className="w-14 h-14" aria-hidden="true" />
            <span className="text-sm font-black">Listen</span>
          </button>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto mt-6">
            {choices.map((c) => {
              const isRight = c.letter === target.letter;
              const isWrong = wrongPicks.includes(c.letter);
              let style = 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 text-slate-800';
              if (solved && isRight) style = 'bg-emerald-100 border-emerald-500 scale-105 shadow-md text-emerald-800';
              else if (isWrong) style = 'bg-slate-100 border-slate-200 opacity-40 text-slate-500';
              return (
                <button
                  {...skin()}
                  key={c.letter}
                  type="button"
                  onClick={() => handleChoice(c)}
                  disabled={solved || isWrong}
                  aria-label={`Lettera ${c.letter}`}
                  data-correct={isRight ? 'true' : 'false'}
                  className={`h-24 sm:h-28 rounded-3xl border-2 font-black flex items-baseline justify-center gap-1 pt-5 transition-all duration-150 cursor-pointer active:scale-95 ${style}`}
                >
                  <span className="text-6xl leading-none" aria-hidden="true">{c.letter}</span>
                  <span className="text-4xl leading-none opacity-70" aria-hidden="true">{c.lowercase}</span>
                </button>
              );
            })}
          </div>

          {wrongPicks.length > 0 && !solved && (
            <p role="status" className="mt-4 text-rose-600 font-bold text-sm">
              Quasi! Ascolta ancora e riprova 👂
            </p>
          )}

          {solved && (
            <div className="mt-6 pt-4 border-t border-emerald-100 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3 text-emerald-600 font-black">
                  <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
                  <span className="text-4xl">{target.letter}{target.lowercase}</span>
                  <span className="text-5xl" aria-hidden="true">{target.emoji}</span>
                  <SpeakButton
                    text={letterPhrase(target)}
                    lang="en-GB"
                    rate={0.75}
                    label="Ascolta la parola"
                  />
                </div>
                <p className="text-sm font-bold text-emerald-700">
                  {wasNew
                    ? `🔤 Nuova lettera inglese! +${ENGLISH_LETTER_REWARD_STARS} ⭐`
                    : `+${ENGLISH_REPEAT_REWARD_STARS} ⭐`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIndex((i) => i + 1);
                }}
                className={`py-3.5 px-8 ${TOUCH_TARGET} bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-base rounded-2xl shadow-sm transition-all cursor-pointer`}
              >
                Prossima lettera &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
