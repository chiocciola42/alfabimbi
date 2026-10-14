import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AppState, StickerItem, TabId, UsageEventType, PlacedSticker } from '../types';
import { INITIAL_PROGRESS } from '../data/alphabet';
import { sound } from '../utils/sound';
import * as P from '../state/progress';
import * as U from '../state/usage';
import {
  STORAGE_KEY,
  createDefaultState,
  exportState,
  importState,
  loadState,
  requestPersistentStorage,
  sanitizeState,
  saveState,
  type ImportResult,
} from '../storage/persistence';

function celebrate(options: confetti.Options) {
  try {
    confetti(options);
  } catch {
    // canvas not available (tests, very old browsers)
  }
}

export function useProgress() {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState().state;
    return { ...loaded, usage: U.startSession(loaded.usage, Date.now()) };
  });
  const stateRef = useRef(state);
  const [storageOk, setStorageOk] = useState<boolean>(true);
  const [persistent, setPersistent] = useState<boolean>(false);

  /** Applies a pure transformation to the latest state; safe to call several times per tick. */
  const commit = useCallback((fn: (s: AppState) => AppState) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const logEvent = useCallback(
    (type: UsageEventType, extra: { amount?: number; detail?: string } = {}) => {
      commit((s) => ({ ...s, usage: U.recordEvent(s.usage, type, Date.now(), extra) }));
    },
    [commit]
  );

  // Persist every change.
  useEffect(() => {
    setStorageOk(saveState(state));
  }, [state]);

  // Ask the browser to keep our data; make sure the latest state is flushed when the page goes away.
  useEffect(() => {
    requestPersistentStorage().then(setPersistent);
    const flush = () => saveState(stateRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Another tab / installed-app window changed the data: adopt it instead of overwriting it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const incoming = sanitizeState(JSON.parse(e.newValue));
        stateRef.current = incoming;
        setState(incoming);
      } catch {
        // ignore corrupted foreign write
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Keep the audio engine in sync with the persisted preferences.
  const { soundEnabled, voiceEnabled } = state.progress;
  useEffect(() => {
    sound.setSoundEnabled(soundEnabled);
    sound.setVoiceEnabled(voiceEnabled);
  }, [soundEnabled, voiceEnabled]);

  const addStars = useCallback(
    (count: number) => {
      sound.playStarDing();
      commit((s) => ({ ...s, progress: P.addStars(s.progress, count) }));
      logEvent('stars_earned', { amount: Math.max(0, Math.floor(count)) });
    },
    [commit, logEvent]
  );

  const markLetterTraced = useCallback(
    (letterId: string, isUppercase: boolean) => {
      sound.playFanfare();
      sound.speakEncouragement();
      celebrate({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#F59E0B', '#EC4899', '#06B6D4', '#10B981', '#8B5CF6'] });
      commit((s) => ({ ...s, progress: P.markLetterTraced(s.progress, letterId, isUppercase) }));
      logEvent('letter_traced', { detail: `${letterId}${isUppercase ? '' : ' (min)'}` });
      logEvent('stars_earned', { amount: P.TRACE_REWARD_STARS });
    },
    [commit, logEvent]
  );

  const openSurprisePack = useCallback(
    (cost: number = P.PACK_COST): StickerItem[] => {
      const result = P.openPack(stateRef.current.progress, cost);
      if (result.drawn.length === 0) {
        sound.playErrorSoft();
        sound.speak(`Servono ${cost} stelle per aprire una bustina! Continua a giocare per guadagnarle!`);
        return [];
      }
      sound.playFanfare();
      celebrate({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
      commit((s) => ({ ...s, progress: result.progress }));
      logEvent('pack_opened');
      return result.drawn;
    },
    [commit, logEvent]
  );

  const claimMission = useCallback(
    (missionId: string, rewardStars: number) => {
      if (stateRef.current.progress.claimedMissionIds.includes(missionId)) return;
      sound.playSuccessChime();
      sound.speakEncouragement();
      commit((s) => ({ ...s, progress: P.claimMission(s.progress, missionId, rewardStars) }));
      logEvent('mission_claimed', { detail: missionId });
      logEvent('stars_earned', { amount: rewardStars });
    },
    [commit, logEvent]
  );

  const incrementBubbleLevel = useCallback(() => {
    commit((s) => ({ ...s, progress: { ...s.progress, completedBubbleLevels: s.progress.completedBubbleLevels + 1 } }));
    logEvent('bubble_round_completed');
  }, [commit, logEvent]);

  const incrementWordQuizRound = useCallback(
    (kind: 'quiz' | 'spelling' = 'quiz') => {
      commit((s) => ({ ...s, progress: { ...s.progress, completedWordQuizRounds: s.progress.completedWordQuizRounds + 1 } }));
      logEvent(kind === 'spelling' ? 'spelling_completed' : 'quiz_correct');
    },
    [commit, logEvent]
  );

  const recordWrongAnswer = useCallback(() => logEvent('quiz_wrong'), [logEvent]);

  const updateProfile = useCallback(
    (name: string, avatar: string) => {
      commit((s) => ({ ...s, progress: sanitizeState({ progress: { ...s.progress, name, avatar } }).progress }));
    },
    [commit]
  );

  const toggleSound = useCallback(() => {
    commit((s) => ({ ...s, progress: { ...s.progress, soundEnabled: !s.progress.soundEnabled } }));
  }, [commit]);

  const toggleVoice = useCallback(() => {
    commit((s) => ({ ...s, progress: { ...s.progress, voiceEnabled: !s.progress.voiceEnabled } }));
  }, [commit]);

  const updatePlacedStickers = useCallback(
    (stickers: PlacedSticker[]) => commit((s) => ({ ...s, progress: P.setPlacedStickers(s.progress, stickers) })),
    [commit]
  );

  const setBackground = useCallback(
    (bg: string) => commit((s) => ({ ...s, progress: { ...s.progress, currentBackground: bg } })),
    [commit]
  );

  /** Adds measured screen time (seconds) to the usage statistics. */
  const recordActiveTime = useCallback(
    (seconds: number, tab: TabId) => commit((s) => ({ ...s, usage: U.addActiveTime(s.usage, seconds, tab, Date.now()) })),
    [commit]
  );

  /** Resets the child's progress. Usage history is kept unless `includeUsage` is set. */
  const resetProgress = useCallback(
    (includeUsage = false) => {
      commit((s) => ({
        progress: sanitizeState({ progress: INITIAL_PROGRESS }).progress,
        usage: includeUsage ? U.startSession(createDefaultState().usage, Date.now()) : s.usage,
      }));
    },
    [commit]
  );

  const exportData = useCallback(() => exportState(stateRef.current), []);

  const importData = useCallback(
    (text: string): ImportResult => {
      const result = importState(text);
      if (result.ok) commit(() => result.state);
      return result;
    },
    [commit]
  );

  return {
    progress: state.progress,
    usage: state.usage,
    storageOk,
    persistent,
    addStars,
    markLetterTraced,
    openSurprisePack,
    claimMission,
    incrementBubbleLevel,
    incrementWordQuizRound,
    recordWrongAnswer,
    updateProfile,
    toggleSound,
    toggleVoice,
    updatePlacedStickers,
    setBackground,
    recordActiveTime,
    resetProgress,
    exportData,
    importData,
  };
}
