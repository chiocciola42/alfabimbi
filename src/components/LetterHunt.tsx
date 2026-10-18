import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { TextStyle } from '../types';
import { HUNT_LETTERS, huntQueue, letterName } from '../data/italianPractice';
import { suggestedReadingLevel, type ReadingLevel } from '../data/readingWords';
import { dayNumber } from '../data/dailyWords';
import { HUNT_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { LetterPicker, LevelPicker, WinPanel } from './PracticePickers';
import { SpeakButton } from './SpeakButton';

interface LetterHuntProps {
  readWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** Un giro concluso (conta nelle missioni di italiano). */
  onRoundComplete: () => void;
  onWrongAnswer?: () => void;
}

/** "Ascolta le parole e cerchia tutte le L": si toccano, una a una, le lettere uguali a quella cercata. */
export const LetterHunt: React.FC<LetterHuntProps> = ({ readWords, textStyle, onRewardStars, onRoundComplete, onWrongAnswer }) => {
  const [focus, setFocus] = useState<string | null>('L');
  const [level, setLevel] = useState<ReadingLevel>(() => Math.min(2, suggestedReadingLevel(readWords)) as ReadingLevel);
  const queue = useMemo(() => huntQueue(focus, level, dayNumber(new Date())), [focus, level]);
  const [index, setIndex] = useState(0);
  const item = queue[index % queue.length];
  const letters = item.word.word.split('');
  const total = letters.filter((l) => l === item.letter).length;

  const [circled, setCircled] = useState<number[]>([]);
  const [wrongTaps, setWrongTaps] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const solved = circled.length === total;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const instruction = `Ascolta la parola e cerchia tutte le lettere ${letterName(item.letter)}!`;

  useEffect(() => setIndex(0), [focus, level]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setCircled([]);
    setWrongTaps([]);
    setMistakes(0);
    const t = setTimeout(
      () => sound.speakInstructionParts([{ text: instruction }, { text: item.word.word.toLowerCase(), rate: 0.75, pitch: 1.1 }]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, focus, level]);

  const handleTap = (i: number) => {
    if (solved || circled.includes(i) || wrongTaps.includes(i)) return;
    if (letters[i] === item.letter) {
      sound.playClick();
      const next = [...circled, i];
      setCircled(next);
      setMistakes(0);
      if (next.length === total) {
        sound.playFanfare();
        onRoundComplete();
        onRewardStars(HUNT_REWARD_STARS);
        try {
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        } catch {
          // canvas not available
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(
          () => sound.speak(`Bravissima! Nella parola ${item.word.word.toLowerCase()} ci sono ${total} ${letterName(item.letter)}!`),
          500
        );
      }
    } else {
      sound.playErrorSoft();
      setWrongTaps((w) => [...w, i]);
      setMistakes((m) => m + 1);
      onWrongAnswer?.();
    }
  };

  const hintIndex = mistakes >= 2 && !solved ? letters.findIndex((l, i) => l === item.letter && !circled.includes(i)) : -1;
  const cls = textStyleClass(textStyle);
  const letterShown = applyTextStyle(item.letter, textStyle === 'upper' ? 'upper' : 'lower');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Cerchia le lettere</span>
        <SpeakButton text={instruction} label="Ascolta le istruzioni" asInstruction />
      </div>
      <div className="mb-3">
        <LetterPicker letters={HUNT_LETTERS} value={focus} onChange={setFocus} allowAll textStyle={textStyle} label="Lettera" />
      </div>
      <div className="mb-5">
        <LevelPicker level={level} onChange={setLevel} />
      </div>

      <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-5xl shadow-inner mb-2 border border-amber-200">
        {item.word.emoji}
      </div>
      <div className="mb-4 flex justify-center">
        <SpeakButton withLabel text={item.word.word.toLowerCase()} label="Ascolta la parola" rate={0.8} />
      </div>

      <p className="text-lg font-black text-slate-800 mb-4">
        Cerchia tutte le{' '}
        <span className={`inline-block px-3 rounded-xl bg-rose-100 text-rose-700 text-3xl align-middle ${cls}`} data-testid="target-letter">
          {letterShown}
        </span>
      </p>

      <ul className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4" data-testid="hunt-word">
        {letters.map((l, i) => {
          const isCircled = circled.includes(i);
          const isWrong = wrongTaps.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleTap(i)}
                disabled={solved || isCircled || isWrong}
                aria-label={`Lettera ${l}`}
                data-circled={isCircled ? 'true' : undefined}
                data-hint={hintIndex === i ? 'true' : undefined}
                className={`w-14 h-16 sm:w-16 sm:h-20 rounded-full border-4 font-black text-3xl sm:text-5xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${cls} ${
                  isCircled
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : isWrong
                      ? 'border-transparent text-slate-300'
                      : hintIndex === i
                        ? 'border-emerald-400 ring-4 ring-emerald-200 animate-pulse text-slate-800'
                        : 'border-transparent bg-amber-50/70 text-slate-800 hover:bg-amber-100'
                }`}
              >
                {applyTextStyle(l, textStyle)}
              </button>
            </li>
          );
        })}
      </ul>

      {!solved && (
        <>
          {wrongTaps.length > 0 && (
            <p role="status" className="mb-2 text-rose-600 font-bold text-sm">
              {mistakes >= 2 ? 'Ti aiuto io: guarda la lettera che brilla ✨' : `Quasi! Cerca la ${letterShown}`}
            </p>
          )}
          <p className="text-sm font-bold text-slate-600 tabular-nums">Trovate {circled.length} su {total}</p>
        </>
      )}

      {solved && (
        <WinPanel reward={`⭕ Tutte cerchiate! +${HUNT_REWARD_STARS} ⭐`} nextLabel="Prossima parola" onNext={() => setIndex((i) => i + 1)} />
      )}
    </div>
  );
};
