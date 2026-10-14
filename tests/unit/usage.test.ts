import { describe, expect, it } from 'vitest';
import {
  MAX_LOG_ENTRIES,
  addActiveTime,
  createInitialUsage,
  currentStreak,
  dayKey,
  recordEvent,
  startSession,
} from '../../src/state/usage';

const T = new Date(2026, 9, 14, 10, 0, 0).getTime(); // 14 Oct 2026, local time
const DAY = 24 * 60 * 60 * 1000;

describe('usage statistics', () => {
  it('starts empty', () => {
    const u = createInitialUsage();
    expect(u.sessions).toBe(0);
    expect(u.firstOpenedAt).toBeNull();
    expect(u.log).toEqual([]);
  });

  it('formats day keys in local time', () => {
    expect(dayKey(T)).toBe('2026-10-14');
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('counts sessions and keeps the first open date', () => {
    let u = startSession(createInitialUsage(), T);
    u = startSession(u, T + DAY);
    expect(u.sessions).toBe(2);
    expect(u.firstOpenedAt).toBe(T);
    expect(u.lastOpenedAt).toBe(T + DAY);
  });

  it('accumulates active time per tab and per day, ignoring non-positive input', () => {
    let u = createInitialUsage();
    u = addActiveTime(u, 30, 'tracing', T);
    u = addActiveTime(u, 12.9, 'tracing', T);
    u = addActiveTime(u, 0, 'words', T);
    u = addActiveTime(u, -5, 'words', T);
    expect(u.totalActiveSeconds).toBe(42);
    expect(u.tabSeconds.tracing).toBe(42);
    expect(u.tabSeconds.words).toBe(0);
    expect(u.daily['2026-10-14'].seconds).toBe(42);
  });

  it('records events with counters, daily totals and a log', () => {
    let u = createInitialUsage();
    u = recordEvent(u, 'letter_traced', T, { detail: 'A' });
    u = recordEvent(u, 'stars_earned', T, { amount: 5 });
    u = recordEvent(u, 'quiz_wrong', T);
    expect(u.counters.letter_traced).toBe(1);
    expect(u.counters.stars_earned).toBe(1);
    expect(u.daily['2026-10-14']).toEqual({ seconds: 0, stars: 5, activities: 2 });
    expect(u.log.map((e) => e.type)).toEqual(['letter_traced', 'stars_earned', 'quiz_wrong']);
    expect(u.log[0].detail).toBe('A');
  });

  it('never lets negative star amounts reduce the daily total', () => {
    const u = recordEvent(createInitialUsage(), 'stars_earned', T, { amount: -4 });
    expect(u.daily['2026-10-14'].stars).toBe(0);
  });

  it('caps the event log keeping the most recent entries', () => {
    let u = createInitialUsage();
    for (let i = 0; i < MAX_LOG_ENTRIES + 25; i++) u = recordEvent(u, 'quiz_correct', T + i);
    expect(u.log).toHaveLength(MAX_LOG_ENTRIES);
    expect(u.log[u.log.length - 1].t).toBe(T + MAX_LOG_ENTRIES + 24);
    expect(u.counters.quiz_correct).toBe(MAX_LOG_ENTRIES + 25);
  });

  it('does not mutate the previous state', () => {
    const before = createInitialUsage();
    const snapshot = JSON.stringify(before);
    recordEvent(before, 'pack_opened', T);
    addActiveTime(before, 10, 'words', T);
    startSession(before, T);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  describe('currentStreak', () => {
    it('is 0 without activity', () => {
      expect(currentStreak(createInitialUsage(), T)).toBe(0);
    });

    it('counts consecutive days ending today', () => {
      let u = createInitialUsage();
      for (const d of [0, 1, 2]) u = addActiveTime(u, 20, 'explorer', T - d * DAY);
      expect(currentStreak(u, T)).toBe(3);
    });

    it('keeps the streak alive if the last activity was yesterday', () => {
      let u = createInitialUsage();
      for (const d of [1, 2]) u = addActiveTime(u, 20, 'explorer', T - d * DAY);
      expect(currentStreak(u, T)).toBe(2);
    });

    it('breaks after a missed day', () => {
      let u = createInitialUsage();
      u = addActiveTime(u, 20, 'explorer', T - 3 * DAY);
      u = addActiveTime(u, 20, 'explorer', T - 2 * DAY);
      expect(currentStreak(u, T)).toBe(0);
    });

    it('stops at gaps', () => {
      let u = createInitialUsage();
      for (const d of [0, 1, 3]) u = addActiveTime(u, 20, 'explorer', T - d * DAY);
      expect(currentStreak(u, T)).toBe(2);
    });
  });
});
