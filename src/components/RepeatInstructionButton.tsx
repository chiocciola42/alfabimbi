import React from 'react';
import { Volume2 } from 'lucide-react';
import { sound } from '../utils/sound';

/** Large floating button that replays the current game's spoken instructions. */
export const RepeatInstructionButton: React.FC = () => (
  <button
    type="button"
    onClick={() => {
      sound.playClick();
      sound.repeatInstruction();
    }}
    aria-label="Ripeti le istruzioni"
    title="Ascolta di nuovo le istruzioni"
    className="fixed bottom-4 right-4 z-30 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white font-bold text-sm shadow-lg ring-4 ring-white/80 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
  >
    <Volume2 className="w-6 h-6" />
    <span>Ripeti</span>
  </button>
);
