import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import {
  SYLLABLE_CONSONANTS,
  exampleFor,
  syllableChoices,
  syllableQueue,
  writeTiles,
  type SyllableDirection,
} from '../data/italianPractice';
import { dayNumber } from '../data/dailyWords';
import { SYLLABLE_REPEAT_REWARD_STARS, SYLLABLE_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { LetterPicker, WinPanel } from './PracticePickers';
import { SpeakButton } from './SpeakButton';

interface SyllableDrillProps {
  /** `find`: si ascolta la sillaba e si tocca quella scritta; `write`: si ascolta e si scrive con le lettere. */
  kind: 'find' | 'write';
  /** Sillabe già imparate (maiuscole). */
  learned: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  onSyllableLearned: (syllable: string) => void;
  onWrongAnswer?: () => void;
}

const INSTRUCTIONS = {
  find: 'Ascolta la sillaba e tocca quella giusta!',
  write: 'Ascolta la sillaba e scrivila: tocca le lettere nell’ordine giusto!',
} as const;

const DIRECTIONS: { id: SyllableDirection; label: string }[] = [
  { id: 'direct', label: 'LA LE LI' },
  { id: 'inverse', label: 'AL EL IL' },
  { id: 'both', label: 'Tutte' },
];

/** Allenamento sulle sillabe: "trova la sillaba" (lettura) e "scrivi la sillaba" (scrittura guidata). */
export const SyllableDrill: React.FC<SyllableDrillProps> = ({
  kind,
  learned,
  textStyle,
  onRewardStars,
  onSyllableLearned,
  onWrongAnswer,
}) => {
  const [consonant, setConsonant] = useState('L');
  const [direction, setDirection] = useState<SyllableDirection>('direct');
  // L'ordine si fissa all'inizio: le sillabe imparate mentre si gioca non lo rimescolano.
  const [startLearned] = useState(learned);
  const queue = useMemo(
    () => syllableQueue(consonant, direction, startLearned, dayNumber(new Date())),
    [consonant, direction, startLearned]
  );
  const [index, setIndex] = useState(0);
  const target = queue[index % queue.length];
  const example = exampleFor(target);

  const choices = useMemo(() => syllableChoices(target), [target, index]);
  const tiles = useMemo(() => writeTiles(target), [target, index]);

  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wasNew, setWasNew] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const say = (rate = 0.7) => sound.speak(target.toLowerCase(), rate, 1.1);

  const resetRound = () => {
    clearTimer();
    setWrongPicks([]);
    setUsedTiles([]);
    setMistakes(0);
    setSolved(false);
    setWasNew(false);
  };

  useEffect(() => setIndex(0), [consonant, direction, kind]);

  // Nuova sillaba: si riparte da capo e, dopo una breve pausa, la voce spiega cosa fare e la dice.
  useEffect(() => {
    resetRound();
    const t = setTimeout(
      () =>
        sound.speakInstructionParts([
          { text: INSTRUCTIONS[kind] },
          { text: target.toLowerCase(), rate: 0.7, pitch: 1.1 },
        ]),
      300
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, kind, consonant, direction]);

  const complete = () => {
    const isNew = !learned.includes(target);
    setWasNew(isNew);
    setSolved(true);
    onSyllableLearned(target);
    onRewardStars(isNew ? SYLLABLE_REWARD_STARS : SYLLABLE_REPEAT_REWARD_STARS);
    celebrate({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    clearTimer();
    timer.current = setTimeout(() => sound.speak(`Bravissima! ${target.toLowerCase()}`, 0.8, 1.15), 400);
  };

  const handleChoice = (syl: string) => {
    if (solved || wrongPicks.includes(syl)) return;
    if (syl === target) {
      sound.playSuccessChime();
      complete();
    } else {
      sound.playErrorSoft();
      setWrongPicks((p) => [...p, syl]);
      onWrongAnswer?.();
      say();
    }
  };

  const placed = usedTiles.map((t) => tiles[t]);
  const nextExpected = target[placed.length];
  const hintTile =
    kind === 'write' && mistakes >= 2 && !solved ? tiles.findIndex((l, i) => l === nextExpected && !usedTiles.includes(i)) : -1;

  const handleTile = (i: number) => {
    if (solved || usedTiles.includes(i)) return;
    if (tiles[i] === nextExpected) {
      sound.playClick();
      const nextUsed = [...usedTiles, i];
      setUsedTiles(nextUsed);
      setMistakes(0);
      if (nextUsed.length === target.length) {
        sound.playFanfare();
        complete();
      }
    } else {
      sound.playErrorSoft();
      setMistakes((m) => m + 1);
      onWrongAnswer?.();
    }
  };

  const cls = textStyleClass(textStyle);
  const show = (t: string) => applyTextStyle(t, textStyle);
  const letterTileText = (l: string) => applyTextStyle(l, textStyle);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
          {kind === 'find' ? 'Trova la sillaba' : 'Scrivi la sillaba'}
        </span>
        <SpeakButton text={INSTRUCTIONS[kind]} label="Ascolta le istruzioni" asInstruction />
      </div>

      <div className="mb-3">
        <LetterPicker
          letters={SYLLABLE_CONSONANTS}
          value={consonant}
          onChange={(l) => l && setConsonant(l)}
          textStyle={textStyle}
          label="Consonante"
          itemLabel="Consonante"
        />
      </div>
      <div role="group" aria-label="Verso delle sillabe" className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
        {DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={direction === d.id}
            onClick={() => {
              sound.playClick();
              setDirection(d.id);
            }}
            className={`px-4 ${TOUCH_TARGET} rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
              direction === d.id ? 'bg-sky-500 text-white border-sky-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
            }`}
          >
            {d.id === 'both' ? d.label : show(d.label)}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col items-center gap-2">
        {kind === 'write' && example && (
          <div className="w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center text-5xl shadow-inner border border-amber-200">
            {example.emoji}
          </div>
        )}
        <button
          type="button"
          onClick={() => say(0.7)}
          aria-label="Ascolta la sillaba"
          className={`inline-flex items-center gap-2 px-6 ${TOUCH_TARGET} rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-amber-900 font-black text-lg cursor-pointer active:scale-95 transition-transform`}
        >
          <span aria-hidden="true">🔊</span>
          <span>Ascolta</span>
        </button>
      </div>

      {kind === 'find' ? (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto" data-testid="syllable-choices">
          {choices.map((syl) => {
            const isRight = syl === target;
            const isWrong = wrongPicks.includes(syl);
            let style = 'bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-slate-900';
            if (solved && isRight) style = 'bg-emerald-100 border-emerald-500 scale-105 shadow-md text-emerald-800';
            else if (isWrong) style = 'bg-slate-100 border-slate-200 opacity-40 text-slate-500';
            return (
              <button
                key={syl}
                type="button"
                onClick={() => handleChoice(syl)}
                disabled={solved || isWrong}
                aria-label={`Sillaba ${syl}`}
                data-correct={isRight ? 'true' : 'false'}
                className={`h-24 rounded-3xl border-2 font-black text-4xl sm:text-5xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 ${cls} ${style}`}
              >
                {show(syl)}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6" data-testid="letter-slots">
            {target.split('').map((_, i) => {
              const filled = i < placed.length;
              return (
                <div
                  key={i}
                  className={`w-16 h-20 sm:h-24 rounded-2xl border-2 flex items-center justify-center font-black text-4xl sm:text-5xl transition-all duration-200 ${cls} ${
                    filled ? 'bg-amber-400 border-amber-500 text-white shadow-sm' : 'bg-amber-50/60 border-dashed border-amber-300 text-slate-300'
                  }`}
                >
                  {filled ? letterTileText(placed[i]) : '·'}
                </div>
              );
            })}
          </div>
          {!solved && (
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-md mx-auto mb-4">
              {tiles.map((letter, i) => {
                const used = usedTiles.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTile(i)}
                    disabled={used}
                    aria-label={`Lettera ${letter}`}
                    data-hint={hintTile === i ? 'true' : undefined}
                    className={`w-16 h-16 sm:h-20 rounded-2xl bg-white border-2 font-black text-4xl shadow-xs transition-all cursor-pointer active:scale-95 ${cls} ${
                      used
                        ? 'opacity-30 border-slate-200'
                        : hintTile === i
                          ? 'border-emerald-500 ring-4 ring-emerald-200 animate-pulse text-emerald-700'
                          : 'border-amber-300 hover:border-amber-500 hover:bg-amber-100 text-slate-800'
                    }`}
                  >
                    {letterTileText(letter)}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {!solved && kind === 'find' && wrongPicks.length > 0 && (
        <p role="status" className="mt-4 text-rose-600 font-bold text-sm">Quasi! Ascolta bene e riprova 👂</p>
      )}
      {!solved && kind === 'write' && (
        <>
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
        <WinPanel
          reward={wasNew ? `🔤 Nuova sillaba! +${SYLLABLE_REWARD_STARS} ⭐` : `+${SYLLABLE_REPEAT_REWARD_STARS} ⭐`}
          nextLabel="Prossima sillaba"
          onNext={() => setIndex((i) => i + 1)}
        >
          <div className={`flex items-center justify-center gap-2 text-emerald-600 font-black text-4xl ${cls}`}>
            <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
            <span>{show(target)}</span>
          </div>
        </WinPanel>
      )}
    </div>
  );
};
