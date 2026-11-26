import React, { useState } from 'react';
import { LetterData, TextStyle } from '../types';
import { sound } from '../utils/sound';
import { applyTextStyle, textStyleClass } from '../utils/textStyle';
import { TOUCH_TARGET } from '../utils/ui';
import { ModalDialog } from './ModalDialog';
import { SpeakButton } from './SpeakButton';
import { PenTool, Check, Play, Volume2, X } from 'lucide-react';

interface LetterExplorerProps {
  letters: LetterData[];
  masteredLetters: string[];
  tracedUppercase: string[];
  tracedLowercase: string[];
  onSelectLetterToTrace: (letter: LetterData) => void;
  onPlayGameWithLetter?: (letter: LetterData) => void;
  /** How words are written (chosen by the parents). */
  textStyle?: TextStyle;
}

export const LetterExplorer: React.FC<LetterExplorerProps> = ({
  letters,
  masteredLetters,
  tracedUppercase,
  tracedLowercase,
  onSelectLetterToTrace,
  onPlayGameWithLetter,
  textStyle = 'upper',
}) => {
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [selectedLetterModal, setSelectedLetterModal] = useState<LetterData | null>(null);

  const filterButtons = [
    { id: 'all', label: 'Tutte le Lettere' },
    { id: 1, label: 'Livello 1: Vocali' },
    { id: 2, label: 'Livello 2: Prime Consonanti' },
    { id: 3, label: 'Livello 3: Altre Consonanti' },
    { id: 4, label: 'Livello 4: Speciali' },
  ];

  const filteredLetters = letters.filter((l) => {
    if (levelFilter === 'all') return true;
    return l.level === levelFilter;
  });

  const handleCardClick = (letter: LetterData) => {
    // The fun fact is read out loud too: a child who is learning to read cannot read it yet.
    sound.speak(`${letter.phonics}. ${letter.funFact}`, 0.88, 1.1);
    setSelectedLetterModal(letter);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-300 rounded-3xl p-6 md:p-8 text-amber-950 shadow-md mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/80 backdrop-blur-xs text-amber-900 rounded-full text-xs font-bold mb-3 border border-white/60">
            Esplora, Ascolta e Impara ✨
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 text-balance text-slate-900">
            Tocca una lettera per ascoltare il suo suono e imparare a scriverla!
          </h1>
          <SpeakButton
            withLabel
            asInstruction
            label="Ascolta le istruzioni"
            text="Tocca una lettera per ascoltare il suo suono e imparare a scriverla!"
            className="bg-white/80 hover:bg-white"
          />
        </div>
        <div className="absolute right-4 bottom-2 text-7xl sm:text-8xl opacity-30 sm:opacity-50 pointer-events-none select-none">
          🎈🔤
        </div>
      </div>

      {/* Level Filter Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {filterButtons.map((btn) => {
          const isActive = levelFilter === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => {
                setLevelFilter(btn.id as number | 'all');
                sound.playClick();
              }}
              className={`px-4 ${TOUCH_TARGET} shrink-0 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-white text-slate-700 hover:bg-amber-100/60 border border-amber-200/80'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Letters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {filteredLetters.map((l) => {
          const isMastered = masteredLetters.includes(l.id);
          const isUpper = tracedUppercase.includes(l.id);
          const isLower = tracedLowercase.includes(l.id);

          return (
            <div
              key={l.id}
              onClick={() => handleCardClick(l)}
              className="group relative bg-white rounded-3xl p-4 border-2 border-amber-200/80 hover:border-amber-400 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-between cursor-pointer active:scale-98"
            >
              {/* Mastered Badge */}
              {isMastered && (
                <div
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs"
                  title="Lettera completata!"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Big Letter Display */}
              <div className="flex items-baseline gap-1 mt-1 mb-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight group-hover:scale-105 transition-transform">
                  {l.letter}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-amber-600">
                  {l.lowercase}
                </span>
              </div>

              {/* Mascot Emoji */}
              <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-3xl mb-2 transition-colors">
                {l.emoji}
              </div>

              {/* Word Title */}
              <div className="text-center w-full">
                <span className={`block font-bold text-slate-800 text-sm truncate ${textStyleClass(textStyle)}`}>
                  {applyTextStyle(l.word, textStyle)}
                </span>
                <span className={`text-xs font-medium text-amber-700 ${textStyleClass(textStyle)}`}>
                  {applyTextStyle(l.phonics, textStyle)}
                </span>
              </div>

              {/* Mini Action Buttons */}
              <div className="w-full mt-3 pt-2 border-t border-amber-100 flex items-center justify-between gap-1">
                <SpeakButton
                  text={`${l.letter} come ${l.word}!`}
                  label="Ascolta pronuncia"
                  className="bg-transparent"
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLetterToTrace(l);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 ${TOUCH_TARGET} bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer`}
                  title="Impara a scrivere questa lettera"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Scrivi</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Letter Detail Modal */}
      {selectedLetterModal && (
        <ModalDialog
          onClose={() => setSelectedLetterModal(null)}
          labelledBy="letter-modal-title"
          lightDismiss
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border-2 border-amber-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div>
            {/* Close Button */}
            <button
              onClick={() => setSelectedLetterModal(null)}
              aria-label="Chiudi"
              className="absolute top-3 right-3 w-14 h-14 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Letter Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center font-black text-4xl shadow-md">
                {selectedLetterModal.letter}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="letter-modal-title" className="text-3xl font-black text-slate-900">
                    {selectedLetterModal.letter} {selectedLetterModal.lowercase}
                  </h3>
                  <SpeakButton
                    text={`${selectedLetterModal.letter} come ${selectedLetterModal.word}!`}
                    label="Ascolta pronuncia"
                  />
                </div>
                <p className={`text-base font-bold text-amber-700 ${textStyleClass(textStyle)}`}>
                  {applyTextStyle(selectedLetterModal.phonics, textStyle)}
                </p>
                <span className="text-xs text-slate-500 font-medium">
                  Livello {selectedLetterModal.level} · {selectedLetterModal.category}
                </span>
              </div>
            </div>

            {/* Fun Fact Callout */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl">{selectedLetterModal.funFactEmoji ?? selectedLetterModal.emoji}</span>
                <p className="text-sm text-amber-950 font-medium leading-relaxed flex-1">
                  {selectedLetterModal.funFact}
                </p>
                <SpeakButton text={selectedLetterModal.funFact} label="Ascolta la curiosità" />
              </div>
            </div>

            {/* Sample Words with Sound */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Altre paroline con la lettera {selectedLetterModal.letter}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedLetterModal.sampleWords.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => sound.speak(sample.word, 0.85, 1.15)}
                    aria-label={`Ascolta ${applyTextStyle(sample.word, textStyle)}`}
                    className={`flex items-center justify-between p-2.5 ${TOUCH_TARGET} bg-slate-50 hover:bg-amber-50 rounded-2xl border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer group text-left`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sample.emoji}</span>
                      <span className={`font-bold text-sm text-slate-800 group-hover:text-amber-900 ${textStyleClass(textStyle)}`}>
                        {applyTextStyle(sample.word, textStyle)}
                      </span>
                    </div>
                    <Volume2 className="w-5 h-5 text-slate-400 group-hover:text-amber-600" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const target = selectedLetterModal;
                  setSelectedLetterModal(null);
                  onSelectLetterToTrace(target);
                }}
                className="flex-1 py-3 px-4 min-h-14 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101"
              >
                <PenTool className="w-4 h-4" />
                <span>Impara a Scriverla</span>
              </button>
              {onPlayGameWithLetter && (
                <button
                  onClick={() => {
                    const target = selectedLetterModal;
                    setSelectedLetterModal(null);
                    onPlayGameWithLetter(target);
                  }}
                  className="py-3 px-4 min-h-14 bg-white hover:bg-amber-50 text-amber-900 font-bold text-sm rounded-2xl border border-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <span>Gioca</span>
                </button>
              )}
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
};
