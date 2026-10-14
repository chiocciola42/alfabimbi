import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, Star, Trophy, Sparkles } from 'lucide-react';
import { ChildProgress, TabId } from '../types';

interface HeaderProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  progress: ChildProgress;
  onOpenProfile: () => void;
  onToggleSound: () => void;
  onToggleVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  progress,
  onOpenProfile,
  onToggleSound,
  onToggleVoice,
}) => {
  const navTabs: Array<{ id: TabId; label: string }> = [
    { id: 'explorer', label: 'Alfabeto' },
    { id: 'tracing', label: 'Impara a Scrivere' },
    { id: 'bubbles', label: 'Bolle Magiche' },
    { id: 'words', label: 'Caccia alle Parole' },
    { id: 'stickers', label: 'Album Premi' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onSelectTab('explorer')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-hidden group whitespace-nowrap shrink-0 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-white shadow-sm font-bold text-xl group-hover:scale-105 transition-transform duration-200">
            A
          </div>
          <div>
            <span className="font-bold text-xl sm:text-2xl text-amber-900 tracking-tight leading-none block">
              Alfabimbi
            </span>
            <span className="text-[11px] font-medium text-amber-600/90 tracking-wide block">
              Impara & Gioca
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-100/90 text-amber-900 shadow-xs border border-amber-300/60'
                    : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Controls, Stars and Kid Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Star Counter Pill */}
          <button
            onClick={() => onSelectTab('stickers')}
            title="Guarda i tuoi premi nell'Album!"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200/80 text-amber-900 rounded-2xl border border-amber-300/70 shadow-xs transition-colors cursor-pointer"
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
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              progress.soundEnabled
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-rose-50 border-rose-200 text-rose-500'
            }`}
          >
            {progress.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Voice Narration Toggle */}
          <button
            onClick={onToggleVoice}
            title={progress.voiceEnabled ? 'Voce italiana attiva' : 'Voce disattivata'}
            aria-label="Attiva o disattiva voce"
            aria-pressed={progress.voiceEnabled}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              progress.voiceEnabled
                ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            {progress.voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Child Profile Button */}
          <button
            onClick={onOpenProfile}
            aria-label="Profilo e impostazioni"
            title="Profilo bambina e impostazioni"
            className="flex items-center gap-2 pl-2 pr-3 py-1 bg-white hover:bg-amber-50 rounded-2xl border border-amber-200 shadow-xs transition-all hover:scale-102 cursor-pointer"
          >
            <span className="text-2xl leading-none">{progress.avatar}</span>
            <span className="text-sm font-bold text-slate-800 max-w-[80px] sm:max-w-[110px] truncate hidden xs:inline">
              {progress.name}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around px-2 py-2 bg-amber-50/70 border-t border-amber-100 overflow-x-auto gap-1">
        {navTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-900/80 hover:bg-amber-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
