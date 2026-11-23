import React, { useState } from 'react';
import { skin } from '../world3d/stage/skin';
import { Blocks, CircleDot, Ear, Eye, PenLine, Puzzle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TextStyle } from '../types';
import { sound } from '../utils/sound';
import { TOUCH_TARGET } from '../utils/ui';
import { SyllableExplorer } from './SyllableExplorer';
import { SyllableDrill } from './SyllableDrill';
import { GapWords } from './GapWords';
import { InitialLetterGame } from './InitialLetterGame';
import { LetterHunt } from './LetterHunt';

type Mode = 'syllables' | 'find' | 'write' | 'gap' | 'initial' | 'hunt';

const MODES: { id: Mode; label: string; Icon: LucideIcon }[] = [
  { id: 'syllables', label: 'Sillabe', Icon: Blocks },
  { id: 'find', label: 'Trova la sillaba', Icon: Ear },
  { id: 'write', label: 'Scrivi la sillaba', Icon: PenLine },
  { id: 'gap', label: 'Completa la parola', Icon: Puzzle },
  { id: 'initial', label: 'Inizia con…', Icon: Eye },
  { id: 'hunt', label: 'Cerchia le lettere', Icon: CircleDot },
];

interface ItalianPracticeProps {
  readWords: string[];
  learnedSyllables: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  onWordRead: (word: string) => void;
  onSyllableLearned: (syllable: string) => void;
  onRoundComplete: () => void;
  onWrongAnswer?: () => void;
}

/** Esercizi di lettura e scrittura come sul sillabario: si sceglie un gioco alla volta. */
export const ItalianPractice: React.FC<ItalianPracticeProps> = ({
  readWords,
  learnedSyllables,
  textStyle,
  onRewardStars,
  onWordRead,
  onSyllableLearned,
  onRoundComplete,
  onWrongAnswer,
}) => {
  const [mode, setMode] = useState<Mode>('syllables');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div role="group" aria-label="Scegli l'esercizio" className="flex flex-wrap items-center justify-center gap-2 mb-5">
        {MODES.map(({ id, label, Icon }) => (
          <button
            {...skin()}
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              sound.playClick();
            }}
            aria-pressed={mode === id}
            className={`inline-flex items-center justify-center gap-2 px-4 ${TOUCH_TARGET} rounded-2xl font-bold text-sm transition-all cursor-pointer ${
              mode === id
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {mode === 'syllables' && <SyllableExplorer textStyle={textStyle} />}
      {(mode === 'find' || mode === 'write') && (
        <SyllableDrill
          kind={mode}
          learned={learnedSyllables}
          textStyle={textStyle}
          onRewardStars={onRewardStars}
          onSyllableLearned={onSyllableLearned}
          onWrongAnswer={onWrongAnswer}
        />
      )}
      {mode === 'gap' && (
        <GapWords
          readWords={readWords}
          textStyle={textStyle}
          onRewardStars={onRewardStars}
          onWordRead={onWordRead}
          onWrongAnswer={onWrongAnswer}
        />
      )}
      {mode === 'initial' && (
        <InitialLetterGame
          textStyle={textStyle}
          onRewardStars={onRewardStars}
          onRoundComplete={onRoundComplete}
          onWrongAnswer={onWrongAnswer}
        />
      )}
      {mode === 'hunt' && (
        <LetterHunt
          readWords={readWords}
          textStyle={textStyle}
          onRewardStars={onRewardStars}
          onRoundComplete={onRoundComplete}
          onWrongAnswer={onWrongAnswer}
        />
      )}
    </div>
  );
};
