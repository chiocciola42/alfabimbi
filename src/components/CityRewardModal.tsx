import React from 'react';
import type { StickerItem } from '../types';
import type { CityDef } from '../world';
import { sound } from '../utils/sound';

interface CityRewardModalProps {
  city: CityDef;
  sticker?: StickerItem;
  nextCityName?: string;
  onContinue: () => void;
  onOpenAlbum: () => void;
}

/** Festa per una città superata: arriva una figurina e si apre la strada verso la prossima. */
export const CityRewardModal: React.FC<CityRewardModalProps> = ({ city, sticker, nextCityName, onContinue, onOpenAlbum }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label={`Città superata: ${city.name}`}>
    <div className="w-full max-w-md rounded-3xl bg-white border-4 border-amber-300 p-6 text-center shadow-2xl">
      <div className="text-6xl mb-2" aria-hidden="true">🎉</div>
      <h2 className="text-2xl font-black text-slate-900">Città superata!</h2>
      <p className="text-base font-bold text-amber-800 mt-1">
        <span aria-hidden="true">{city.emoji} </span>
        {city.name}
      </p>
      {sticker && (
        <div className="mt-4 rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
          <div className="text-6xl" aria-hidden="true">{sticker.emoji}</div>
          <p className="text-sm font-black text-slate-900 mt-1">Nuova figurina: {sticker.name}</p>
        </div>
      )}
      {nextCityName && <p className="mt-4 text-sm font-semibold text-slate-700">Si è aperta la strada per «{nextCityName}»!</p>}
      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        {sticker && (
          <button
            onClick={() => {
              sound.playClick();
              onOpenAlbum();
            }}
            className="flex-1 min-h-14 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black cursor-pointer"
          >
            Vedi nell'album
          </button>
        )}
        <button
          onClick={() => {
            sound.playClick();
            onContinue();
          }}
          className="flex-1 min-h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black cursor-pointer"
        >
          Avanti!
        </button>
      </div>
    </div>
  </div>
);
