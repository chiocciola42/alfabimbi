import { useState, useEffect } from 'react';
import { ChildProgress, PlacedSticker, StickerItem } from '../types';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../data/alphabet';
import { sound } from '../utils/sound';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'alfabimbi_child_progress_v2';

export function useProgress() {
  const [progress, setProgress] = useState<ChildProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...INITIAL_PROGRESS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return INITIAL_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore
    }
  }, [progress]);

  // Sync sound settings to SoundManager
  useEffect(() => {
    sound.setSoundEnabled(progress.soundEnabled);
    sound.setVoiceEnabled(progress.voiceEnabled);
  }, [progress.soundEnabled, progress.voiceEnabled]);

  const addStars = (count: number) => {
    sound.playStarDing();
    setProgress((prev) => {
      const newStars = prev.stars + count;
      // Auto-unlock stickers whose requiredStars is met
      const newUnlocked = [...prev.unlockedStickers];
      STICKERS_CATALOG.forEach((stk) => {
        if (newStars >= stk.requiredStars && !newUnlocked.includes(stk.id)) {
          newUnlocked.push(stk.id);
        }
      });
      return {
        ...prev,
        stars: newStars,
        unlockedStickers: newUnlocked,
      };
    });
  };

  const markLetterTraced = (letterId: string, isUppercase: boolean) => {
    sound.playFanfare();
    sound.speakEncouragement();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EC4899', '#06B6D4', '#10B981', '#8B5CF6'],
      });
    } catch {}

    setProgress((prev) => {
      const field = isUppercase ? 'tracedUppercase' : 'tracedLowercase';
      const currentList = prev[field];
      const updatedList = currentList.includes(letterId)
        ? currentList
        : [...currentList, letterId];

      const isBoth =
        (isUppercase && prev.tracedLowercase.includes(letterId)) ||
        (!isUppercase && prev.tracedUppercase.includes(letterId));

      const updatedMastered =
        isBoth && !prev.masteredLetters.includes(letterId)
          ? [...prev.masteredLetters, letterId]
          : prev.masteredLetters;

      const newStars = prev.stars + 5;
      const newUnlocked = [...prev.unlockedStickers];
      STICKERS_CATALOG.forEach((stk) => {
        if (newStars >= stk.requiredStars && !newUnlocked.includes(stk.id)) {
          newUnlocked.push(stk.id);
        }
      });

      return {
        ...prev,
        [field]: updatedList,
        masteredLetters: updatedMastered,
        stars: newStars,
        unlockedStickers: newUnlocked,
        lettersTracedCount: prev.lettersTracedCount + 1,
      };
    });
  };

  // Open surprise pack (draw 3 cards)
  const openSurprisePack = (cost: number = 15): StickerItem[] => {
    if (progress.stars < cost) {
      sound.playErrorSoft();
      sound.speak(`Servono ${cost} stelle per aprire una bustina! Continua a giocare per guadagnarle!`);
      return [];
    }

    // Pick 3 stickers. Prioritize locked ones
    const lockedStickers = STICKERS_CATALOG.filter(
      (s) => !progress.unlockedStickers.includes(s.id)
    );

    const candidates = lockedStickers.length > 0 ? lockedStickers : STICKERS_CATALOG;
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const drawn: StickerItem[] = shuffled.slice(0, 3);

    // If less than 3 locked remaining, fill with any from catalog
    while (drawn.length < 3) {
      const extra = STICKERS_CATALOG[Math.floor(Math.random() * STICKERS_CATALOG.length)];
      if (!drawn.some((d) => d.id === extra.id)) {
        drawn.push(extra);
      }
    }

    const drawnIds = drawn.map((d) => d.id);
    const updatedUnlocked = Array.from(new Set([...progress.unlockedStickers, ...drawnIds]));

    sound.playFanfare();
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
      });
    } catch {}

    setProgress((prev) => ({
      ...prev,
      stars: prev.stars - cost,
      unlockedStickers: updatedUnlocked,
      packsOpened: prev.packsOpened + 1,
    }));

    return drawn;
  };

  const claimMission = (missionId: string, rewardStars: number) => {
    sound.playSuccessChime();
    sound.speakEncouragement();
    addStars(rewardStars);
    setProgress((prev) => ({
      ...prev,
      claimedMissionIds: [...prev.claimedMissionIds, missionId],
    }));
  };

  const incrementBubbleLevel = () => {
    setProgress((prev) => ({
      ...prev,
      completedBubbleLevels: prev.completedBubbleLevels + 1,
    }));
  };

  const incrementWordQuizRound = () => {
    setProgress((prev) => ({
      ...prev,
      completedWordQuizRounds: prev.completedWordQuizRounds + 1,
    }));
  };

  const updateProfile = (name: string, avatar: string) => {
    setProgress((prev) => ({ ...prev, name, avatar }));
  };

  const toggleSound = () => {
    setProgress((prev) => {
      const nextVal = !prev.soundEnabled;
      sound.setSoundEnabled(nextVal);
      return { ...prev, soundEnabled: nextVal };
    });
  };

  const toggleVoice = () => {
    setProgress((prev) => {
      const nextVal = !prev.voiceEnabled;
      sound.setVoiceEnabled(nextVal);
      return { ...prev, voiceEnabled: nextVal };
    });
  };

  const placeStickerOnBoard = (sticker: PlacedSticker) => {
    setProgress((prev) => ({
      ...prev,
      placedStickers: [...prev.placedStickers, sticker],
    }));
  };

  const updatePlacedStickers = (stickers: PlacedSticker[]) => {
    setProgress((prev) => ({ ...prev, placedStickers: stickers }));
  };

  const setBackground = (bg: string) => {
    setProgress((prev) => ({ ...prev, currentBackground: bg }));
  };

  const resetProgress = () => {
    setProgress(INITIAL_PROGRESS);
  };

  return {
    progress,
    addStars,
    markLetterTraced,
    openSurprisePack,
    claimMission,
    incrementBubbleLevel,
    incrementWordQuizRound,
    updateProfile,
    toggleSound,
    toggleVoice,
    placeStickerOnBoard,
    updatePlacedStickers,
    setBackground,
    resetProgress,
  };
}
