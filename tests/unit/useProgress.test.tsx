import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProgress } from '../../src/hooks/useProgress';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import { STORAGE_KEY, exportState, loadState } from '../../src/storage/persistence';

const saved = () => loadState().state;

describe('useProgress', () => {
  it('starts from defaults and counts the first session', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.progress.name).toBe(INITIAL_PROGRESS.name);
    expect(result.current.usage.sessions).toBe(1);
    expect(result.current.usage.firstOpenedAt).not.toBeNull();
    expect(result.current.storageOk).toBe(true);
  });

  it('persists every change to localStorage', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.addStars(7));
    expect(saved().progress.stars).toBe(INITIAL_PROGRESS.stars + 7);
  });

  it('restores progress and accumulates sessions after a reload', () => {
    const first = renderHook(() => useProgress());
    act(() => first.result.current.updateProfile('Luna', '🦄'));
    act(() => first.result.current.addStars(20));
    act(() => first.result.current.recordActiveTime(95, 'tracing'));
    const stars = first.result.current.progress.stars;
    first.unmount();

    const second = renderHook(() => useProgress());
    expect(second.result.current.progress.name).toBe('Luna');
    expect(second.result.current.progress.avatar).toBe('🦄');
    expect(second.result.current.progress.stars).toBe(stars);
    expect(second.result.current.usage.sessions).toBe(2);
    expect(second.result.current.usage.totalActiveSeconds).toBe(95);
  });

  it('applies several updates in the same tick without losing any', () => {
    const { result } = renderHook(() => useProgress());
    const before = result.current.progress.stars;
    act(() => {
      result.current.addStars(1);
      result.current.addStars(2);
      result.current.addStars(3);
    });
    expect(result.current.progress.stars).toBe(before + 6);
  });

  it('logs star earnings and unlocks stickers', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.resetProgress());
    act(() => result.current.addStars(100));
    expect(result.current.usage.counters.stars_earned).toBe(1);
    const expectedUnlocked = STICKERS_CATALOG.filter((s) => s.requiredStars <= INITIAL_PROGRESS.stars + 100).length;
    expect(result.current.progress.unlockedStickers.length).toBeGreaterThanOrEqual(expectedUnlocked);
  });

  it('markLetterTraced rewards, masters and records the usage event', () => {
    const { result } = renderHook(() => useProgress());
    const starsBefore = result.current.progress.stars;
    act(() => result.current.markLetterTraced('E', true));
    act(() => result.current.markLetterTraced('E', false));
    expect(result.current.progress.masteredLetters).toContain('E');
    expect(result.current.progress.stars).toBe(starsBefore + 10);
    expect(result.current.usage.counters.letter_traced).toBe(2);
  });

  it('openSurprisePack spends stars, returns cards and logs it', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.addStars(50));
    const before = result.current.progress;
    let drawn: unknown[] = [];
    act(() => {
      drawn = result.current.openSurprisePack(15);
    });
    expect(drawn).toHaveLength(3);
    expect(result.current.progress.stars).toBe(before.stars - 15);
    expect(result.current.progress.packsOpened).toBe(before.packsOpened + 1);
    expect(result.current.usage.counters.pack_opened).toBe(1);
  });

  it('openSurprisePack refuses without enough stars', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.resetProgress());
    act(() => {
      // drain below the cost
      result.current.importData(exportState({ progress: { ...INITIAL_PROGRESS, stars: 3 }, usage: result.current.usage }));
    });
    let drawn: unknown[] = ['x'];
    act(() => {
      drawn = result.current.openSurprisePack(15);
    });
    expect(drawn).toEqual([]);
    expect(result.current.progress.stars).toBe(3);
    expect(result.current.usage.counters.pack_opened).toBe(0);
  });

  it('claimMission pays out only once', () => {
    const { result } = renderHook(() => useProgress());
    const before = result.current.progress.stars;
    act(() => result.current.claimMission('m_trace', 10));
    act(() => result.current.claimMission('m_trace', 10));
    expect(result.current.progress.stars).toBe(before + 10);
    expect(result.current.progress.claimedMissionIds).toEqual(['m_trace']);
    expect(result.current.usage.counters.mission_claimed).toBe(1);
  });

  it('tracks bubble and quiz rounds', () => {
    const { result } = renderHook(() => useProgress());
    const { completedBubbleLevels, completedWordQuizRounds } = result.current.progress;
    act(() => result.current.incrementBubbleLevel());
    act(() => result.current.incrementWordQuizRound('quiz'));
    act(() => result.current.incrementWordQuizRound('spelling'));
    act(() => result.current.recordWrongAnswer());
    expect(result.current.progress.completedBubbleLevels).toBe(completedBubbleLevels + 1);
    expect(result.current.progress.completedWordQuizRounds).toBe(completedWordQuizRounds + 2);
    expect(result.current.usage.counters).toMatchObject({
      bubble_round_completed: 1,
      quiz_correct: 1,
      spelling_completed: 1,
      quiz_wrong: 1,
    });
  });

  it('sanitizes profile updates', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.updateProfile('   ', '🐱'));
    expect(result.current.progress.name).toBe(INITIAL_PROGRESS.name);
    act(() => result.current.updateProfile('N'.repeat(80), '🐱'));
    expect(result.current.progress.name).toHaveLength(24);
  });

  it('persists sound / voice preferences', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.toggleSound());
    act(() => result.current.toggleVoice());
    expect(saved().progress.soundEnabled).toBe(false);
    expect(saved().progress.voiceEnabled).toBe(false);
  });

  it('persists the sticker board and background', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.setBackground('space'));
    act(() =>
      result.current.updatePlacedStickers([{ id: 'p1', stickerId: 'stk_1', x: 10, y: 20, rotation: 0, scale: 1 }])
    );
    expect(saved().progress.currentBackground).toBe('space');
    expect(saved().progress.placedStickers).toHaveLength(1);
  });

  it('resetProgress keeps the usage history by default and clears it on request', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.recordActiveTime(60, 'words'));
    act(() => result.current.addStars(40));
    act(() => result.current.resetProgress());
    expect(result.current.progress).toEqual(INITIAL_PROGRESS);
    expect(result.current.usage.totalActiveSeconds).toBe(60);
    act(() => result.current.resetProgress(true));
    expect(result.current.usage.totalActiveSeconds).toBe(0);
    expect(result.current.usage.sessions).toBe(1);
  });

  it('exports and re-imports a backup', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.updateProfile('Backup', '🚀'));
    act(() => result.current.addStars(33));
    const backup = result.current.exportData();
    act(() => result.current.resetProgress());
    expect(result.current.progress.name).not.toBe('Backup');
    let outcome: { ok: boolean } = { ok: false };
    act(() => {
      outcome = result.current.importData(backup);
    });
    expect(outcome.ok).toBe(true);
    expect(result.current.progress.name).toBe('Backup');
    expect(saved().progress.name).toBe('Backup');
  });

  it('rejects an invalid backup without touching the current data', () => {
    const { result } = renderHook(() => useProgress());
    const before = result.current.progress;
    let outcome: { ok: boolean } = { ok: true };
    act(() => {
      outcome = result.current.importData('{"hello":1}');
    });
    expect(outcome.ok).toBe(false);
    expect(result.current.progress).toEqual(before);
  });

  it('adopts changes written by another tab', () => {
    const { result } = renderHook(() => useProgress());
    const incoming = JSON.stringify({
      version: 3,
      progress: { ...INITIAL_PROGRESS, name: 'Altra Scheda', stars: 500 },
      usage: result.current.usage,
    });
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: incoming }));
    });
    expect(result.current.progress.name).toBe('Altra Scheda');
    expect(result.current.progress.stars).toBe(500);
  });

  it('ignores corrupted or unrelated storage events', () => {
    const { result } = renderHook(() => useProgress());
    const before = result.current.progress;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{bad' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '{}' }));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
    });
    expect(result.current.progress).toEqual(before);
  });

  it('flags storage problems instead of crashing', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      const { result } = renderHook(() => useProgress());
      act(() => result.current.addStars(1));
      expect(result.current.storageOk).toBe(false);
      expect(result.current.progress.stars).toBe(INITIAL_PROGRESS.stars + 1);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('starts normally when the stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{{{{');
    const { result } = renderHook(() => useProgress());
    expect(result.current.progress).toEqual(INITIAL_PROGRESS);
  });

  it('writes a read word in the diary once and logs the activity', () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.recordWordRead('casa'));
    act(() => result.current.recordWordRead('CASA'));
    expect(result.current.progress.readWords).toEqual(['CASA']);
    expect(saved().progress.readWords).toEqual(['CASA']);
    expect(saved().usage.counters.word_read).toBe(2);
    expect(saved().usage.log.at(-1)).toMatchObject({ type: 'word_read', detail: 'CASA' });
  });

  it('remembers the text style chosen by the parents', () => {
    const first = renderHook(() => useProgress());
    expect(first.result.current.progress.textStyle).toBe('upper');
    act(() => first.result.current.setTextStyle('cursive'));
    first.unmount();
    const second = renderHook(() => useProgress());
    expect(second.result.current.progress.textStyle).toBe('cursive');
  });
});
