import React, { useState } from 'react';
import { Lock, Star, Play, Award } from 'lucide-react';
import { WORLDS } from '../math/worlds';
import type { Level, World } from '../math/types';
import { mathMedals } from '../state/progress';
import type { ChildProgress } from '../types';
import { sound } from '../utils/sound';
import { SpeakButton } from './SpeakButton';

interface MathMapProps {
  progress: ChildProgress;
  onSelectLevel: (level: Level) => void;
}

const TOTAL_MEDALS = WORLDS.reduce((n, w) => n + w.levels.length * 3, 0);

export const MathMap: React.FC<MathMapProps> = ({ progress, onSelectLevel }) => {
  const [selectedWorldId, setSelectedWorldId] = useState<number>(1);
  const currentWorld = WORLDS.find((w) => w.id === selectedWorldId) ?? WORLDS[0];
  const medals = mathMedals(progress);
  const starsOf = (level: Level) => progress.mathLevelStars[String(level.id)] ?? 0;

  const isWorldUnlocked = (world: World) => world.id === 1 || medals >= world.levels[0].requiredStarsToUnlock;
  const isLevelUnlocked = (level: Level) =>
    level.id === 1 || medals >= level.requiredStarsToUnlock || starsOf({ ...level, id: level.id - 1 }) > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-300 rounded-3xl p-6 md:p-8 text-amber-950 shadow-md mb-8 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 text-8xl opacity-20 rotate-12 select-none" aria-hidden="true">
          🔢
        </div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 text-balance text-slate-900">
            Ciao {progress.name}, è ora di giocare con i numeri!
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm sm:text-base font-semibold text-amber-950/80">{currentWorld.mascotGreeting}</p>
            <SpeakButton text={currentWorld.mascotGreeting} label="Ascolta il saluto" className="bg-white/80 hover:bg-white" />
          </div>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-2xl border-2 border-white/70 text-sm font-bold text-amber-900">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>
              {medals} / {TOTAL_MEDALS} stelline dei livelli
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-slate-900">Scegli il tuo Mondo</h2>
        <span className="text-xs font-semibold text-amber-800/80">
          {WORLDS.length} mondi e {WORLDS.reduce((n, w) => n + w.levels.length, 0)} livelli da conquistare
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3 mb-8">
        {WORLDS.map((world) => {
          const unlocked = isWorldUnlocked(world);
          const isSelected = world.id === selectedWorldId;
          const starsInWorld = world.levels.reduce((acc, lvl) => acc + starsOf(lvl), 0);
          return (
            <button
              key={world.id}
              onClick={() => {
                sound.playClick();
                setSelectedWorldId(world.id);
              }}
              aria-pressed={isSelected}
              className={`p-3 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-28 ${
                isSelected
                  ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-200'
                  : unlocked
                    ? 'bg-white/80 border-amber-200/80 hover:border-amber-400 hover:bg-white'
                    : 'bg-amber-50/60 border-amber-100 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">{world.themeEmoji}</span>
                {unlocked ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-200">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                    {starsInWorld}/{world.levels.length * 3}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                    <Lock className="w-2.5 h-2.5" />
                    {world.levels[0].requiredStarsToUnlock}★
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold text-amber-700/70 block">Mondo {world.id}</span>
                <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{world.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      <section className={`border-2 rounded-3xl p-5 sm:p-6 bg-gradient-to-b ${currentWorld.bgColor} ${currentWorld.borderColor} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-black/5">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{currentWorld.themeEmoji}</span>
            <div>
              <span className="text-xs font-bold text-slate-500">
                Mondo {currentWorld.id} di {WORLDS.length}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">{currentWorld.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-600 max-w-2xl">{currentWorld.description}</p>
                <SpeakButton text={`${currentWorld.title}. ${currentWorld.description}`} label="Ascolta il mondo" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-2xl border-2 border-amber-200 text-xs font-bold text-amber-900 self-start">
            <Award className="w-4 h-4 text-amber-500" />
            {isWorldUnlocked(currentWorld) ? 'Mondo da esplorare' : 'Mondo bloccato'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {currentWorld.levels.map((level) => {
            const unlocked = isLevelUnlocked(level);
            const stars = starsOf(level);
            return (
              <div
                key={level.id}
                className={`rounded-3xl border-2 p-4 flex flex-col justify-between bg-white transition-all ${
                  unlocked
                    ? 'border-amber-200 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5'
                    : 'opacity-70 border-dashed border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                    {level.worldLevelNumber}
                  </span>
                  <span className="text-3xl">{level.themeEmoji}</span>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-900 leading-snug">{level.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{level.subtitle}</p>
                </div>
                <div className="pt-3 border-t border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-0.5" aria-label={`${stars} stelle su 3`}>
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i <= stars ? 'fill-amber-400 text-amber-500' : 'fill-slate-100 text-slate-300'}`}
                      />
                    ))}
                  </div>
                  {unlocked ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectLevel(level);
                      }}
                      aria-label={`${stars > 0 ? 'Rigioca' : 'Gioca'} il livello ${level.id}: ${level.title}`}
                      className="px-4 py-2.5 min-h-14 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {stars > 0 ? 'Rigioca' : 'Gioca'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                      <Lock className="w-3 h-3" />
                      {level.requiredStarsToUnlock}★
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
