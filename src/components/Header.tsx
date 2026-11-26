import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, Star, Sparkles, Home, Map, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChildProgress, Section, TabId } from '../types';
import { HoldButton } from './HoldButton';

interface HeaderProps {
  currentTab: TabId;
  /** Sezione attiva (nella pagina iniziale è null e non c'è navigazione). */
  section: Section | null;
  onSelectTab: (tab: TabId) => void;
  progress: ChildProgress;
  onOpenProfile: () => void;
  onToggleSound: () => void;
  onToggleVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  section,
  onSelectTab,
  progress,
  onOpenProfile,
  onToggleSound,
  onToggleVoice,
}) => {
  type NavTab = { id: TabId; label: string; short: string; Icon: LucideIcon };
  // Dentro un'isola: arcipelago, mappa dell'isola e album. I giochi si scelgono dalle città.
  const navTabs: NavTab[] = section
    ? [
        { id: 'home', label: 'Home', short: 'Home', Icon: Home },
        { id: 'island', label: 'Isola', short: 'Isola', Icon: Map },
        { id: 'stickers', label: 'Album Premi', short: 'Album', Icon: Trophy },
      ]
    : [];

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onSelectTab('home')}
          aria-label="Torna alla pagina iniziale"
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-white shadow-sm font-bold text-xl group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl sm:text-2xl text-amber-900 tracking-tight leading-none block">
              Alfabimbi
            </span>
            <span className="text-xs font-medium text-amber-600/90 tracking-wide hidden sm:block">
              Impara & Gioca
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-2 xl:gap-3 shrink-0">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 2xl:px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-100/90 text-amber-900 shadow-xs border border-amber-300/60'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
                }`}
              >
                {/* Full names only on very wide screens: with seven sections they would not fit at 1280px */}
                <span aria-hidden="true" className="2xl:hidden">{tab.short}</span>
                <span aria-hidden="true" className="hidden 2xl:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Controls, Stars and Kid Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Star Counter Pill */}
          <button
            onClick={() => onSelectTab('stickers')}
            title="Guarda i tuoi premi nell'Album!"
            className="flex items-center gap-1.5 px-3 min-h-11 xl:min-h-9 bg-amber-100 hover:bg-amber-200/80 text-amber-900 rounded-2xl border border-amber-300/70 shadow-xs transition-colors cursor-pointer"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-500 animate-pulse" />
            <span className="font-bold text-sm tabular-nums">{progress.stars}</span>
            <span className="text-xs font-semibold text-amber-700 hidden sm:inline">Stelle</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSound}
            title={progress.soundEnabled ? 'Effetti sonori attivi' : 'Effetti sonori mutati'}
            aria-label="Attiva o disattiva suoni"
            aria-pressed={progress.soundEnabled}
            className={`w-11 h-11 xl:w-9 xl:h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              progress.soundEnabled
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-rose-50 border-rose-200 text-rose-500'
            }`}
          >
            {progress.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Voice Narration Toggle */}
          <button
            onClick={onToggleVoice}
            title={progress.voiceEnabled ? 'Voce attiva' : 'Voce disattivata'}
            aria-label="Attiva o disattiva voce"
            aria-pressed={progress.voiceEnabled}
            className={`w-11 h-11 xl:w-9 xl:h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              progress.voiceEnabled
                ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            {progress.voiceEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Child Profile Button */}
          {/* Area genitori: serve tenere premuto, così un tocco distratto non apre backup e impostazioni */}
          <HoldButton
            onHoldComplete={onOpenProfile}
            ariaLabel="Area genitori: profilo e impostazioni (tieni premuto)"
            title="Area genitori: tieni premuto per 3 secondi"
            className="flex items-center gap-2 pl-2 pr-2 sm:pr-3 xl:pr-2 min-h-11 xl:min-h-9 bg-white hover:bg-amber-50 rounded-2xl border border-amber-200 shadow-xs transition-all cursor-pointer"
          >
            <span className="text-2xl leading-none">{progress.avatar}</span>
            <span className="text-sm font-bold text-slate-800 max-w-[110px] truncate hidden sm:inline xl:hidden">
              {progress.name}
            </span>
          </HoldButton>
        </div>
      </div>
    </header>

    {/* Barra di navigazione inferiore (smartphone e tablet): raggiungibile col pollice */}
    {navTabs.length > 0 && (
      <nav
        aria-label="Navigazione principale"
        className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-amber-200 shadow-[0_-4px_16px_rgba(120,53,15,0.08)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="max-w-2xl mx-auto flex items-stretch gap-1 px-1.5 pt-1.5 pb-1.5">
          {navTabs.map(({ id, label, short, Icon }) => {
            const isActive = currentTab === id;
            return (
              <button
                key={id}
                onClick={() => onSelectTab(id)}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-xs sm:text-sm font-bold leading-tight transition-colors cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-900/80 hover:bg-amber-100 active:bg-amber-100'
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span aria-hidden="true" className="truncate max-w-full">{short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    )}
    </>
  );
};
