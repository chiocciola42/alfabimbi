import React, { useEffect, useMemo, useRef, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { Check, Volume2 } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  ENGLISH_WORLDS,
  englishRoundOrder,
  findEnglishWorld,
  pickEnglishChoices,
  suggestedEnglishWorld,
  type EnglishWord,
} from '../data/englishWords';
import { dayNumber } from '../data/dailyWords';
import { ENGLISH_REPEAT_REWARD_STARS, ENGLISH_WORD_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishListenProps {
  /** English words already recognised (lowercase). */
  learnedWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A word was recognised: it goes among the learned ones. */
  onWordLearned: (word: string) => void;
  onWrongAnswer?: () => void;
}

const CHOICES = 3;
const INSTRUCTION = "Ascolta e tocca l'immagine giusta!";

/** Level zero of English: the child hears a word and touches the picture. Nothing to read. */
export const EnglishListen: React.FC<EnglishListenProps> = ({
  learnedWords,
  textStyle,
  onRewardStars,
  onWordLearned,
  onWrongAnswer,
}) => {
  // The first world with something left to learn; once one is picked by hand it stays.
  const [worldId, setWorldId] = useState<string>(() => suggestedEnglishWorld(learnedWords).id);
  // The order is fixed when the world changes, so words learned meanwhile do not reshuffle it.
  const [startLearned] = useState(learnedWords);
  const queue = useMemo(
    () => englishRoundOrder(worldId, startLearned, dayNumber(new Date()) + worldId.length),
    [worldId, startLearned]
  );
  const [index, setIndex] = useState(0);
  const word = queue[index % queue.length];
  const choices = useMemo(() => pickEnglishChoices(word, CHOICES), [word, index]);

  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const instruction = [{ text: INSTRUCTION }, { text: word.word, lang: 'en-GB' as const, rate: 0.75, pitch: 1.05 }];

  // New word or world: reset and, after a short pause, say what to do and the English word.
  useEffect(() => {
    clearTimer();
    setWrongPicks([]);
    setSolved(false);
    setWasNew(false);
    const t = setTimeout(() => sound.speakInstructionParts(instruction), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, worldId]);

  useEffect(() => setIndex(0), [worldId]);

  const handleChoice = (picked: EnglishWord) => {
    if (solved || wrongPicks.includes(picked.word)) return;
    if (picked.word === word.word) {
      const isNew = !learnedWords.includes(word.word);
      sound.playSuccessChime();
      setWasNew(isNew);
      setSolved(true);
      onWordLearned(word.word);
      onRewardStars(isNew ? ENGLISH_WORD_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
      celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
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

  const world = findEnglishWorld(worldId);
  const learnedInWorld = (id: string) => findEnglishWorld(id).words.filter((w) => learnedWords.includes(w.word)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* The eight worlds */}
      <div
        role="group"
        aria-label="Scegli un mondo di parole"
        className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar"
      >
        {ENGLISH_WORLDS.map((w) => {
          const done = learnedInWorld(w.id);
          return (
            <button
              {...skin()}
              key={w.id}
              type="button"
              aria-pressed={worldId === w.id}
              aria-label={`${w.title}: ${done} parole su ${w.words.length}`}
              onClick={() => {
                setWorldId(w.id);
                sound.playClick();
              }}
              className={`shrink-0 flex flex-col items-center justify-center px-3 ${TOUCH_TARGET} rounded-2xl border-2 text-xs font-bold transition-colors cursor-pointer ${
                worldId === w.id
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{w.emoji}</span>
              <span aria-hidden="true" className="tabular-nums">
                {done}/{w.words.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 shadow-lg text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {world.emoji} {world.title}
          </span>
          <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
        </div>

        {/* The English word is only heard, never shown, until it has been found */}
        <button
          {...skin()}
          type="button"
          onClick={() => sound.speakEnglish(word.word)}
          aria-label="Ascolta la parola inglese"
          className={`mx-auto flex flex-col items-center justify-center gap-1 w-36 h-36 rounded-full bg-emerald-50 border-4 border-emerald-300 hover:bg-emerald-100 text-emerald-800 shadow-md cursor-pointer active:scale-95 transition-transform`}
        >
          <Volume2 className="w-14 h-14" aria-hidden="true" />
          <span className="text-sm font-black">Listen</span>
        </button>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          {choices.map((c) => {
            const isRight = c.word === word.word;
            const isWrong = wrongPicks.includes(c.word);
            let style = 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200';
            if (solved && isRight) style = 'bg-emerald-100 border-emerald-500 scale-105 shadow-md';
            else if (isWrong) style = 'bg-slate-100 border-slate-200 opacity-40';
            return (
              <button
                {...skin()}
                key={c.word}
                type="button"
                onClick={() => handleChoice(c)}
                disabled={solved || isWrong}
                aria-label={`Immagine ${c.emoji}`}
                data-correct={isRight ? 'true' : 'false'}
                className={`h-24 sm:h-28 rounded-3xl border-2 text-5xl sm:text-6xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${style}`}
              >
                {c.emoji}
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
                <span className="text-5xl" aria-hidden="true">{word.emoji}</span>
                <span className={`text-4xl ${textStyleClass(textStyle)}`}>{applyTextStyle(word.word, textStyle)}</span>
                <SpeakButton text={word.word} lang="en-GB" rate={0.75} label="Ascolta la parola inglese" />
              </div>
              <p className="text-sm font-bold text-emerald-700">
                {wasNew
                  ? `🌟 Nuova parola inglese! +${ENGLISH_WORD_REWARD_STARS} ⭐`
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
