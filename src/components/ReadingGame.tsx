import React, { useEffect, useMemo, useRef, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { BookOpen, Check, Puzzle, RotateCcw } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  READING_LEVELS,
  pickImageChoices,
  readingRoundOrder,
  shuffleSyllables,
  suggestedReadingLevel,
  type ReadingLevel,
  type ReadingWord,
} from '../data/readingWords';
import { dayNumber } from '../data/dailyWords';
import { READ_REPEAT_REWARD_STARS, READ_WORD_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { SpeakButton } from './SpeakButton';
import { SyllableText } from './SyllableText';
import { WordDiary } from './WordDiary';

interface ReadingGameProps {
  /** Words already read well (the diary), uppercase. */
  readWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** A word was read correctly: it goes into the diary. */
  onWordRead: (word: string) => void;
  onWrongAnswer?: () => void;
}

type Mode = 'choose' | 'order';

const LEVEL_LABELS: Record<ReadingLevel, string> = { 1: 'Corte', 2: 'Medie', 3: 'Lunghe' };
const SYLLABLE_PAUSE_MS = 750;
const CHOICES = 3;

const CHOOSE_INSTRUCTION = "Leggi la parola e tocca l'immagine giusta!";

export const ReadingGame: React.FC<ReadingGameProps> = ({
  readWords,
  textStyle,
  onRewardStars,
  onWordRead,
  onWrongAnswer,
}) => {
  const [mode, setMode] = useState<Mode>('choose');
  // The level grows with the child, but only between two words (never under her fingers);
  // once a level is picked by hand it stays.
  const [level, setLevel] = useState<ReadingLevel>(() => suggestedReadingLevel(readWords));
  const [levelPickedByHand, setLevelPickedByHand] = useState(false);
  const [showDiary, setShowDiary] = useState(false);

  // The order of the words is fixed when the level changes, so words read meanwhile do not reshuffle it.
  const [startRead] = useState(readWords);
  const queue = useMemo(
    () => readingRoundOrder(level, startRead, dayNumber(new Date()) + level),
    [level, startRead]
  );
  const [index, setIndex] = useState(0);
  const word = queue[index % queue.length];

  const [activeSyllable, setActiveSyllable] = useState<number | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Reads the word syllable by syllable, highlighting each one, then the whole word. */
  const readAloud = (w: ReadingWord) => {
    clearTimers();
    w.syllables.forEach((syl, i) => {
      timers.current.push(
        setTimeout(() => {
          setActiveSyllable(i);
          sound.speak(syl.toLowerCase(), 0.8, 1.1);
        }, i * SYLLABLE_PAUSE_MS)
      );
    });
    timers.current.push(
      setTimeout(() => {
        setActiveSyllable(null);
        sound.speak(w.word.toLowerCase(), 0.85, 1.1);
      }, w.syllables.length * SYLLABLE_PAUSE_MS)
    );
  };

  // --- "Leggi e scegli" state
  const choices = useMemo(() => pickImageChoices(word, CHOICES), [word, index]);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);

  // --- "Metti in ordine" state
  const tiles = useMemo(() => shuffleSyllables(word.syllables), [word, index]);
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const [orderMistakes, setOrderMistakes] = useState(0);

  const placed = usedTiles.map((t) => tiles[t]);
  const nextExpected = word.syllables[placed.length];
  const hintTile =
    orderMistakes >= 2 && !solved
      ? tiles.findIndex((syl, i) => syl === nextExpected && !usedTiles.includes(i))
      : -1;

  const resetRound = () => {
    clearTimers();
    setActiveSyllable(null);
    setWrongPicks([]);
    setSolved(false);
    setWasNew(false);
    setUsedTiles([]);
    setOrderMistakes(0);
  };

  // New word, level or game: reset and (after a short pause) tell what to do.
  useEffect(() => {
    resetRound();
    const timer = setTimeout(() => {
      if (mode === 'choose') sound.speakInstruction(CHOOSE_INSTRUCTION);
      else sound.speakInstruction(`Metti in ordine le sillabe: ${word.word.toLowerCase()}!`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, level]);

  useEffect(() => setIndex(0), [level, mode]);

  const complete = () => {
    const isNew = !readWords.includes(word.word);
    setWasNew(isNew);
    setSolved(true);
    onWordRead(word.word);
    onRewardStars(isNew ? READ_WORD_REWARD_STARS : READ_REPEAT_REWARD_STARS);
    celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    clearTimers();
    timers.current.push(
      setTimeout(() => sound.speak(`Bravissima! Hai letto ${word.word.toLowerCase()}!`), 400)
    );
  };

  const handleChoice = (picked: ReadingWord) => {
    if (solved || wrongPicks.includes(picked.word)) return;
    if (picked.word === word.word) {
      sound.playSuccessChime();
      complete();
    } else {
      sound.playErrorSoft();
      setWrongPicks((prev) => [...prev, picked.word]);
      onWrongAnswer?.();
      readAloud(word);
    }
  };

  const handleTile = (tileIndex: number) => {
    if (solved || usedTiles.includes(tileIndex)) return;
    const syl = tiles[tileIndex];
    if (syl === nextExpected) {
      sound.playClick();
      sound.speak(syl.toLowerCase(), 0.8, 1.1);
      const nextUsed = [...usedTiles, tileIndex];
      setUsedTiles(nextUsed);
      setOrderMistakes(0);
      if (nextUsed.length === word.syllables.length) {
        sound.playFanfare();
        complete();
      }
    } else {
      sound.playErrorSoft();
      setOrderMistakes((m) => m + 1);
      onWrongAnswer?.();
    }
  };

  const modeButton = (id: Mode, Icon: typeof BookOpen, label: string) => (
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
          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
          : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
      }`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  const wordSize = word.word.length > 8 ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Game mode */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {modeButton('choose', BookOpen, 'Leggi e scegli')}
        {modeButton('order', Puzzle, 'Metti in ordine')}
      </div>

      {/* Level + diary */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <div role="group" aria-label="Lunghezza delle parole" className="flex items-center gap-1.5">
          {READING_LEVELS.map((lv) => (
            <button
              {...skin()}
              key={lv}
              type="button"
              aria-pressed={level === lv}
              aria-label={`Parole ${LEVEL_LABELS[lv].toLowerCase()}`}
              onClick={() => {
                setLevel(lv);
                setLevelPickedByHand(true);
                sound.playClick();
              }}
              className={`px-3 ${TOUCH_TARGET} rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
                level === lv
                  ? 'bg-rose-400 text-white border-rose-500 shadow-xs'
                  : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span aria-hidden="true">{'⭐'.repeat(lv)}</span>
              <span className="block text-[11px] leading-tight">{LEVEL_LABELS[lv]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setShowDiary(true);
          }}
          className={`inline-flex items-center gap-2 px-4 ${TOUCH_TARGET} rounded-2xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-sm cursor-pointer`}
        >
          <span aria-hidden="true">📖</span>
          <span>Diario</span>
          <span className="bg-white rounded-full px-2 py-0.5 text-xs tabular-nums" data-testid="diary-count">
            {readWords.length}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
        {mode === 'choose' ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Leggi e scegli</span>
              <SpeakButton text={CHOOSE_INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
            </div>

            {/* The word to read, syllable by syllable */}
            <button
              {...skin()}
              type="button"
              onClick={() => readAloud(word)}
              aria-label="Ascolta la parola sillaba per sillaba"
              className={`mx-auto block ${TOUCH_TARGET} rounded-3xl px-6 py-4 bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 cursor-pointer active:scale-95 transition-transform`}
            >
              <SyllableText
                syllables={word.syllables}
                textStyle={textStyle}
                activeIndex={activeSyllable}
                className={wordSize}
              />
            </button>
            <div className="mt-3 mb-6 flex justify-center">
              <SpeakButton withLabel text={word.word.toLowerCase()} label="Ascolta la parola" rate={0.8} />
            </div>

            {/* Few, big pictures */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto">
              {choices.map((c) => {
                const isRight = c.word === word.word;
                const isWrong = wrongPicks.includes(c.word);
                let style = 'bg-amber-50/80 hover:bg-amber-100 border-amber-200';
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
                Quasi! Ascolta le sillabe e riprova 👂
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Metti in ordine</span>
              <SpeakButton
                text={`Metti in ordine le sillabe: ${word.word.toLowerCase()}!`}
                label="Ascolta le istruzioni"
                asInstruction
              />
            </div>

            <div className="w-28 h-28 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-6xl shadow-inner mb-2 border border-amber-200">
              {word.emoji}
            </div>
            <div className="mb-5 flex justify-center">
              <SpeakButton withLabel text={word.word.toLowerCase()} label="Ascolta la parola" rate={0.8} />
            </div>

            {/* One slot per syllable */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6" data-testid="syllable-slots">
              {word.syllables.map((_, i) => {
                const filled = i < placed.length;
                return (
                  <div
                    key={i}
                    className={`min-w-16 h-16 sm:h-20 px-3 rounded-2xl border-2 flex items-center justify-center font-black text-3xl sm:text-4xl transition-all duration-200 ${textStyleClass(textStyle)} ${
                      filled
                        ? 'bg-amber-400 border-amber-500 text-white shadow-sm'
                        : 'bg-amber-50/60 border-dashed border-amber-300 text-slate-300'
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
                  {tiles.map((syl, i) => {
                    const used = usedTiles.includes(i);
                    return (
                      <button
                        {...skin()}
                        key={i}
                        type="button"
                        onClick={() => handleTile(i)}
                        disabled={used}
                        data-hint={hintTile === i ? 'true' : undefined}
                        className={`min-w-16 h-16 sm:h-20 px-4 rounded-2xl bg-white border-2 font-black text-3xl sm:text-4xl shadow-xs transition-all cursor-pointer active:scale-95 ${textStyleClass(textStyle)} ${
                          used
                            ? 'opacity-30 border-slate-200'
                            : hintTile === i
                              ? 'border-emerald-500 ring-4 ring-emerald-200 animate-pulse text-emerald-700'
                              : 'border-amber-300 hover:border-amber-500 hover:bg-amber-100 text-amber-950'
                        }`}
                      >
                        {applyTextStyle(syl, textStyle)}
                      </button>
                    );
                  })}
                </div>
                {orderMistakes > 0 && (
                  <p role="status" className="mb-3 text-rose-600 font-bold text-sm">
                    {orderMistakes >= 2 ? 'Ti aiuto io: guarda la sillaba che brilla ✨' : 'Quasi! Prova un’altra sillaba'}
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
          </>
        )}

        {/* Win panel (both games) */}
        {solved && (
          <div className="mt-6 pt-4 border-t border-amber-100 space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xl">
                <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
                <SyllableText syllables={word.syllables} textStyle={textStyle} className="text-3xl" />
              </div>
              <p className="text-sm font-bold text-amber-700">
                {wasNew
                  ? `📖 Nuova parola nel diario! +${READ_WORD_REWARD_STARS} ⭐`
                  : `+${READ_REPEAT_REWARD_STARS} ⭐`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                const suggested = suggestedReadingLevel(readWords);
                if (!levelPickedByHand && suggested > level) {
                  setLevel(suggested);
                } else {
                  setIndex((i) => i + 1);
                }
              }}
              className={`py-3.5 px-8 ${TOUCH_TARGET} bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-base rounded-2xl shadow-sm transition-all cursor-pointer`}
            >
              Prossima parola &rarr;
            </button>
          </div>
        )}
      </div>

      {showDiary && <WordDiary readWords={readWords} textStyle={textStyle} onClose={() => setShowDiary(false)} />}
    </div>
  );
};
