import React from 'react';
import { Volume2 } from 'lucide-react';
import { sound } from '../utils/sound';
import { TOUCH_TARGET } from '../utils/ui';

interface SpeakButtonProps {
  /** What the voice reads out loud. */
  text: string;
  /** Accessible name; defaults to "Ascolta". */
  label?: string;
  rate?: number;
  pitch?: number;
  className?: string;
  /** Show the word "Ascolta" next to the icon. */
  withLabel?: boolean;
  /** Also remember the text as the game instruction (so the floating "Ripeti" button replays it). */
  asInstruction?: boolean;
}

/** Round speaker button: wherever there is text, a child who cannot read it yet can hear it. */
export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  label = 'Ascolta',
  rate = 0.9,
  pitch = 1.1,
  className = '',
  withLabel = false,
  asInstruction = false,
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      if (asInstruction) sound.speakInstruction(text, rate, pitch);
      else sound.speak(text, rate, pitch);
    }}
    aria-label={label}
    title={label}
    className={`${TOUCH_TARGET} shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm transition-colors active:scale-95 cursor-pointer ${
      withLabel ? 'px-4' : 'w-14'
    } ${className}`}
  >
    <Volume2 className="w-6 h-6" aria-hidden="true" />
    {withLabel && <span>Ascolta</span>}
  </button>
);
