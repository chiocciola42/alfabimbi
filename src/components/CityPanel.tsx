import React from 'react';
import { Lock, Play, Star, X } from 'lucide-react';
import type { ChildProgress } from '../types';
import { parentCityId, type CityDef, type GameDef, type IslandDef } from '../world';
import { cityStars, isCityUnlocked, isGameUnlocked } from '../state/world';
import { sound } from '../utils/sound';
import { SpeakButton } from './SpeakButton';

interface CityPanelProps {
  island: IslandDef;
  city: CityDef;
  progress: ChildProgress;
  onPlay: (game: GameDef) => void;
  onClose: () => void;
}

/** Scheda di una città: stelle raccolte, giochi da fare oppure cosa serve per aprirla. */
export const CityPanel: React.FC<CityPanelProps> = ({ island, city, progress, onPlay, onClose }) => {
  const unlocked = isCityUnlocked(progress, island, city.id);
  const stars = Math.min(cityStars(progress, city), city.clearStars);
  const pct = Math.round((stars / city.clearStars) * 100);
  const index = island.cities.findIndex((c) => c.id === city.id);
  const parent = island.cities.find((c) => c.id === parentCityId(island, index));
  const parentStars = parent ? cityStars(progress, parent) : 0;

  return (
    <section
      aria-label={`Città: ${city.name}`}
      className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-3xl max-h-[62%] overflow-y-auto rounded-t-3xl border-2 border-b-0 border-amber-200 bg-white/97 p-4 sm:p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start gap-3">
        <span className="text-4xl sm:text-5xl" aria-hidden="true">{city.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{city.name}</h2>
            <SpeakButton text={`${city.name}. ${city.description}`} label="Ascolta la città" />
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{city.description}</p>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Chiudi"
          className="w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {unlocked ? (
        <>
          <div className="mt-3 flex items-center gap-3" role="group" aria-label={`${stars} stelle su ${city.clearStars}`}>
            <span className="flex items-center gap-1 text-sm font-black text-amber-800 shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" aria-hidden="true" />
              {stars}/{city.clearStars}
            </span>
            <div className="h-3 flex-1 rounded-full bg-amber-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">
              {stars >= city.clearStars ? 'Città superata! 🎉' : 'Raccogli le stelle per aprire la strada'}
            </span>
          </div>

          <ul className={`mt-4 grid gap-2.5 ${city.games.length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {city.games.map((game, i) => {
              const open = isGameUnlocked(progress, city, i);
              const levelStars = game.levelId !== undefined ? progress.mathLevelStars[String(game.levelId)] ?? 0 : null;
              const label =
                game.levelId !== undefined
                  ? `${levelStars ? 'Rigioca' : 'Gioca'} il livello ${game.levelId}: ${game.title}`
                  : game.title;
              return (
                <li key={game.id}>
                  <button
                    disabled={!open}
                    onClick={() => {
                      sound.playClick();
                      onPlay(game);
                    }}
                    aria-label={label}
                    className={`w-full min-h-14 flex items-center gap-3 rounded-2xl border-2 px-3 py-2 text-left transition-all ${
                      open
                        ? 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100 cursor-pointer active:scale-[0.98]'
                        : 'bg-slate-50 border-dashed border-slate-300 opacity-70 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-3xl" aria-hidden="true">{game.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-black text-slate-900 leading-snug">{game.title}</span>
                      {game.subtitle && <span className="block text-xs text-slate-500 truncate">{game.subtitle}</span>}
                    </span>
                    {levelStars !== null && (
                      <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
                        {[1, 2, 3].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= levelStars ? 'fill-amber-400 text-amber-500' : 'fill-slate-100 text-slate-300'}`} />
                        ))}
                      </span>
                    )}
                    {open ? (
                      <Play className="w-5 h-5 text-amber-600 fill-current shrink-0" aria-hidden="true" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 p-4">
          <Lock className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-700">
            {parent
              ? `Questa città è nascosta tra le nuvole! Raccogli ${parent.clearStars} stelle a "${parent.name}" per aprire la strada (ne hai ${Math.min(parentStars, parent.clearStars)}).`
              : 'Questa città è ancora chiusa.'}
          </p>
        </div>
      )}
    </section>
  );
};
