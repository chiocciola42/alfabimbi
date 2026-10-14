import React, { useState } from 'react';
import { ChildProgress } from '../types';
import { sound } from '../utils/sound';
import { X, Star, Trophy, Sparkles, User, RotateCcw } from 'lucide-react';

interface ProfileModalProps {
  progress: ChildProgress;
  onClose: () => void;
  onUpdateProfile: (name: string, avatar: string) => void;
  onResetProgress: () => void;
}

const AVATAR_OPTIONS = ['👧', '👸', '🧒', '🦄', '🐱', '🐰', '🦁', '⭐', '🚀', '🎨'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  progress,
  onClose,
  onUpdateProfile,
  onResetProgress,
}) => {
  const [name, setName] = useState<string>(progress.name);
  const [avatar, setAvatar] = useState<string>(progress.avatar);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const handleSave = () => {
    onUpdateProfile(name.trim() || 'Campionessa', avatar);
    sound.playSuccessChime();
    sound.speak(`Ciao ${name}! Sei pronta per imparare altre lettere?`);
    onClose();
  };

  const handleReset = () => {
    onResetProgress();
    setShowConfirmReset(false);
    onClose();
    sound.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border-2 border-amber-300 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shadow-sm mb-3">
            {avatar}
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            Profilo della Bambina
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Personalizza il tuo nome e scegli il tuo avatar preferito!
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nome della piccola scrittrice
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es: Sofia, Giulia..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-amber-200 focus:border-amber-500 focus:outline-hidden font-bold text-slate-800 text-base"
          />
        </div>

        {/* Avatar Picker */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Scegli il tuo Avatar
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_OPTIONS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setAvatar(item);
                  sound.playPop();
                }}
                className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                  avatar === item
                    ? 'border-amber-500 bg-amber-100 scale-105 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 mb-6">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
            Traguardi Conquistati
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Stelle</span>
              <span className="font-black text-amber-600 text-base tabular-nums">
                {progress.stars} ⭐
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Scritte</span>
              <span className="font-black text-blue-600 text-base tabular-nums">
                {progress.tracedUppercase.length} / 26
              </span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-200">
              <span className="text-xs text-slate-500 block">Figurine</span>
              <span className="font-black text-emerald-600 text-base tabular-nums">
                {progress.unlockedStickers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Save & Reset Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-sm rounded-2xl shadow-sm transition-all hover:scale-101 cursor-pointer"
          >
            Salva Profilo
          </button>

          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-xs text-slate-400 hover:text-rose-600 font-semibold py-1.5 transition-colors cursor-pointer"
            >
              Azzera progressi (per iniziare da capo)
            </button>
          ) : (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
              <p className="text-xs text-rose-800 font-bold mb-2">
                Vuoi davvero ricominciare da zero?
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Sì, azzera
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
