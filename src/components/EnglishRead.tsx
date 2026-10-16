import React, { useState } from 'react';
import { Blocks, Eye } from 'lucide-react';
import { sound } from '../utils/sound';
import { TOUCH_TARGET } from '../utils/ui';
import { EnglishFamilies } from './EnglishFamilies';
import { EnglishSight } from './EnglishSight';

type Mode = 'families' | 'sight';

type FamiliesProps = React.ComponentProps<typeof EnglishFamilies>;
type SightProps = React.ComponentProps<typeof EnglishSight>;

interface EnglishReadProps {
  families: FamiliesProps;
  sight: SightProps;
}

/** The English reading tab: word families (phonics) or sight words, one at a time. */
export const EnglishRead: React.FC<EnglishReadProps> = ({ families, sight }) => {
  const [mode, setMode] = useState<Mode>('families');

  const modeButton = (id: Mode, Icon: typeof Blocks, label: string) => (
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {modeButton('families', Blocks, 'Parole-rima')}
        {modeButton('sight', Eye, "A colpo d'occhio")}
      </div>
      {mode === 'families' ? <EnglishFamilies {...families} embedded /> : <EnglishSight {...sight} />}
    </div>
  );
};
