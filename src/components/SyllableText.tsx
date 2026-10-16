import React from 'react';
import type { TextStyle } from '../types';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';

/** Alternating colours make the syllables of a word easy to tell apart. */
export const SYLLABLE_COLORS = ['text-rose-600', 'text-sky-600', 'text-emerald-600', 'text-violet-600', 'text-orange-600'];

interface SyllableTextProps {
  syllables: string[];
  textStyle: TextStyle;
  /** Index of the syllable currently being read aloud (it gets highlighted). */
  activeIndex?: number | null;
  className?: string;
}

/** A word split in coloured syllables, written in the style chosen by the parents. */
export const SyllableText: React.FC<SyllableTextProps> = ({ syllables, textStyle, activeIndex = null, className = '' }) => (
  <span
    role="img"
    aria-label={applyTextStyle(syllables.join(''), textStyle)}
    className={`inline-flex items-baseline justify-center gap-1.5 font-black tracking-wide ${textStyleClass(textStyle)} ${className}`}
  >
    {syllables.map((syl, i) => (
      <span
        key={i}
        aria-hidden="true"
        data-active={activeIndex === i ? 'true' : undefined}
        className={`rounded-xl px-1.5 transition-all duration-150 ${SYLLABLE_COLORS[i % SYLLABLE_COLORS.length]} ${
          activeIndex === i ? 'bg-amber-200 scale-110' : ''
        }`}
      >
        {applyTextStyle(syl, textStyle)}
      </span>
    ))}
  </span>
);
