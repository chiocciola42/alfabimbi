import type {
  DailyUsage,
  TabId,
  UsageEvent,
  UsageEventType,
  UsageStats,
} from '../types';

export const MAX_LOG_ENTRIES = 500;
export const TAB_IDS: TabId[] = ['explorer', 'tracing', 'bubbles', 'words', 'stickers'];
export const EVENT_TYPES: UsageEventType[] = [
  'letter_traced',
  'bubble_round_completed',
  'quiz_correct',
  'quiz_wrong',
  'spelling_completed',
  'pack_opened',
  'mission_claimed',
  'stars_earned',
];

export function createInitialUsage(): UsageStats {
  return {
    firstOpenedAt: null,
    lastOpenedAt: null,
    sessions: 0,
    totalActiveSeconds: 0,
    tabSeconds: Object.fromEntries(TAB_IDS.map((t) => [t, 0])) as Record<TabId, number>,
    counters: Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<UsageEventType, number>,
    daily: {},
    log: [],
  };
}

/** Local-time calendar day key, e.g. "2026-10-14". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function bumpDaily(
  daily: Record<string, DailyUsage>,
  key: string,
  patch: Partial<DailyUsage>
): Record<string, DailyUsage> {
  const current = daily[key] ?? { seconds: 0, stars: 0, activities: 0 };
  return {
    ...daily,
    [key]: {
      seconds: current.seconds + (patch.seconds ?? 0),
      stars: current.stars + (patch.stars ?? 0),
      activities: current.activities + (patch.activities ?? 0),
    },
  };
}

export function startSession(usage: UsageStats, now: number): UsageStats {
  return {
    ...usage,
    sessions: usage.sessions + 1,
    firstOpenedAt: usage.firstOpenedAt ?? now,
    lastOpenedAt: now,
  };
}

export function addActiveTime(
  usage: UsageStats,
  seconds: number,
  tab: TabId,
  now: number
): UsageStats {
  const secs = Math.max(0, Math.floor(seconds));
  if (secs === 0) return usage;
  return {
    ...usage,
    lastOpenedAt: now,
    totalActiveSeconds: usage.totalActiveSeconds + secs,
    tabSeconds: { ...usage.tabSeconds, [tab]: (usage.tabSeconds[tab] ?? 0) + secs },
    daily: bumpDaily(usage.daily, dayKey(now), { seconds: secs }),
  };
}

export function recordEvent(
  usage: UsageStats,
  type: UsageEventType,
  now: number,
  extra: { amount?: number; detail?: string } = {}
): UsageStats {
  const event: UsageEvent = { t: now, type };
  if (extra.amount !== undefined) event.amount = extra.amount;
  if (extra.detail !== undefined) event.detail = extra.detail;

  const isStars = type === 'stars_earned';
  const log = [...usage.log, event];
  return {
    ...usage,
    lastOpenedAt: now,
    counters: { ...usage.counters, [type]: (usage.counters[type] ?? 0) + 1 },
    daily: bumpDaily(usage.daily, dayKey(now), {
      stars: isStars ? Math.max(0, extra.amount ?? 0) : 0,
      activities: isStars ? 0 : 1,
    }),
    log: log.length > MAX_LOG_ENTRIES ? log.slice(log.length - MAX_LOG_ENTRIES) : log,
  };
}

/** Consecutive days of activity ending today or yesterday. */
export function currentStreak(usage: UsageStats, now: number): number {
  const active = (key: string) => {
    const d = usage.daily[key];
    return !!d && (d.seconds > 0 || d.activities > 0 || d.stars > 0);
  };
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!active(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (active(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
