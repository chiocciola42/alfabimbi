import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { TextStyle } from '../types';
import { READING_WORDS } from '../data/readingWords';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { sound } from '../utils/sound';
import { SpeakButton } from './SpeakButton';

interface WordDiaryProps {
  readWords: string[];
  textStyle: TextStyle;
  onClose: () => void;
}

/** "Il mio diario delle parole": a page that fills up with a picture for every word read well. */
export const WordDiary: React.FC<WordDiaryProps> = ({ readWords, textStyle, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const known = new Set(readWords);
  const learned = READING_WORDS.filter((w) => known.has(w.word)).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-title"
        className="bg-white rounded-3xl max-w-2xl w-full my-auto p-6 sm:p-7 border-2 border-amber-300 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute top-3 right-3 w-14 h-14 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-5 pr-10 pl-10">
          <div className="text-5xl mb-2" aria-hidden="true">📖</div>
          <h3 id="diary-title" className="text-2xl font-black text-slate-900">Il mio diario delle parole</h3>
          <p className="text-lg font-black text-amber-700 tabular-nums">
            {learned} / {READING_WORDS.length}
          </p>
          <div
            role="progressbar"
            aria-label="Parole lette"
            aria-valuemin={0}
            aria-valuemax={READING_WORDS.length}
            aria-valuenow={learned}
            className="mt-2 h-4 rounded-full bg-amber-100 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all"
              style={{ width: `${Math.round((learned / READING_WORDS.length) * 100)}%` }}
            />
          </div>
        </div>

        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" data-testid="diary-grid">
          {READING_WORDS.map((w) => {
            const isRead = known.has(w.word);
            return (
              <li
                key={w.word}
                data-read={isRead ? 'true' : 'false'}
                className={`rounded-2xl border-2 p-2 flex flex-col items-center gap-1 min-h-24 ${
                  isRead ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-dashed border-slate-200'
                }`}
              >
                {isRead ? (
                  <button
                    type="button"
                    onClick={() => sound.speak(w.word.toLowerCase(), 0.85, 1.1)}
                    aria-label={`Ascolta ${applyTextStyle(w.word, textStyle)}`}
                    className="w-full min-h-14 flex flex-col items-center justify-center cursor-pointer active:scale-95"
                  >
                    <span className="text-3xl" aria-hidden="true">{w.emoji}</span>
                    <span className={`text-sm font-black text-slate-800 ${textStyleClass(textStyle)}`}>
                      {applyTextStyle(w.word, textStyle)}
                    </span>
                  </button>
                ) : (
                  <span className="text-3xl opacity-30 grayscale" aria-label="Parola ancora da leggere" role="img">
                    ❔
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex justify-center">
          <SpeakButton
            withLabel
            label="Ascolta quante parole hai letto"
            text={`Hai letto ${learned} parole su ${READING_WORDS.length}!`}
          />
        </div>
      </div>
    </div>
  );
};
