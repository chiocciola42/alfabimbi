import React, { useEffect, useMemo, useRef, useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { celebrate } from '../utils/celebrate';
import type { TextStyle } from '../types';
import { PICTURE_LETTERS, letterName, pictureLetterOrder, pictureRound } from '../data/italianPractice';
import { dayNumber } from '../data/dailyWords';
import { HUNT_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { LetterPicker, WinPanel } from './PracticePickers';
import { SpeakButton } from './SpeakButton';

interface InitialLetterGameProps {
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  /** Un giro concluso (conta nelle missioni di italiano). */
  onRoundComplete: () => void;
  onWrongAnswer?: () => void;
}

/** "Se la parola inizia con L, colora il cerchio di verde": sei disegni, si toccano quelli che iniziano con la lettera. */
export const InitialLetterGame: React.FC<InitialLetterGameProps> = ({ textStyle, onRewardStars, onRoundComplete, onWrongAnswer }) => {
  const [focus, setFocus] = useState<string | null>('L');
  const [index, setIndex] = useState(0);
  const order = useMemo(() => pictureLetterOrder(dayNumber(new Date())), []);
  const letter = focus ?? order[index % order.length];
  const round = useMemo(() => pictureRound(letter), [letter, index]);
  const targets = round.pictures.filter((p) => p.initial === letter);

  const [found, setFound] = useState<string[]>([]);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const solved = found.length === targets.length;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const instruction = `Dì il nome del disegno. Se la parola inizia con la lettera ${letterName(letter)}, tocca il cerchio!`;

  useEffect(() => setIndex(0), [focus]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setFound([]);
    setWrongPicks([]);
    setMistakes(0);
    const t = setTimeout(() => sound.speakInstruction(instruction), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, focus]);

  const handlePick = (word: string, initial: string) => {
    if (solved || found.includes(word) || wrongPicks.includes(word)) return;
    sound.speak(word.toLowerCase(), 0.85, 1.1);
    if (initial === letter) {
      sound.playSuccessChime();
      const next = [...found, word];
      setFound(next);
      setMistakes(0);
      if (next.length === targets.length) {
        onRoundComplete();
        onRewardStars(HUNT_REWARD_STARS);
        celebrate({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => sound.speak(`Bravissima! Hai trovato tutte le parole con la ${letterName(letter)}!`), 900);
      }
    } else {
      sound.playErrorSoft();
      setWrongPicks((p) => [...p, word]);
      setMistakes((m) => m + 1);
      onWrongAnswer?.();
    }
  };

  const hintWord = mistakes >= 2 && !solved ? targets.find((p) => !found.includes(p.word))?.word : undefined;
  const cls = textStyleClass(textStyle);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Inizia con…</span>
        <SpeakButton text={instruction} label="Ascolta le istruzioni" asInstruction />
      </div>
      <div className="mb-5">
        <LetterPicker letters={PICTURE_LETTERS} value={focus} onChange={setFocus} allowAll textStyle={textStyle} label="Lettera" />
      </div>

      <p className="text-lg sm:text-xl font-black text-slate-800 mb-5">
        Tocca i disegni che iniziano con la{' '}
        <span className={`inline-block px-3 rounded-xl bg-rose-100 text-rose-700 text-3xl align-middle ${cls}`} data-testid="target-letter">
          {applyTextStyle(letter, textStyle === 'upper' ? 'upper' : 'lower')}
        </span>
      </p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-lg mx-auto mb-4" data-testid="picture-grid">
        {round.pictures.map((p) => {
          const isFound = found.includes(p.word);
          const isWrong = wrongPicks.includes(p.word);
          const isHint = hintWord === p.word;
          return (
            <li key={p.word}>
              <button
                {...skin()}
                type="button"
                onClick={() => handlePick(p.word, p.initial)}
                disabled={isFound || isWrong || solved}
                aria-label={`Disegno ${p.emoji}`}
                data-starts={p.initial === letter ? 'true' : 'false'}
                data-hint={isHint ? 'true' : undefined}
                className={`w-full min-h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 py-3 transition-all duration-150 cursor-pointer active:scale-95 ${
                  isFound
                    ? 'bg-emerald-50 border-emerald-400'
                    : isWrong
                      ? 'bg-slate-100 border-slate-200 opacity-40'
                      : isHint
                        ? 'bg-amber-50 border-emerald-500 ring-4 ring-emerald-200 animate-pulse'
                        : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200'
                }`}
              >
                <span className="text-5xl sm:text-6xl leading-none" aria-hidden="true">{p.emoji}</span>
                <span
                  aria-hidden="true"
                  data-testid={isFound ? 'circle-green' : 'circle'}
                  className={`w-9 h-9 rounded-full border-2 transition-colors ${isFound ? 'bg-emerald-400 border-emerald-500' : 'bg-white border-slate-300'}`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {!solved && wrongPicks.length > 0 && (
        <p role="status" className="text-rose-600 font-bold text-sm">
          {mistakes >= 2 ? 'Ti aiuto io: guarda il disegno che brilla ✨' : 'Quasi! Dì il nome e ascolta come inizia 👂'}
        </p>
      )}
      {!solved && <p className="text-sm font-bold text-slate-600 tabular-nums">Trovati {found.length} su {targets.length}</p>}

      {solved && (
        <WinPanel reward={`🟢 Tutte trovate! +${HUNT_REWARD_STARS} ⭐`} nextLabel="Altri disegni" onNext={() => setIndex((i) => i + 1)} />
      )}
    </div>
  );
};
