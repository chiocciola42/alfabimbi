import React from 'react';
import { Lock, Star } from 'lucide-react';
import type { ChildProgress } from '../types';
import type { IslandDef } from '../world';
import { cityStars, isCityCleared, isCityUnlocked } from '../state/world';

interface CityStripProps {
  island: IslandDef;
  progress: ChildProgress;
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
}

/** Striscia scorrevole con tutte le città: arriva anche dove la mappa 3D non arriva con il dito. */
export const CityStrip: React.FC<CityStripProps> = ({ island, progress, selectedCityId, onSelectCity }) => (
  <nav aria-label={`Città di ${island.name}`} className="bg-white/70 border-b border-amber-200/60">
    <ol className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
      {island.cities.map((city, i) => {
        const unlocked = isCityUnlocked(progress, island, city.id);
        const cleared = isCityCleared(progress, city);
        const stars = Math.min(cityStars(progress, city), city.clearStars);
        return (
          <li key={city.id} className="shrink-0">
            <button
              onClick={() => onSelectCity(city.id)}
              aria-label={`${city.name}${unlocked ? '' : ' (bloccata)'}`}
              aria-current={selectedCityId === city.id ? 'true' : undefined}
              className={`min-h-14 flex items-center gap-2 rounded-2xl border-2 px-3 text-left text-xs font-black cursor-pointer transition-colors active:scale-95 ${
                unlocked
                  ? cleared
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-white border-amber-200 text-slate-900 hover:border-amber-400'
                  : 'bg-slate-100 border-dashed border-slate-300 text-slate-500'
              } ${selectedCityId === city.id ? 'ring-2 ring-amber-400' : ''}`}
            >
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[11px]" aria-hidden="true">{i + 1}</span>
              <span aria-hidden="true" className="text-xl">{city.emoji}</span>
              <span className="max-w-[8.5rem] truncate">{city.name}</span>
              {unlocked ? (
                <span className="flex items-center gap-0.5 text-amber-700" aria-hidden="true">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  {stars}/{city.clearStars}
                </span>
              ) : (
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);
