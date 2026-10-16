import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { TextStyle } from '../types';
import {
  SIGHT_SET_COUNT,
  pickSightChoices,
  sightRoundOrder,
  sightWordsOfSet,
  suggestedSightSet,
  type SightWord,
} from '../data/englishSight';
import { dayNumber } from '../data/dailyWords';
import { ENGLISH_REPEAT_REWARD_STARS, ENGLISH_SIGHT_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishSightProps {
  /** Sight words already recognised (lowercase). */
  learnedWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A word was recognised: it goes among the learned ones. */
  onWordLearned: (word: string) => void;
  onWrongAnswer?: () => void;
}

const CHOICES = 3;
const INSTRUCTION = 'Ascolta e tocca la parola che senti!';

/**
 * Sight words: very frequent words that do not follow phonics. The child hears one and touches
 * the written word among three cards; after the first mistake the right card shines.
 */
export const EnglishSight: React.FC<EnglishSightProps> = ({
  learnedWords,
  textStyle,
  onRewardStars,
  onWordLearned,
  onWrongAnswer,
}) => {
  const [set, setSet] = useState<number>(() => suggestedSightSet(learnedWords));
  // The order is fixed when the set changes, so words learned meanwhile do not reshuffle it.
  const [startLearned] = useState(learnedWords);
  const queue = useMemo(
    () => sightRoundOrder(set, startLearned, dayNumber(new Date()) + set),
    [set, startLearned]
  );
  const [index, setIndex] = useState(0);
  const word = queue[index % queue.length];
  const choices = useMemo(() => pickSightChoices(word, CHOICES), [word, index]);

  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  // New word or set: reset and, after a short pause, say what to do and the English word.
  useEffect(() => {
    clearTimer();
    setWrongPicks([]);
    setSolved(false);
    setWasNew(false);
    const t = setTimeout(
      () =>
        sound.speakInstructionParts([
          { text: INSTRUCTION },
          { text: word.word, lang: 'en-GB', rate: 0.75, pitch: 1.05 },
        ]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, set]);

  useEffect(() => setIndex(0), [set]);

  const handleChoice = (picked: SightWord) => {
    if (solved || wrongPicks.includes(picked.word)) return;
    if (picked.word === word.word) {
      const isNew = !learnedWords.includes(word.word);
      sound.playSuccessChime();
      setWasNew(isNew);
      setSolved(true);
      onWordLearned(word.word);
      onRewardStars(isNew ? ENGLISH_SIGHT_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
      try {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      } catch {
        // canvas not available
      }
      clearTimer();
      timer.current = setTimeout(
        () => sound.speakParts([{ text: 'Bravissima!' }, { text: word.word, lang: 'en-GB', rate: 0.7, pitch: 1.05 }]),
        400
      );
    } else {
      sound.playErrorSoft();
      setWrongPicks((prev) => [...prev, picked.word]);
      onWrongAnswer?.();
      sound.speakEnglish(word.word);
    }
  };

  const doneInSet = (n: number) => sightWordsOfSet(n).filter((w) => learnedWords.includes(w.word)).length;
  // A child who cannot read yet cannot tell the cards apart: after one mistake the right one shines.
  const hintWord = wrongPicks.length >= 1 && !solved ? word.word : null;

  return (
    <div>
      <div role="group" aria-label="Scegli un gruppo di parole" className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {Array.from({ length: SIGHT_SET_COUNT }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={set === n}
            aria-label={`Gruppo ${n}: ${doneInSet(n)} parole su ${sightWordsOfSet(n).length}`}
            onClick={() => {
              setSet(n);
              sound.playClick();
            }}
            className={`shrink-0 flex flex-col items-center justify-center px-4 ${TOUCH_TARGET} rounded-2xl border-2 text-xs font-bold transition-colors cursor-pointer ${
              set === n
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span aria-hidden="true" className="text-xl font-black leading-none">{n}</span>
            <span aria-hidden="true" className="tabular-nums">
              {doneInSet(n)}/{sightWordsOfSet(n).length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 shadow-lg text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">A colpo d'occhio</span>
          <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
        </div>

        <button
          type="button"
          onClick={() => sound.speakEnglish(word.word)}
          aria-label="Ascolta la parola inglese"
          className="mx-auto flex flex-col items-center justify-center gap-1 w-36 h-36 rounded-full bg-emerald-50 border-4 border-emerald-300 hover:bg-emerald-100 text-emerald-800 shadow-md cursor-pointer active:scale-95 transition-transform"
        >
          <Volume2 className="w-14 h-14" aria-hidden="true" />
          <span className="text-sm font-black">Listen</span>
        </button>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          {choices.map((c) => {
            const isRight = c.word === word.word;
            const isWrong = wrongPicks.includes(c.word);
            let style = 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 text-slate-800';
            if (solved && isRight) style = 'bg-emerald-100 border-emerald-500 scale-105 shadow-md text-emerald-800';
            else if (isWrong) style = 'bg-slate-100 border-slate-200 opacity-40 text-slate-500';
            else if (hintWord === c.word) style = 'bg-white border-emerald-500 ring-4 ring-emerald-200 animate-pulse text-emerald-700';
            return (
              <button
                key={c.word}
                type="button"
                onClick={() => handleChoice(c)}
                disabled={solved || isWrong}
                aria-label={`Parola ${c.word}`}
                data-correct={isRight ? 'true' : 'false'}
                data-hint={hintWord === c.word ? 'true' : undefined}
                className={`h-24 sm:h-28 px-1 rounded-3xl border-2 font-black text-3xl sm:text-4xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${textStyleClass(textStyle)} ${style}`}
              >
                {applyTextStyle(c.word, textStyle)}
              </button>
            );
          })}
        </div>

        {wrongPicks.length > 0 && !solved && (
          <p role="status" className="mt-4 text-rose-600 font-bold text-sm">
            Quasi! Guarda la parola che brilla ✨
          </p>
        )}

        {solved && (
          <div className="mt-6 pt-4 border-t border-emerald-100 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-3 text-emerald-600 font-black">
                <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
                <span className={`text-4xl ${textStyleClass(textStyle)}`}>{applyTextStyle(word.word, textStyle)}</span>
                <SpeakButton text={word.word} lang="en-GB" rate={0.75} label="Ascolta la parola inglese" />
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {wasNew
                  ? `👁️ Nuova parola riconosciuta! +${ENGLISH_SIGHT_REWARD_STARS} ⭐`
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
              Prossima parola &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
