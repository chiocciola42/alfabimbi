import React, { useState } from 'react';
import { PenLine, Type } from 'lucide-react';
import type { LetterData, TextStyle } from '../types';
import { ALPHABET_DATA } from '../data/alphabet';
import { ENGLISH_ALPHABET, letterPhrase } from '../data/englishAlphabet';
import { ENGLISH_REPEAT_REWARD_STARS, ENGLISH_TRACE_REWARD_STARS } from '../state/progress';
import { sound } from '../utils/sound';
import { TOUCH_TARGET } from '../utils/ui';
import { EnglishSpell } from './EnglishSpell';
import { TracingCanvas } from './TracingCanvas';

type Mode = 'trace' | 'spell';

interface EnglishWriteProps {
  /** Letters traced so far, in the case that was traced ("A" capital, "a" small). */
  tracedLetters: string[];
  spelledWords: string[];
  textStyle: TextStyle;
  onRewardStars: (stars: number) => void;
  onLetterTraced: (letter: string, isUppercase: boolean) => void;
  onWordSpelled: (word: string) => void;
  onWrongAnswer?: () => void;
}

/** Guided writing in English: first trace the letters, then build short words with them. */
export const EnglishWrite: React.FC<EnglishWriteProps> = ({
  tracedLetters,
  spelledWords,
  textStyle,
  onRewardStars,
  onLetterTraced,
  onWordSpelled,
  onWrongAnswer,
}) => {
  const [mode, setMode] = useState<Mode>('trace');
  const [letterIndex, setLetterIndex] = useState(0);
  const english = ENGLISH_ALPHABET[letterIndex];

  // The tracing guides are the same for every Latin letter: only the picture word changes.
  const base = ALPHABET_DATA.find((l) => l.id === english.letter)!;
  const letter: LetterData = {
    ...base,
    word: english.word,
    emoji: english.emoji,
    phonics: letterPhrase(english),
  };

  const move = (step: number) => {
    setLetterIndex((i) => (i + step + ENGLISH_ALPHABET.length) % ENGLISH_ALPHABET.length);
    sound.playClick();
  };

  const handleTraced = (id: string, isUppercase: boolean) => {
    const key = isUppercase ? id.toUpperCase() : id.toLowerCase();
    const isNew = !tracedLetters.includes(key);
    onLetterTraced(id, isUppercase);
    onRewardStars(isNew ? ENGLISH_TRACE_REWARD_STARS : ENGLISH_REPEAT_REWARD_STARS);
    sound.playFanfare();
    sound.speakEncouragement();
  };

  const modeButton = (id: Mode, Icon: typeof PenLine, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(id);
        sound.playClick();
      }}
      aria-pressed={mode === id}
      className={`inline-flex items-center justify-center gap-2 px-5 ${TOUCH_TARGET} rounded-2xl font-bold text-sm transition-all cursor-pointer ${
        mode === id
          ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300'
          : 'bg-white text-slate-700 hover:bg-emerald-50 border border-emerald-200'
      }`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6">
      <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
        {modeButton('trace', PenLine, 'Traccia le lettere')}
        {modeButton('spell', Type, 'Costruisci le parole')}
      </div>

      {mode === 'trace' ? (
        <TracingCanvas
          letter={letter}
          onLetterComplete={handleTraced}
          onNextLetter={() => move(1)}
          onPrevLetter={() => move(-1)}
          isCompletedUppercase={tracedLetters.includes(english.letter)}
          isCompletedLowercase={tracedLetters.includes(english.lowercase)}
          english={{
            reward: ENGLISH_TRACE_REWARD_STARS,
            onSpeak: () =>
              sound.speakParts([
                { text: english.say, lang: 'en-GB', rate: 0.7, pitch: 1.05 },
                { text: letterPhrase(english), lang: 'en-GB', rate: 0.75, pitch: 1.05 },
              ]),
          }}
        />
      ) : (
        <div className="max-w-3xl mx-auto py-4">
          <EnglishSpell
            spelledWords={spelledWords}
            textStyle={textStyle}
            onRewardStars={onRewardStars}
            onWordSpelled={onWordSpelled}
            onWrongAnswer={onWrongAnswer}
          />
        </div>
      )}
    </div>
  );
};
