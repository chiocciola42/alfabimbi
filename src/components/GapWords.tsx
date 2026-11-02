import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import { readingRoundOrder, suggestedReadingLevel, type ReadingLevel } from '../data/readingWords';
import { gapChoices, gapQuestion } from '../data/italianPractice';
import { dayNumber } from '../data/dailyWords';
import { READ_REPEAT_REWARD_STARS, READ_WORD_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { SYLLABLE_COLORS } from './SyllableText';
import { LevelPicker, WinPanel } from './PracticePickers';
import { SpeakButton } from './SpeakButton';

interface GapWordsProps {
  /** Parole già lette bene (il diario), in maiuscolo. */
  readWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** La parola è stata completata: entra nel diario. */
  onWordRead: (word: string) => void;
  onWrongAnswer?: () => void;
}

const INSTRUCTION = 'Completa la parola con la sillaba giusta!';

/** "Completa con le sillabe corrette": una parola con una sillaba nascosta e tre sillabe tra cui scegliere. */
export const GapWords: React.FC<GapWordsProps> = ({ readWords, textStyle, onRewardStars, onWordRead, onWrongAnswer }) => {
  const [level, setLevel] = useState<ReadingLevel>(() => suggestedReadingLevel(readWords));
  const [startRead] = useState(readWords);
  const queue = useMemo(() => readingRoundOrder(level, startRead, dayNumber(new Date())), [level, startRead]);
  const [index, setIndex] = useState(0);
  const word = queue[index % queue.length];
  const question = useMemo(() => gapQuestion(word, Math.floor(index / queue.length)), [word, index, queue.length]);
  const choices = useMemo(() => gapChoices(question), [question]);

  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  useEffect(() => setIndex(0), [level]);

  // Nuova parola: si ricomincia e, dopo una pausa, la voce spiega cosa fare e dice la parola.
  useEffect(() => {
    clearTimer();
    setWrongPicks([]);
    setSolved(false);
    setWasNew(false);
    const t = setTimeout(
      () => sound.speakInstructionParts([{ text: INSTRUCTION }, { text: word.word.toLowerCase(), rate: 0.8, pitch: 1.1 }]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, level]);

  const handleChoice = (syl: string) => {
    if (solved || wrongPicks.includes(syl)) return;
    if (syl === question.missing) {
      sound.playSuccessChime();
      const isNew = !readWords.includes(word.word);
      setWasNew(isNew);
      setSolved(true);
      onWordRead(word.word);
      onRewardStars(isNew ? READ_WORD_REWARD_STARS : READ_REPEAT_REWARD_STARS);
      celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      clearTimer();
      timer.current = setTimeout(() => sound.speak(`Bravissima! ${word.word.toLowerCase()}`, 0.85, 1.1), 400);
    } else {
      sound.playErrorSoft();
      setWrongPicks((p) => [...p, syl]);
      onWrongAnswer?.();
      sound.speak(word.word.toLowerCase(), 0.8, 1.1);
    }
  };

  const cls = textStyleClass(textStyle);
  const size = word.word.length > 8 ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-6xl';
  const accessibleWord = word.syllables.map((s, i) => (i === question.index ? '…' : s.toLowerCase())).join('');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Completa la parola</span>
        <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
      </div>
      <div className="mb-5">
        <LevelPicker level={level} onChange={setLevel} />
      </div>

      <div className="w-28 h-28 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-6xl shadow-inner mb-2 border border-amber-200">
        {word.emoji}
      </div>
      <div className="mb-4 flex justify-center">
        <SpeakButton withLabel text={word.word.toLowerCase()} label="Ascolta la parola" rate={0.8} />
      </div>

      {/* La parola con la sillaba nascosta */}
      <div
        role="img"
        aria-label={`Parola da completare: ${accessibleWord}`}
        data-testid="gap-word"
        className={`flex items-baseline justify-center gap-1.5 font-black tracking-wide mb-6 ${size} ${cls}`}
      >
        {word.syllables.map((syl, i) =>
          i === question.index ? (
            <span
              key={i}
              data-testid="gap-slot"
              className={`min-w-[2.2em] px-2 rounded-2xl border-2 text-center transition-all duration-200 ${
                solved ? `border-emerald-400 bg-emerald-100 ${SYLLABLE_COLORS[i % SYLLABLE_COLORS.length]}` : 'border-dashed border-amber-400 bg-amber-50 text-slate-300'
              }`}
            >
              {solved ? applyTextStyle(syl, textStyle) : '…'}
            </span>
          ) : (
            <span key={i} className={SYLLABLE_COLORS[i % SYLLABLE_COLORS.length]}>
              {applyTextStyle(syl, textStyle)}
            </span>
          )
        )}
      </div>

      {!solved && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto" data-testid="gap-choices">
          {choices.map((syl) => {
            const isWrong = wrongPicks.includes(syl);
            return (
              <button
                key={syl}
                type="button"
                onClick={() => handleChoice(syl)}
                disabled={isWrong}
                aria-label={`Sillaba ${syl}`}
                data-correct={syl === question.missing ? 'true' : 'false'}
                className={`h-20 rounded-3xl border-2 font-black text-3xl sm:text-4xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${cls} ${
                  isWrong ? 'bg-slate-100 border-slate-200 opacity-40 text-slate-500' : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-slate-900'
                }`}
              >
                {applyTextStyle(syl, textStyle)}
              </button>
            );
          })}
        </div>
      )}
      {!solved && wrongPicks.length > 0 && (
        <p role="status" className="mt-4 text-rose-600 font-bold text-sm">Quasi! Leggi la parola e riprova 👀</p>
      )}

      {solved && (
        <WinPanel
          reward={wasNew ? `📖 Nuova parola nel diario! +${READ_WORD_REWARD_STARS} ⭐` : `+${READ_REPEAT_REWARD_STARS} ⭐`}
          nextLabel="Prossima parola"
          onNext={() => setIndex((i) => i + 1)}
        >
          <div className={`flex items-center justify-center gap-2 text-emerald-600 font-black text-3xl ${cls}`}>
            <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
            <span>{applyTextStyle(word.word, textStyle)}</span>
          </div>
        </WinPanel>
      )}
    </div>
  );
};
