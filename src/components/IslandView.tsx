import React, { Suspense, lazy, useMemo } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import type { ChildProgress } from '../types';
import type { GameDef, IslandDef } from '../world';
import { isCityCleared, isCityUnlocked, islandStats } from '../state/world';
import { supportsWebGL } from '../world3d/webgl';
import { CityPanel } from './CityPanel';
import { CityList } from './CityList';
import { CityStrip } from './CityStrip';

const IslandScene = lazy(() => import('../world3d/IslandScene').then((m) => ({ default: m.IslandScene })));

interface IslandViewProps {
  island: IslandDef;
  progress: ChildProgress;
  /** Città in cui si trova il personaggio; null = la prima non ancora superata. */
  standingCityId: string | null;
  panelOpen: boolean;
  onSelectCity: (cityId: string) => void;
  onClosePanel: () => void;
  onPlay: (cityId: string, game: GameDef) => void;
  onBack: () => void;
}

export function frontierCityId(island: IslandDef, progress: ChildProgress): string {
  const open = island.cities.filter((c) => isCityUnlocked(progress, island, c.id));
  return (open.find((c) => !isCityCleared(progress, c)) ?? open[open.length - 1] ?? island.cities[0]).id;
}

/** La mappa di un'isola: scena 3D (o elenco 2D) con le città e la scheda della città scelta. */
export const IslandView: React.FC<IslandViewProps> = ({ island, progress, standingCityId, panelOpen, onSelectCity, onClosePanel, onPlay, onBack }) => {
  const webgl = useMemo(() => supportsWebGL(), []);
  const standing = standingCityId ?? frontierCityId(island, progress);
  const city = island.cities.find((c) => c.id === standing) ?? island.cities[0];
  const stats = islandStats(progress, island);

  return (
    <div className="relative flex flex-col h-[calc(100dvh-4rem-5.5rem)] xl:h-[calc(100dvh-4rem-3rem)] min-h-[440px]">
      <div className="flex items-center gap-3 px-3 sm:px-5 py-2 bg-white/80 border-b border-amber-200/70">
        <button
          onClick={onBack}
          aria-label="Torna all'arcipelago"
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
            <span aria-hidden="true">{island.emoji} </span>
            {island.name}
          </h1>
          <p className="text-xs font-semibold text-amber-800/80">{island.tagline}</p>
        </div>
        <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-sm font-black text-amber-900 shrink-0">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" aria-hidden="true" />
          {stats.cleared}/{stats.total} città
        </span>
      </div>

      {webgl && <CityStrip island={island} progress={progress} selectedCityId={standing} onSelectCity={onSelectCity} />}

      <div className="relative flex-1 min-h-0 overflow-clip">
        {webgl ? (
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-sky-100 text-4xl animate-pulse">🏝️</div>}>
            <IslandScene island={island} progress={progress} currentCityId={standing} onSelectCity={onSelectCity} />
          </Suspense>
        ) : (
          <div className="absolute inset-0 overflow-y-auto bg-sky-50">
            <CityList island={island} progress={progress} selectedCityId={panelOpen ? city.id : null} onSelectCity={onSelectCity} />
          </div>
        )}
        {panelOpen && (
          <CityPanel island={island} city={city} progress={progress} onPlay={(game) => onPlay(city.id, game)} onClose={onClosePanel} />
        )}
      </div>
    </div>
  );
};
