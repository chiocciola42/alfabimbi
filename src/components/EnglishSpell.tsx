import React, { useEffect, useMemo, useRef, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { Check, RotateCcw } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import { shuffleLetters, spellingOrder } from '../data/englishFamilies';
import { dayNumber } from '../data/dailyWords';
import { ENGLISH_REPEAT_REWARD_STARS, ENGLISH_SPELL_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';

interface EnglishSpellProps {
  /** Words already built with the letters (lowercase). */
  spelledWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A word was built correctly. */
  onWordSpelled: (word: string) => void;
  onWrongAnswer?: () => void;
}

const INSTRUCTION = 'Ascolta la parola e metti le lettere in ordine!';

/** Guided writing: picture and sound of a short word, the child touches its letters in the right order. */
export const EnglishSpell: React.FC<EnglishSpellProps> = ({
  spelledWords,
  textStyle,
  onRewardStars,
  onWordSpelled,
  onWrongAnswer,
}) => {
  // The order is fixed once, so words spelled meanwhile do not reshuffle it.
  const [startSpelled] = useState(spelledWords);
  const queue = useMemo(() => spellingOrder(startSpelled, dayNumber(new Date())), [startSpelled]);
  const [index, setIndex] = useState(0);
  const target = queue[index % queue.length];
  const tiles = useMemo(() => shuffleLetters(target.word), [target, index]);

  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const placed = usedTiles.map((t) => tiles[t]);
  const solved = placed.length === target.word.length;
  const nextExpected = target.word[placed.length];
  const hintTile =
    mistakes >= 2 && !solved ? tiles.findIndex((l, i) => l === nextExpected && !usedTiles.includes(i)) : -1;

  const resetRound = () => {
    clearTimer();
    setUsedTiles([]);
    setMistakes(0);
    setWasNew(false);
  };

  // New word: reset and, after a short pause, say what to do and the English word.
  useEffect(() => {
    resetRound();
    const t = setTimeout(
      () =>
        sound.speakInstructionParts([
          { text: INSTRUCTION },
          { text: target.word, lang: 'en-GB', rate: 0.75, pitch: 1.05 },
        ]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleTile = (tileIndex: number) => {
    if (solved || usedTiles.includes(tileIndex)) return;
    if (tiles[tileIndex] === nextExpected) {
      sound.playClick();
      const nextUsed = [...usedTiles, tileIndex];
      setUsedTiles(nextUsed);
      setMistakes(0);
      if (nextUsed.length === target.word.length) {
        const isNew = !spelledWords.includes(target.word);
        sound.playFanfare();
        setWasNew(isNew);
        onWordSpelled(target.word);
        onRewardStars(isNew ? ENGLISH_SPELL_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
        celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        clearTimer();
        timer.current = setTimeout(
          () => sound.speakParts([{ text: 'Bravissima!' }, { text: target.word, lang: 'en-GB', rate: 0.7, pitch: 1.05 }]),
          400
        );
      }
    } else {
      sound.playErrorSoft();
      setMistakes((m) => m + 1);
      onWrongAnswer?.();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Costruisci la parola</span>
        <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
      </div>

      <div className="w-28 h-28 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center text-6xl shadow-inner mb-2 border border-emerald-200">
        {target.emoji}
      </div>
      <div className="mb-5 flex justify-center">
        <SpeakButton withLabel text={target.word} lang="en-GB" rate={0.7} label="Ascolta la parola inglese" />
      </div>

      {/* One slot per letter */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6" data-testid="letter-slots">
        {target.word.split('').map((_, i) => {
          const filled = i < placed.length;
          return (
            <div
              key={i}
              className={`w-16 h-20 sm:h-24 rounded-2xl border-2 flex items-center justify-center font-black text-4xl sm:text-5xl transition-all duration-200 ${textStyleClass(textStyle)} ${
                filled
                  ? 'bg-emerald-400 border-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-50/60 border-dashed border-emerald-300 text-slate-300'
              }`}
            >
              {filled ? applyTextStyle(placed[i], textStyle) : '·'}
            </div>
          );
        })}
      </div>

      {!solved && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-md mx-auto mb-5">
            {tiles.map((letter, i) => {
              const used = usedTiles.includes(i);
              return (
                <button
                  {...skin()}
                  key={i}
                  type="button"
                  onClick={() => handleTile(i)}
                  disabled={used}
                  aria-label={`Lettera ${letter.toUpperCase()}`}
                  data-hint={hintTile === i ? 'true' : undefined}
                  className={`w-16 h-16 sm:h-20 rounded-2xl bg-white border-2 font-black text-4xl shadow-xs transition-all cursor-pointer active:scale-95 ${textStyleClass(textStyle)} ${
                    used
                      ? 'opacity-30 border-slate-200'
                      : hintTile === i
                        ? 'border-emerald-500 ring-4 ring-emerald-200 animate-pulse text-emerald-700'
                        : 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 text-slate-800'
                  }`}
                >
                  {applyTextStyle(letter, textStyle)}
                </button>
              );
            })}
          </div>
          {mistakes > 0 && (
            <p role="status" className="mb-3 text-rose-600 font-bold text-sm">
              {mistakes >= 2 ? 'Ti aiuto io: guarda la lettera che brilla ✨' : 'Quasi! Prova un’altra lettera'}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              resetRound();
            }}
            className={`inline-flex items-center gap-1.5 px-4 ${TOUCH_TARGET} text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer`}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Ricomincia</span>
          </button>
        </>
      )}

      {solved && (
        <div className="mt-2 pt-4 border-t border-emerald-100 space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black">
              <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
              <span className={`text-3xl ${textStyleClass(textStyle)}`}>{applyTextStyle(target.word, textStyle)}</span>
            </div>
            <p className="text-sm font-bold text-emerald-700">
              {wasNew
                ? `✍️ Hai scritto una nuova parola! +${ENGLISH_SPELL_REWARD_STARS} ⭐`
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
  );
};
