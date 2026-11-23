import React, { Suspense, lazy, useMemo } from 'react';
import { ArrowRight, Star, Award } from 'lucide-react';
import type { ChildProgress, Section } from '../types';
import { ALPHABET_DATA, STICKERS_CATALOG } from '../data/alphabet';
import { MATH_LEVEL_COUNT, WORLDS } from '../math/worlds';
import { ENGLISH_WORDS } from '../data/englishWords';
import { mathMedals } from '../state/progress';
import { sound } from '../utils/sound';
import { SpeakButton } from './SpeakButton';
import { GoalsPanel } from './GoalsPanel';
import { ISLANDS } from '../world';
import { supportsWebGL } from '../world3d/webgl';

const ArchipelagoScene = lazy(() => import('../world3d/ArchipelagoScene').then((m) => ({ default: m.ArchipelagoScene })));

interface HomeScreenProps {
  progress: ChildProgress;
  onChooseSection: (section: Section) => void;
  onOpenAlbum: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ progress, onChooseSection, onOpenAlbum }) => {
  const webgl = useMemo(() => supportsWebGL(), []);
  const lettersDone = progress.masteredLetters.length;
  const levelsDone = Object.keys(progress.mathLevelStars).length;

  const cards: Array<{
    section: Section;
    title: string;
    emoji: string;
    description: string;
    detail: string;
    gradient: string;
    border: string;
    hint: string;
  }> = [
    {
      section: 'italian',
      title: 'Italiano',
      emoji: '✏️',
      description: 'Lettere, scrittura, bolle e parole da leggere.',
      detail: `${lettersDone} lettere su ${ALPHABET_DATA.length} imparate`,
      gradient: 'from-amber-300 via-orange-200 to-rose-200',
      border: 'border-amber-300 hover:border-amber-500',
      hint: 'A B C',
    },
    {
      section: 'math',
      title: 'Matematica',
      emoji: '🔢',
      description: `Numeri, calcoli e problemi in ${WORLDS.length} mondi.`,
      detail: `${levelsDone} livelli su ${MATH_LEVEL_COUNT} giocati · ${mathMedals(progress)} stelline`,
      gradient: 'from-cyan-200 via-sky-200 to-violet-200',
      border: 'border-sky-300 hover:border-sky-500',
      hint: '1 2 3',
    },
    {
      section: 'english',
      title: 'Inglese',
      emoji: '🇬🇧',
      description: 'Ascolta le parole e impara a leggere.',
      detail: `${progress.englishWords.length} parole su ${ENGLISH_WORDS.length} imparate`,
      gradient: 'from-emerald-200 via-teal-200 to-sky-200',
      border: 'border-emerald-300 hover:border-emerald-500',
      hint: 'Hello',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-10">
        <div className="text-6xl mb-3 animate-bounce" aria-hidden="true">
          {progress.avatar}
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 text-balance">
          Ciao {progress.name}!
        </h1>
        <p className="text-base sm:text-lg font-semibold text-amber-800/90 mt-2">Cosa vuoi imparare oggi?</p>
      </div>

      {webgl && (
        <div className="relative h-[52dvh] min-h-[340px] max-h-[560px] rounded-3xl overflow-clip border-2 border-sky-200 shadow-md mb-8">
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-sky-100 text-5xl animate-pulse">🏝️</div>}>
            <ArchipelagoScene
              progress={progress}
              onChooseIsland={(id) => {
                const island = ISLANDS.find((i) => i.id === id);
                if (!island) return;
                sound.playClick();
                onChooseSection(island.section);
              }}
            />
          </Suspense>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 ${webgl ? 'hidden' : ''}`}>
        {cards.map((card) => (
          <div key={card.section} className={`relative ${card.section === 'english' ? 'md:col-span-2 lg:col-span-1' : ''}`}>
          <button
            onClick={() => {
              sound.playClick();
              sound.speak(card.title);
              onChooseSection(card.section);
            }}
            className={`group relative w-full text-left overflow-hidden rounded-3xl border-2 bg-gradient-to-br ${card.gradient} ${card.border} p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer`}
          >
            <span
              className="absolute -top-3 -right-1 text-8xl font-black text-white/40 tracking-widest select-none rotate-6"
              aria-hidden="true"
            >
              {card.hint}
            </span>
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-white/90 flex items-center justify-center text-5xl shadow-sm mb-4 group-hover:scale-105 transition-transform">
                {card.emoji}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{card.title}</h2>
              <p className="text-sm sm:text-base font-semibold text-slate-700 mt-2 max-w-sm">{card.description}</p>
              <p className="mt-4 inline-block bg-white/80 px-3 py-1 rounded-xl text-xs font-bold text-amber-900">
                {card.detail}
              </p>
              <div className="mt-5 flex items-center gap-2 text-base font-black text-slate-900">
                <span>Si gioca!</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
          <SpeakButton
            text={`${card.title}. ${card.description}`}
            label="Ascolta la descrizione"
            className="absolute bottom-4 right-4 z-20 bg-white/90 hover:bg-white shadow-xs"
          />
          </div>
        ))}
      </div>

      <GoalsPanel progress={progress} onOpenAlbum={onOpenAlbum} />

      <button
        onClick={() => {
          sound.playClick();
          onOpenAlbum();
        }}
        className="mt-6 w-full min-h-14 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-3xl border-2 border-amber-200 hover:border-amber-400 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
      >
        <span className="flex items-center gap-3 text-left">
          <span className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Award className="w-6 h-6 text-amber-600" />
          </span>
          <span>
            <span className="block text-lg font-black text-slate-900">I tuoi premi</span>
            <span className="block text-xs font-semibold text-slate-600">
              Le stelle che vinci servono per le figurine!
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3 text-sm font-black text-amber-900 shrink-0">
          <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            {progress.stars} stelle
          </span>
          <span className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-xl">
            {progress.unlockedStickers.length}/{STICKERS_CATALOG.length} figurine
          </span>
        </span>
      </button>
    </div>
  );
};
