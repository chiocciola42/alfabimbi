import React from 'react';
import { skin } from '../world3d/stage/skin';
import type { TextStyle } from '../types';
import { READING_LEVELS, type ReadingLevel } from '../data/readingWords';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';

interface LetterPickerProps {
  /** Lettere tra cui scegliere (maiuscole). */
  letters: readonly string[];
  /** Lettera scelta; `null` = tutte (solo se `allowAll`). */
  value: string | null;
  onChange: (letter: string | null) => void;
  allowAll?: boolean;
  textStyle: TextStyle;
  /** Nome accessibile del gruppo di pulsanti. */
  label: string;
  /** Parola che precede la lettera nel nome accessibile di ogni pulsante ("Consonante L"). */
  itemLabel?: string;
}

/** Fila di lettere per scegliere con quale lettera (o consonante) esercitarsi. */
export const LetterPicker: React.FC<LetterPickerProps> = ({ letters, value, onChange, allowAll = false, textStyle, label, itemLabel = 'Lettera da cercare' }) => {
  const style = (active: boolean) =>
    `${TOUCH_TARGET} rounded-2xl border-2 font-black text-xl transition-colors cursor-pointer active:scale-95 ${
      active ? 'bg-rose-400 text-white border-rose-500 shadow-xs' : 'bg-white text-slate-800 border-amber-200 hover:bg-amber-50'
    }`;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center justify-center gap-1.5">
      {allowAll && (
        <button
          {...skin()}
          type="button"
          aria-pressed={value === null}
          onClick={() => {
            sound.playClick();
            onChange(null);
          }}
          className={`${style(value === null)} px-3 text-sm`}
        >
          Tutte
        </button>
      )}
      {letters.map((l) => (
        <button
          {...skin()}
          key={l}
          type="button"
          aria-pressed={value === l}
          aria-label={`${itemLabel} ${l}`}
          onClick={() => {
            sound.playClick();
            onChange(l);
          }}
          className={`${style(value === l)} ${textStyleClass(textStyle)}`}
        >
          {applyTextStyle(l, textStyle === 'upper' ? 'upper' : 'lower')}
        </button>
      ))}
    </div>
  );
};

const LEVEL_LABELS: Record<ReadingLevel, string> = { 1: 'Corte', 2: 'Medie', 3: 'Lunghe' };

interface LevelPickerProps {
  level: ReadingLevel;
  onChange: (level: ReadingLevel) => void;
}

/** Lunghezza delle parole: 1, 2 o 3 stelline (le stesse del gioco "Leggi"). */
export const LevelPicker: React.FC<LevelPickerProps> = ({ level, onChange }) => (
  <div role="group" aria-label="Lunghezza delle parole" className="flex items-center justify-center gap-1.5">
    {READING_LEVELS.map((lv) => (
      <button
        {...skin()}
        key={lv}
        type="button"
        aria-pressed={level === lv}
        aria-label={`Parole ${LEVEL_LABELS[lv].toLowerCase()}`}
        onClick={() => {
          sound.playClick();
          onChange(lv);
        }}
        className={`px-3 ${TOUCH_TARGET} rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
          level === lv ? 'bg-rose-400 text-white border-rose-500 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
        }`}
      >
        <span aria-hidden="true">{'⭐'.repeat(lv)}</span>
        <span className="block text-[11px] leading-tight">{LEVEL_LABELS[lv]}</span>
      </button>
    ))}
  </div>
);

interface WinPanelProps {
  /** Testo con le stelle guadagnate ("+2 ⭐"). */
  reward: string;
  onNext: () => void;
  nextLabel?: string;
  children?: React.ReactNode;
}

/** Riquadro finale di ogni esercizio: bravo, stelle e pulsante per andare avanti. */
export const WinPanel: React.FC<WinPanelProps> = ({ reward, onNext, nextLabel = 'Avanti', children }) => (
  <div className="mt-6 pt-4 border-t border-amber-100 space-y-3 animate-in zoom-in-95 duration-200">
    <div aria-hidden="true" data-stage-prop="trophy" data-stage-stars="3" className="h-24" />
    {children}
    <p role="status" className="text-sm font-bold text-amber-700">{reward}</p>
    <button
      type="button"
      onClick={() => {
        sound.playClick();
        onNext();
      }}
      className={`py-3.5 px-8 ${TOUCH_TARGET} bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-base rounded-2xl shadow-sm transition-all cursor-pointer`}
    >
      {nextLabel} &rarr;
    </button>
  </div>
);
