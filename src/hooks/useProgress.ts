import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { AppState, StickerItem, TabId, TextStyle, UsageEventType, PlacedSticker } from '../types';
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

  /** A word was read correctly: it goes into the diary and logs the activity (stars are given by the caller). */
  const recordWordRead = useCallback(
    (word: string) => {
      commit((s) => ({ ...s, progress: P.markWordRead(s.progress, word) }));
      logEvent('word_read', { detail: word.toUpperCase() });
    },
    [commit, logEvent]
  );

  const recordSyllable = useCallback(
    (syllable: string) => {
      commit((s) => ({ ...s, progress: P.markSyllableLearned(s.progress, syllable) }));
      logEvent('syllable_learned', { detail: syllable.toUpperCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishWord = useCallback(
    (word: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishWordLearned(s.progress, word) }));
      logEvent('english_word_learned', { detail: word.toLowerCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishLetter = useCallback(
    (letter: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishLetterLearned(s.progress, letter) }));
      logEvent('english_letter_learned', { detail: letter.toUpperCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishFamilyWord = useCallback(
    (word: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishFamilyWordRead(s.progress, word) }));
      logEvent('english_family_word_read', { detail: word.toLowerCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishSightWord = useCallback(
    (word: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishSightWordRead(s.progress, word) }));
      logEvent('english_sight_word_read', { detail: word.toLowerCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishLetterTraced = useCallback(
    (letter: string, isUppercase: boolean) => {
      commit((s) => ({ ...s, progress: P.markEnglishLetterTraced(s.progress, letter, isUppercase) }));
      logEvent('english_letter_traced', { detail: isUppercase ? letter.toUpperCase() : letter.toLowerCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishWordSpelled = useCallback(
    (word: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishWordSpelled(s.progress, word) }));
      logEvent('english_word_spelled', { detail: word.toLowerCase() });
    },
    [commit, logEvent]
  );

  const recordEnglishStoryRead = useCallback(
    (storyId: string) => {
      commit((s) => ({ ...s, progress: P.markEnglishStoryRead(s.progress, storyId) }));
      logEvent('english_story_read', { detail: storyId });
    },
    [commit, logEvent]
  );

  const setTextStyle = useCallback(
    (style: TextStyle) => commit((s) => ({ ...s, progress: P.setTextStyle(s.progress, style) })),
    [commit]
  );

  const completeMathLevel = useCallback(
    (levelId: number, levelStars: number, correctCount: number) => {
      commit((s) => ({ ...s, progress: P.completeMathLevel(s.progress, levelId, levelStars, correctCount) }));
      logEvent('math_level_completed', { detail: `Livello ${levelId}` });
      logEvent('stars_earned', { amount: P.mathLevelReward(levelStars) });
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
    completeMathLevel,
    recordWordRead,
    recordSyllable,
    recordEnglishWord,
    recordEnglishLetter,
    recordEnglishFamilyWord,
    recordEnglishSightWord,
    recordEnglishLetterTraced,
    recordEnglishWordSpelled,
    recordEnglishStoryRead,
    setTextStyle,
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
