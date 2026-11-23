import React, { useEffect } from 'react';
import { Star, ArrowRight, RotateCcw, Map, Award } from 'lucide-react';
import { celebrate } from '../utils/celebrate';
import { sound } from '../utils/sound';

interface MathLevelCompleteProps {
  stars: number;
  correctCount: number;
  totalQuestions: number;
  rewardStars: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onBackToMap: () => void;
  onGoToStickers: () => void;
}

export const MathLevelComplete: React.FC<MathLevelCompleteProps> = ({
  stars,
  correctCount,
  totalQuestions,
  rewardStars,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onBackToMap,
  onGoToStickers,
}) => {
  useEffect(() => {
    sound.playFanfare();
    sound.speakEncouragement();
    celebrate({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ['#F59E0B', '#EC4899', '#06B6D4', '#10B981', '#8B5CF6'] });
  }, []);

  const press = (fn: () => void) => () => {
    sound.playClick();
    fn();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Livello completato"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white border-4 border-amber-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-200">
        <div className="text-6xl mb-2 animate-bounce stage-hide">🎉</div>
        <div aria-hidden="true" data-stage-prop="trophy" data-stage-stars={stars} className="h-36 -mt-2" />
        <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Livello completato!</span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
          {stars === 3 ? 'Perfetto! 🌟' : stars === 2 ? 'Bravissima! 👏' : 'Ottimo lavoro! 👍'}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Hai risposto bene a <strong className="text-slate-900">{correctCount}</strong> domande su{' '}
          <strong className="text-slate-900">{totalQuestions}</strong>.
        </p>

        <div className="flex items-center justify-center gap-3 py-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${
                i <= stars ? 'bg-amber-50 border-amber-400 shadow-md scale-110' : 'bg-slate-50 border-slate-200 opacity-40'
              }`}
            >
              <Star className={`w-8 h-8 ${i <= stars ? 'fill-amber-400 text-amber-500' : 'fill-slate-200 text-slate-300'}`} />
            </div>
          ))}
        </div>

        <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center gap-2 mb-5">
          <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          <span className="text-sm font-black text-amber-900">+{rewardStars} stelle d'oro per il tuo Album!</span>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={press(hasNextLevel ? onNextLevel : onBackToMap)}
            className="w-full py-3.5 px-4 min-h-14 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <span>{hasNextLevel ? 'Avanti col prossimo livello!' : 'Torna alla mappa'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={press(onReplay)} className="py-3 px-2 min-h-14 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-900 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              Rigioca
            </button>
            <button onClick={press(onBackToMap)} className="py-3 px-2 min-h-14 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-900 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 cursor-pointer">
              <Map className="w-3.5 h-3.5" />
              Mappa
            </button>
            <button onClick={press(onGoToStickers)} className="py-3 px-2 min-h-14 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 cursor-pointer">
              <Award className="w-3.5 h-3.5" />
              Album
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
