import React from 'react';
import { Lock, Star } from 'lucide-react';
import type { ChildProgress } from '../types';
import type { IslandDef } from '../world';
import { cityStars, isCityCleared, isCityUnlocked } from '../state/world';

interface CityListProps {
  island: IslandDef;
  progress: ChildProgress;
  selectedCityId: string | null;
  onSelectCity: (cityId: string) => void;
}

/** Elenco 2D delle città: serve quando il dispositivo non supporta il 3D. */
export const CityList: React.FC<CityListProps> = ({ island, progress, selectedCityId, onSelectCity }) => (
  <ol className="max-w-3xl mx-auto px-4 py-6 grid gap-3" aria-label={`Città di ${island.name}`}>
    {island.cities.map((city, i) => {
      const unlocked = isCityUnlocked(progress, island, city.id);
      const cleared = isCityCleared(progress, city);
      const stars = Math.min(cityStars(progress, city), city.clearStars);
      return (
        <li key={city.id}>
          <button
            onClick={() => onSelectCity(city.id)}
            aria-label={`${city.name}${unlocked ? '' : ' (bloccata)'}`}
            data-city={city.id}
            aria-current={selectedCityId === city.id ? 'true' : undefined}
            className={`w-full min-h-16 flex items-center gap-3 rounded-3xl border-2 px-4 py-3 text-left cursor-pointer transition-all active:scale-[0.99] ${
              unlocked ? 'bg-white border-amber-200 hover:border-amber-400' : 'bg-slate-100 border-dashed border-slate-300 text-slate-500'
            } ${selectedCityId === city.id ? 'ring-2 ring-amber-300' : ''}`}
          >
            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 text-sm font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="text-3xl" aria-hidden="true">{city.emoji}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-black text-slate-900 leading-tight">{city.name}</span>
              <span className="block text-xs text-slate-500 line-clamp-1">{city.description}</span>
            </span>
            {unlocked ? (
              <span className="flex items-center gap-1 text-sm font-black text-amber-800 shrink-0">
                <Star className={`w-4 h-4 ${cleared ? 'fill-amber-400 text-amber-500' : 'text-amber-500'}`} aria-hidden="true" />
                {stars}/{city.clearStars}
              </span>
            ) : (
              <Lock className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </li>
      );
    })}
  </ol>
);
