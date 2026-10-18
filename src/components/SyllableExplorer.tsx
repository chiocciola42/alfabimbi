import React, { useState } from 'react';
import type { TextStyle } from '../types';
import { SYLLABLE_CONSONANTS, VOWELS, directSyllables, familyOf, inverseSyllables } from '../data/italianPractice';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { LetterPicker } from './PracticePickers';
import { SpeakButton } from './SpeakButton';

interface SyllableExplorerProps {
  textStyle: TextStyle;
}

const INSTRUCTION = 'Una consonante più una vocale formano una sillaba. Tocca le sillabe e leggi!';
const VOWEL_COLORS = ['text-rose-600', 'text-orange-600', 'text-emerald-600', 'text-fuchsia-600', 'text-sky-600'];

/** "L + A = LA → LAMA": una consonante con le cinque vocali, poi le sillabe al contrario (AL EL IL OL UL). */
export const SyllableExplorer: React.FC<SyllableExplorerProps> = ({ textStyle }) => {
  const [consonant, setConsonant] = useState('L');
  const family = familyOf(consonant);
  const show = (text: string) => applyTextStyle(text, textStyle);
  const cls = textStyleClass(textStyle);

  const say = (text: string) => {
    sound.playClick();
    sound.speak(text.toLowerCase(), 0.75, 1.1);
  };
  const sayRow = (syllables: string[]) =>
    sound.speakParts(syllables.map((s) => ({ text: s.toLowerCase(), lang: 'it-IT' as const, rate: 0.75, pitch: 1.1 })));

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-8 border-2 border-amber-200 shadow-lg text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Leggi le sillabe</span>
        <SpeakButton text={INSTRUCTION} label="Ascolta le istruzioni" asInstruction />
      </div>
      <div className="mb-5">
        <LetterPicker
          letters={SYLLABLE_CONSONANTS}
          value={consonant}
          onChange={(l) => l && setConsonant(l)}
          textStyle={textStyle}
          label="Consonante"
          itemLabel="Consonante"
        />
      </div>

      <ul className="space-y-2 max-w-md mx-auto mb-3" data-testid="syllable-rows">
        {family.examples.map((ex, i) => (
          <li key={ex.syllable} className="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-black">
            <span className={`w-9 text-slate-700 ${cls}`} aria-hidden="true">{show(consonant)}</span>
            <span className="text-slate-400 text-xl" aria-hidden="true">+</span>
            <span className={`w-9 ${VOWEL_COLORS[i]} ${cls}`} aria-hidden="true">{show(VOWELS[i])}</span>
            <span className="text-slate-400 text-xl" aria-hidden="true">=</span>
            <button
              type="button"
              onClick={() => say(ex.syllable)}
              aria-label={`Ascolta la sillaba ${ex.syllable}`}
              className={`${TOUCH_TARGET} px-3 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-amber-950 cursor-pointer active:scale-95 transition-transform ${cls}`}
            >
              {show(ex.syllable)}
            </button>
            <span className="text-slate-400 text-xl" aria-hidden="true">→</span>
            <button
              type="button"
              onClick={() => say(ex.word)}
              aria-label={`Ascolta la parola ${ex.word}`}
              className={`${TOUCH_TARGET} px-2 sm:px-3 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-200 text-slate-800 text-base sm:text-xl inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform ${cls}`}
            >
              <span aria-hidden="true" className="text-3xl leading-none">{ex.emoji}</span>
              <span>{show(ex.word)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          sound.playClick();
          sayRow(directSyllables(consonant));
        }}
        className={`inline-flex items-center gap-2 px-4 ${TOUCH_TARGET} rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm cursor-pointer`}
      >
        <span aria-hidden="true">🔊</span>
        <span>Leggi tutta la fila</span>
      </button>

      <div className="mt-6 pt-5 border-t border-amber-100">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">Al contrario: la vocale va prima!</p>
        <ul className="flex flex-wrap items-center justify-center gap-2" data-testid="inverse-row">
          {inverseSyllables(consonant).map((syl) => (
            <li key={syl}>
              <button
                type="button"
                onClick={() => say(syl)}
                aria-label={`Ascolta la sillaba ${syl}`}
                className={`${TOUCH_TARGET} px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-2xl font-black text-sky-950 cursor-pointer active:scale-95 transition-transform ${cls}`}
              >
                {show(syl)}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            sayRow(inverseSyllables(consonant));
          }}
          className={`mt-3 inline-flex items-center gap-2 px-4 ${TOUCH_TARGET} rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-sm cursor-pointer`}
        >
          <span aria-hidden="true">🔊</span>
          <span>Leggi al contrario</span>
        </button>
      </div>
    </div>
  );
};
