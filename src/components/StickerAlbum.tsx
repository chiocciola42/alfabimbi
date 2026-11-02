import React, { useState, useRef } from 'react';
import { StickerItem, PlacedSticker, AlbumCategory, StickerRarity } from '../types';
import { STICKERS_CATALOG, ALBUMS_LIST } from '../data/alphabet';
import { sound } from '../utils/sound';
import { buildMissions } from '../state/goals';
import {
  Star,
  Trophy,
  Sparkles,
  Lock,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  Gift,
  Award,
  Volume2,
  Share2,
  Eye,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { celebrate } from '../utils/celebrate';

interface StickerAlbumProps {
  unlockedStickers: string[];
  placedStickers: PlacedSticker[];
  currentStars: number;
  onUpdatePlacedStickers: (stickers: PlacedSticker[]) => void;
  currentBackground: string;
  onSetBackground: (bg: string) => void;
  onOpenPack: (cost: number) => StickerItem[];
  childName: string;
  avatar: string;
  masteredCount: number;
  lettersTracedCount: number;
  completedBubbleLevels: number;
  completedWordQuizRounds: number;
  completedMathLevels: number;
  /** Parole lette nel gioco "Leggi" (per la missione di lettura). */
  readWordsCount?: number;
  englishWordsCount?: number;
  claimedMissionIds: string[];
  onClaimMission: (id: string, rewardStars: number) => void;
}

export const StickerAlbum: React.FC<StickerAlbumProps> = ({
  unlockedStickers,
  placedStickers,
  currentStars,
  onUpdatePlacedStickers,
  currentBackground,
  onSetBackground,
  onOpenPack,
  childName,
  avatar,
  masteredCount,
  lettersTracedCount,
  completedBubbleLevels,
  completedWordQuizRounds,
  completedMathLevels,
  readWordsCount = 0,
  englishWordsCount = 0,
  claimedMissionIds,
  onClaimMission,
}) => {
  const [activeTab, setActiveTab] = useState<'albums' | 'pack' | 'board' | 'missions' | 'diploma'>('albums');
  const [selectedAlbumId, setSelectedAlbumId] = useState<AlbumCategory>('animali');
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);

  // Pack Opening state
  const [isPackOpening, setIsPackOpening] = useState<boolean>(false);
  const [unpackedCards, setUnpackedCards] = useState<StickerItem[]>([]);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);

  // Diploma Modal
  const [showDiplomaModal, setShowDiplomaModal] = useState<boolean>(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const backgroundThemes = [
    { id: 'meadow', name: 'Prato Fiorito 🌸', className: 'bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-200' },
    { id: 'castle', name: 'Castello Favole 🏰', className: 'bg-gradient-to-b from-pink-300 via-purple-200 to-rose-200' },
    { id: 'beach', name: 'Spiaggia Soleggiata 🏖️', className: 'bg-gradient-to-b from-amber-200 via-sky-200 to-amber-100' },
    { id: 'space', name: 'Spazio Galattico 🌌', className: 'bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900' },
    { id: 'forest', name: 'Bosco Incantato 🌲', className: 'bg-gradient-to-b from-emerald-800 via-teal-700 to-emerald-950' },
    { id: 'sweets', name: 'Pasticceria Golosa 🧁', className: 'bg-gradient-to-b from-rose-200 via-amber-100 to-pink-100' },
    { id: 'playroom', name: 'Stanza dei Giochi 🧸', className: 'bg-gradient-to-b from-amber-100 via-yellow-50 to-orange-100' },
  ];

  // Daily missions definition (shared with the home page)
  const dailyMissions = buildMissions({
    lettersTracedCount,
    completedBubbleLevels,
    completedWordQuizRounds,
    completedMathLevels,
    stars: currentStars,
    readWordsCount,
    englishWordsCount,
  });

  // Current album stickers
  const currentAlbumStickers = STICKERS_CATALOG.filter(
    (s) => s.albumId === selectedAlbumId
  );
  const currentAlbumUnlockedCount = currentAlbumStickers.filter((s) =>
    unlockedStickers.includes(s.id)
  ).length;

  const currentTheme =
    backgroundThemes.find((t) => t.id === currentBackground) || backgroundThemes[0];

  const handleStartPackOpen = () => {
    if (currentStars < 15) {
      sound.playErrorSoft();
      sound.speak('Servono 15 stelle per aprire una bustina! Gioca per vincerne altre!');
      return;
    }

    const cards = onOpenPack(15);
    if (cards.length > 0) {
      setUnpackedCards(cards);
      setRevealedCards([false, false, false]);
      setIsPackOpening(true);
      sound.speak('Tocca le carte per svelare le tue nuove figurine!');
    }
  };

  const handleRevealCard = (index: number) => {
    if (revealedCards[index]) return;

    sound.playStarDing();
    const updated = [...revealedCards];
    updated[index] = true;
    setRevealedCards(updated);

    const card = unpackedCards[index];
    if (card) {
      sound.speak(`${card.name}! ${card.rarity === 'leggendaria' ? 'È leggendaria!' : ''}`);
    }

    // If all revealed, cheer
    if (updated.every(Boolean)) {
      sound.playFanfare();
      celebrate({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
    }
  };

  const handleAddStickerToBoard = (item: StickerItem) => {
    if (!unlockedStickers.includes(item.id)) {
      sound.playErrorSoft();
      sound.speak(`Questa figurina richiede ${item.requiredStars} stelle o puoi trovarla aprendo una bustina!`);
      return;
    }

    sound.playPop();
    sound.speak(`${item.name}! ${item.soundLabel || ''}`);

    const newPlaced: PlacedSticker = {
      id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      stickerId: item.id,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      rotation: Math.round((Math.random() - 0.5) * 30),
      scale: 1.15,
    };

    onUpdatePlacedStickers([...placedStickers, newPlaced]);
    setSelectedPlacedId(newPlaced.id);
  };

  const handleBoardPointerDown = (e: React.PointerEvent, placedId: string) => {
    e.stopPropagation();
    setSelectedPlacedId(placedId);
    sound.playClick();

    const placed = placedStickers.find((p) => p.id === placedId);
    if (placed) {
      const item = STICKERS_CATALOG.find((s) => s.id === placed.stickerId);
      if (item && item.soundLabel) {
        sound.speak(item.soundLabel);
      }
    }

    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();

    const onPointerMove = (moveEvent: PointerEvent) => {
      const xPercent = Math.max(5, Math.min(95, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(5, Math.min(95, ((moveEvent.clientY - rect.top) / rect.height) * 100));

      onUpdatePlacedStickers(
        placedStickers.map((p) => (p.id === placedId ? { ...p, x: xPercent, y: yPercent } : p))
      );
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const getRarityBadge = (rarity: StickerRarity) => {
    switch (rarity) {
      case 'leggendaria':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-purple-500 text-white shadow-xs">
            ✨ Leggendaria
          </span>
        );
      case 'rara':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
            ⭐ Rara
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            Comune
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Banner & Treasury */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-3xl p-6 text-white shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-6 h-6 text-yellow-200 fill-yellow-300" />
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
              Grande Centro Premi & Figurine
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black drop-shadow-xs">
            Il Regno delle Figurine di {childName} {avatar}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-white/90">
            6 album a valore incrementale da scalare (da 0 a 420 ⭐), bustine sorpresa da scartare e splendidi paesaggi!
          </p>
        </div>

        {/* Treasury Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/30 text-center shadow-xs">
            <span className="text-[11px] font-bold block uppercase tracking-wider text-yellow-100">
              Figurine Collezionate
            </span>
            <span className="text-2xl font-black tabular-nums">
              {unlockedStickers.length} / {STICKERS_CATALOG.length}
            </span>
          </div>

          <div className="bg-amber-950/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-300/40 text-center shadow-xs">
            <span className="text-[11px] font-bold block uppercase tracking-wider text-amber-200">
              Tesoro di Stelle
            </span>
            <div className="flex items-center justify-center gap-1.5 font-black text-2xl tabular-nums text-yellow-300">
              <Star className="w-5 h-5 fill-yellow-300" />
              <span>{currentStars}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Incremental Tier Roadmap Strip */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border-2 border-amber-200 shadow-xs mb-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between gap-2 min-w-[620px]">
          {ALBUMS_LIST.map((tier, idx) => {
            const isUnlocked = currentStars >= tier.minStarsToUnlock;
            const isCurrent = isUnlocked && (idx === ALBUMS_LIST.length - 1 || currentStars < ALBUMS_LIST[idx + 1].minStarsToUnlock);

            return (
              <React.Fragment key={tier.id}>
                <button
                  onClick={() => {
                    setActiveTab('albums');
                    setSelectedAlbumId(tier.id);
                    sound.playClick();
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 min-h-11 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300 font-bold scale-102'
                      : isUnlocked
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-700'
                      : 'bg-slate-50 border-slate-200 opacity-60 text-slate-500'
                  }`}
                >
                  <span className="text-xl">{tier.icon}</span>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block text-amber-900">
                      Liv. {tier.tierNumber}
                    </span>
                    <span className="text-xs font-bold block truncate max-w-[95px] text-slate-900">
                      {tier.title}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500 block">
                      {tier.minStarsToUnlock}⭐
                    </span>
                  </div>
                </button>
                {idx < ALBUMS_LIST.length - 1 && (
                  <span className="text-slate-300 font-bold">&rarr;</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button
          onClick={() => {
            setActiveTab('albums');
            sound.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'albums'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span>📖 I 6 Album Tematici</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-black">
            {unlockedStickers.length}/{STICKERS_CATALOG.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('pack');
            sound.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pack'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Gift className="w-4 h-4 text-rose-500 animate-bounce" />
          <span>Apri la Bustina Magica!</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
            15 ⭐
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('board');
            sound.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'board'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span>🎨 La Mia Scena delle Figurine</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
            {placedStickers.length} posizionate
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('missions');
            sound.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'missions'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Missioni del Giorno</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('diploma');
            sound.playClick();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'diploma'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
              : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>Diploma di Merito</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: THE 6 THEMED INCREMENTAL STICKER ALBUMS            */}
      {/* ========================================================= */}
      {activeTab === 'albums' && (
        <div>
          {/* Sub-selector for the 6 Incremental Tier Albums */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {ALBUMS_LIST.map((alb) => {
              const isSelected = selectedAlbumId === alb.id;
              const isAlbumLocked = currentStars < alb.minStarsToUnlock;
              const albStickers = STICKERS_CATALOG.filter((s) => s.albumId === alb.id);
              const albUnlocked = albStickers.filter((s) => unlockedStickers.includes(s.id)).length;
              const isFinished = albUnlocked === albStickers.length;

              return (
                <button
                  key={alb.id}
                  onClick={() => {
                    setSelectedAlbumId(alb.id);
                    if (isAlbumLocked) {
                      sound.playErrorSoft();
                      sound.speak(`L'album ${alb.title} si sblocca a ${alb.minStarsToUnlock} stelle! Ti mancano ancora ${alb.minStarsToUnlock - currentStars} stelle!`);
                    } else {
                      sound.playClick();
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-300 scale-102'
                      : isAlbumLocked
                      ? 'bg-slate-50/90 border-slate-200 opacity-75 hover:opacity-100 hover:bg-white text-slate-700'
                      : 'bg-white/90 border-amber-200 hover:bg-white text-slate-700'
                  }`}
                >
                  {/* Top Tier Badge & Lock */}
                  <div className="flex items-center justify-between mb-1.5 w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Livello {alb.tierNumber}
                    </span>
                    {isAlbumLocked ? (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200" title={`Bloccato: mancano ${alb.minStarsToUnlock - currentStars} stelle`}>
                        <Lock className="w-3 h-3" />
                        <span>{alb.minStarsToUnlock}⭐</span>
                      </span>
                    ) : isFinished ? (
                      <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                        Finito!
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200">
                        Aperto
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 my-1">
                    <span className="text-2xl">{alb.icon}</span>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">
                      {alb.title}
                    </h4>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Da {alb.minStarsToUnlock} a {alb.maxStars} ⭐
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isAlbumLocked ? 'bg-slate-300' : 'bg-gradient-to-r from-amber-400 to-rose-400'
                        }`}
                        style={{ width: isAlbumLocked ? '0%' : `${(albUnlocked / albStickers.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 mt-1 block tabular-nums">
                      {isAlbumLocked ? `Mancano ${alb.minStarsToUnlock - currentStars} ⭐` : `${albUnlocked} / ${albStickers.length} figurine`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current Album Header Banner */}
          {(() => {
            const alb = ALBUMS_LIST.find((a) => a.id === selectedAlbumId)!;
            const isAlbumLocked = currentStars < alb.minStarsToUnlock;
            const albStickers = STICKERS_CATALOG.filter((s) => s.albumId === alb.id);
            const albUnlocked = albStickers.filter((s) => unlockedStickers.includes(s.id)).length;

            return (
              <div className={`p-5 rounded-3xl border-2 shadow-sm mb-6 ${
                isAlbumLocked
                  ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border-rose-300'
                  : 'bg-white border-amber-200'
              } flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs ${
                    isAlbumLocked ? 'bg-slate-200 text-slate-400' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isAlbumLocked ? '🔒' : alb.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-black uppercase tracking-wider bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md">
                        {alb.subtitle}
                      </span>
                      {isAlbumLocked && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                          Mancano {alb.minStarsToUnlock - currentStars} stelle
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{alb.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {isAlbumLocked
                        ? `Questo album richiede almeno ${alb.minStarsToUnlock} stelle per essere aperto. Continuando a scrivere e giocare con le bolle accumulerai le stelle necessarie!`
                        : alb.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTab('pack');
                      sound.playClick();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 min-h-11 bg-gradient-to-r from-amber-400 to-rose-400 text-white font-bold text-sm rounded-2xl shadow-xs hover:scale-102 transition-transform cursor-pointer"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Apri Bustine Sorpresa</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 12 Stickers of Selected Album */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {currentAlbumStickers.map((item) => {
              const isUnlocked = unlockedStickers.includes(item.id);
              const starsNeeded = Math.max(0, item.requiredStars - currentStars);

              return (
                <div
                  key={item.id}
                  className={`relative p-4 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center justify-between text-center ${
                    isUnlocked
                      ? item.rarity === 'leggendaria'
                        ? 'bg-gradient-to-b from-amber-50/90 to-rose-50/80 border-amber-400 shadow-md ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md'
                      : 'bg-slate-100/70 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Top Rarity Tag */}
                  <div className="w-full flex items-center justify-between mb-2">
                    {getRarityBadge(item.rarity)}
                    {isUnlocked && (
                      <button
                        onClick={() => {
                          sound.speak(`${item.name}! ${item.soundLabel || ''}`);
                          sound.playPop();
                        }}
                        className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-100 cursor-pointer"
                        title="Ascolta suono figurina"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Big Sticker Emoji */}
                  <div className="relative w-18 h-18 rounded-2xl bg-amber-50/80 flex items-center justify-center text-4xl sm:text-5xl my-1">
                    <span className={!isUnlocked ? 'filter grayscale blur-[1.5px]' : 'hover:scale-110 transition-transform'}>
                      {item.emoji}
                    </span>
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center text-white">
                        <Lock className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Title & Desc */}
                  <div className="w-full my-1">
                    <span className="font-black text-xs sm:text-sm text-slate-900 block truncate">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-500 line-clamp-2 leading-tight mt-0.5">
                      {item.description}
                    </span>
                  </div>

                  {/* Action or Lock requirement */}
                  <div className="w-full mt-2 pt-2 border-t border-amber-100">
                    {isUnlocked ? (
                      <button
                        onClick={() => handleAddStickerToBoard(item)}
                        className="w-full py-2.5 px-2 min-h-11 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Incolla sulla Scena ✨
                      </button>
                    ) : (
                      <div className="text-[11px] font-bold text-amber-800">
                        <span className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {item.requiredStars} stelle ({starsNeeded} rimaste)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: APRI LA BUSTINA MAGICA (PACK UNBOXING)             */}
      {/* ========================================================= */}
      {activeTab === 'pack' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-lg text-center max-w-3xl mx-auto">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-400 to-amber-400 flex items-center justify-center text-5xl shadow-md mb-3 text-white">
            🎁
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
            La Bustina Magica delle Figurine
          </h3>
          <p className="text-sm text-slate-600 font-medium max-w-md mx-auto mb-6">
            Scarta una bustina sorpresa per scoprire 3 figurine luccicanti da incollare nel tuo album!
          </p>

          {!isPackOpening ? (
            <div className="p-6 bg-gradient-to-tr from-amber-100 via-rose-50 to-cyan-100 rounded-3xl border-2 border-dashed border-amber-300 max-w-sm mx-auto mb-6 shadow-inner">
              <div className="w-32 h-44 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 border-4 border-white shadow-xl flex flex-col items-center justify-center text-white relative transform hover:scale-105 transition-transform duration-200 cursor-pointer">
                <span className="text-4xl mb-1">✨</span>
                <span className="font-black text-sm tracking-widest uppercase text-center px-2">
                  Bustina Alfabimbi
                </span>
                <span className="text-xs bg-white text-rose-600 font-black px-2 py-0.5 rounded-full mt-2 shadow-xs">
                  3 Figurine
                </span>
              </div>

              <div className="mt-5">
                <button
                  onClick={handleStartPackOpen}
                  disabled={currentStars < 15}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-500 hover:to-rose-600 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-md transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  <span>Apri Bustina (15 Stelle ⭐)</span>
                </button>
                <span className="text-xs text-amber-800 font-bold mt-2 block">
                  Il tuo tesoro attuale: {currentStars} stelle ⭐
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <p className="text-sm font-bold text-amber-900">
                Tocca ciascuna carta capovolta per rivelarla! ✨
              </p>

              {/* 3 Mystery Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                {unpackedCards.map((card, idx) => {
                  const isRevealed = revealedCards[idx];

                  return (
                    <div
                      key={idx}
                      onClick={() => handleRevealCard(idx)}
                      className={`h-64 rounded-3xl border-4 p-4 flex flex-col items-center justify-between transition-all duration-300 cursor-pointer select-none ${
                        isRevealed
                          ? 'bg-white border-amber-400 shadow-xl scale-102'
                          : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 border-white shadow-lg hover:scale-105'
                      }`}
                    >
                      {!isRevealed ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-white">
                          <span className="text-5xl animate-pulse">❓</span>
                          <span className="font-black text-xs uppercase tracking-wider mt-3 bg-white/20 px-3 py-1 rounded-full">
                            Tocca per girare!
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-between w-full animate-in zoom-in-90 duration-200">
                          <div className="w-full flex justify-between items-center">
                            {getRarityBadge(card.rarity)}
                            <span className="text-xs font-black text-emerald-600">NUOVA!</span>
                          </div>
                          <span className="text-6xl my-2 filter drop-shadow-md">
                            {card.emoji}
                          </span>
                          <div>
                            <span className="font-black text-sm text-slate-900 block truncate">
                              {card.name}
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-2">
                              {card.description}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Once all are revealed */}
              {revealedCards.every(Boolean) && (
                <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={handleStartPackOpen}
                    disabled={currentStars < 15}
                    className="py-3 px-6 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-sm transition-all cursor-pointer"
                  >
                    Apri un'altra bustina (15 ⭐)
                  </button>
                  <button
                    onClick={() => setActiveTab('albums')}
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
                  >
                    Guarda nel tuo Album &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LA MIA SCENA DELLE FIGURINE (STICKER PLAYBOARD)   */}
      {/* ========================================================= */}
      {activeTab === 'board' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🎨 Tavola Scenografica delle Figurine</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Scegli il paesaggio e trascina le tue figurine per inventare bellissime storie!
              </p>
            </div>

            {/* Background Selector & Tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white p-1 rounded-xl border border-amber-200 text-xs font-bold overflow-x-auto max-w-full">
                {backgroundThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onSetBackground(theme.id);
                      sound.playClick();
                    }}
                    className={`px-3 py-2 min-h-11 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      currentBackground === theme.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>

              {selectedPlacedId && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200">
                  <button
                    onClick={() => {
                      onUpdatePlacedStickers(
                        placedStickers.map((p) =>
                          p.id === selectedPlacedId
                            ? { ...p, scale: Math.min(2.5, p.scale + 0.2) }
                            : p
                        )
                      );
                      sound.playClick();
                    }}
                    className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-700 cursor-pointer"
                    title="Ingrandisci"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdatePlacedStickers(
                        placedStickers.map((p) =>
                          p.id === selectedPlacedId
                            ? { ...p, scale: Math.max(0.6, p.scale - 0.2) }
                            : p
                        )
                      );
                      sound.playClick();
                    }}
                    className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-700 cursor-pointer"
                    title="Rimpicciolisci"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdatePlacedStickers(
                        placedStickers.map((p) =>
                          p.id === selectedPlacedId
                            ? { ...p, rotation: (p.rotation + 25) % 360 }
                            : p
                        )
                      );
                      sound.playClick();
                    }}
                    className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-700 cursor-pointer"
                    title="Ruota"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      onUpdatePlacedStickers(placedStickers.filter((p) => p.id !== selectedPlacedId));
                      setSelectedPlacedId(null);
                      sound.playClick();
                    }}
                    className="w-11 h-11 inline-flex items-center justify-center hover:bg-rose-100 rounded-lg text-rose-600 cursor-pointer"
                    title="Rimuovi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {placedStickers.length > 0 && (
                <button
                  onClick={() => {
                    onUpdatePlacedStickers([]);
                    setSelectedPlacedId(null);
                    sound.playClick();
                  }}
                  className="px-4 py-2.5 min-h-11 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-sm font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Pulisci Tutto
                </button>
              )}
            </div>
          </div>

          {/* Canvas Frame */}
          <div
            ref={boardRef}
            onClick={() => setSelectedPlacedId(null)}
            className={`relative w-full h-[420px] sm:h-[480px] rounded-3xl border-4 border-white shadow-xl overflow-hidden select-none touch-none ${currentTheme.className} mb-6`}
          >
            {placedStickers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                <span className="text-6xl mb-2 animate-bounce">👇</span>
                <p className="text-slate-900 font-black text-base sm:text-lg bg-white/90 backdrop-blur-xs px-5 py-2.5 rounded-2xl border border-amber-200 shadow-md">
                  Tocca le figurine qui sotto per incollarle su questo paesaggio!
                </p>
              </div>
            )}

            {/* Placed Stickers */}
            {placedStickers.map((placed) => {
              const item = STICKERS_CATALOG.find((s) => s.id === placed.stickerId);
              if (!item) return null;
              const isSelected = selectedPlacedId === placed.id;

              return (
                <div
                  key={placed.id}
                  onPointerDown={(e) => handleBoardPointerDown(e, placed.id)}
                  style={{
                    left: `${placed.x}%`,
                    top: `${placed.y}%`,
                    transform: `translate(-50%, -50%) rotate(${placed.rotation}deg) scale(${placed.scale})`,
                  }}
                  className={`absolute select-none cursor-grab active:cursor-grabbing p-2 transition-transform duration-75 ${
                    isSelected ? 'ring-2 ring-amber-400 rounded-2xl bg-white/20 backdrop-blur-xs' : ''
                  }`}
                >
                  <div className="text-5xl sm:text-7xl drop-shadow-xl filter select-none">
                    {item.emoji}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Drawer to Tap & Add Unlocked Stickers to Board */}
          <div className="bg-white p-4 rounded-3xl border-2 border-amber-200 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
              Le tue figurine sbloccate pronte da incollare (Tocca per aggiungere):
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {STICKERS_CATALOG.filter((s) => unlockedStickers.includes(s.id)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddStickerToBoard(item)}
                  className="w-16 h-16 shrink-0 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-400 flex items-center justify-center text-3xl shadow-xs transition-all active:scale-90 cursor-pointer"
                  title={`Aggiungi ${item.name}`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MISSIONI DEL GIORNO (DAILY QUESTS)                 */}
      {/* ========================================================= */}
      {activeTab === 'missions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-200 shadow-md max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-black uppercase tracking-wider text-orange-600">
                  Missioni Speciali del Giorno
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Completa le missioni per vincere tante Stelle d'Oro!
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {dailyMissions.map((mission) => {
              const isClaimed = claimedMissionIds.includes(mission.id);
              const isCompleted = mission.current >= mission.goal;
              const percent = Math.min(100, Math.round((mission.current / mission.goal) * 100));

              return (
                <div
                  key={mission.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isClaimed
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : isCompleted
                      ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                      : 'bg-white border-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <span className="text-4xl">{mission.icon}</span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {mission.title}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        {mission.description}
                      </p>
                      {/* Mini Progress Bar */}
                      <div className="w-48 bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 mt-0.5 block tabular-nums">
                        {mission.current} / {mission.goal} completati
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 w-full sm:w-auto">
                    {isClaimed ? (
                      <span className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 px-4 py-2 bg-emerald-50 rounded-xl">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Premio Riscattato!</span>
                      </span>
                    ) : isCompleted ? (
                      <button
                        onClick={() => onClaimMission(mission.id, mission.reward)}
                        className="w-full sm:w-auto px-5 py-3 min-h-12 bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-500 hover:to-rose-500 text-white font-black text-sm rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-4 h-4 fill-white" />
                        <span>Riscatta +{mission.reward} Stelle!</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl block text-center">
                        In corso (+{mission.reward} ⭐)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: DIPLOMA DI MERITO PERSONALIZZATO                   */}
      {/* ========================================================= */}
      {activeTab === 'diploma' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-amber-300 shadow-xl max-w-2xl mx-auto text-center relative overflow-hidden">
          {/* Ornate corner frame details */}
          <div className="absolute top-2 left-2 text-2xl opacity-60">⚜️</div>
          <div className="absolute top-2 right-2 text-2xl opacity-60">⚜️</div>
          <div className="absolute bottom-2 left-2 text-2xl opacity-60">⚜️</div>
          <div className="absolute bottom-2 right-2 text-2xl opacity-60">⚜️</div>

          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-md text-white mb-4">
            🎓
          </div>

          <span className="text-xs font-black tracking-widest uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            Accademia dei Piccoli Scrittori
          </span>

          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 mb-1 tracking-tight">
            Diploma di Gran Merito
          </h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6">
            Riconoscimento Ufficiale di Eccellenza nell'Alfabeto
          </p>

          <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-lg mx-auto mb-6">
            Si conferisce solennemente questo prestigioso diploma a:
          </p>

          <div className="inline-block px-8 py-3 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 rounded-2xl border-2 border-amber-300 shadow-xs mb-6">
            <span className="text-3xl sm:text-4xl font-black text-amber-950">
              {childName} {avatar}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto mb-6">
            Per l'eccezionale impegno dimostrato nell'apprendimento delle 26 lettere dell'alfabeto,
            nella scrittura guidata e per aver conquistato un tesoro di <strong className="text-amber-600 font-black">{currentStars} Stelle Brillanti</strong> e <strong className="text-amber-600 font-black">{unlockedStickers.length} Figurine Magiche</strong>!
          </p>

          <div className="flex items-center justify-center gap-8 pt-4 border-t border-amber-200">
            <div>
              <span className="text-xs font-bold text-slate-400 block">Sigillo Ufficiale</span>
              <span className="text-3xl">🏅</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block">Lettere Scritte</span>
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {masteredCount} Padroneggiate
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
