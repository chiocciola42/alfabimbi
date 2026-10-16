import type { AppState, ChildProgress, DailyUsage, PlacedSticker, TextStyle, UsageEvent, UsageStats } from '../types';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../data/alphabet';
import { READING_WORDS } from '../data/readingWords';
import { ENGLISH_WORDS } from '../data/englishWords';
import { ENGLISH_ALPHABET } from '../data/englishAlphabet';
import { FAMILY_WORDS } from '../data/englishFamilies';
import { MATH_LEVEL_COUNT } from '../math/worlds';
import { TEXT_STYLES } from '../utils/textStyle';
import {
  EVENT_TYPES,
  MAX_LOG_ENTRIES,
  TAB_IDS,
  createInitialUsage,
} from '../state/usage';

export const STORAGE_KEY = 'alfabimbi:state';
export const BACKUP_KEY = 'alfabimbi:state:backup';
export const LEGACY_PROGRESS_KEY = 'alfabimbi_child_progress_v2';
export const SCHEMA_VERSION = 4;
export const EXPORT_APP_ID = 'alfabimbi';
export const MAX_NAME_LENGTH = 24;

const KNOWN_STICKER_IDS = new Set(STICKERS_CATALOG.map((s) => s.id));
const KNOWN_READING_WORDS = new Set(READING_WORDS.map((w) => w.word));
const KNOWN_ENGLISH_WORDS = new Set(ENGLISH_WORDS.map((w) => w.word));
const KNOWN_ENGLISH_LETTERS = new Set(ENGLISH_ALPHABET.map((x) => x.letter));
const KNOWN_FAMILY_WORDS = new Set(FAMILY_WORDS.map((w) => w.word));
const KNOWN_EVENT_TYPES = new Set<string>(EVENT_TYPES);
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, fallback: number, max = 1e9): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function strList(v: unknown, fallback: string[], keep: (s: string) => boolean = () => true): string[] {
  if (!Array.isArray(v)) return [...fallback];
  return Array.from(new Set(v.filter((x): x is string => typeof x === 'string' && keep(x))));
}

function sanitizePlaced(v: unknown, fallback: PlacedSticker[]): PlacedSticker[] {
  if (!Array.isArray(v)) return fallback.map((p) => ({ ...p }));
  const seen = new Set<string>();
  const out: PlacedSticker[] = [];
  for (const raw of v) {
    if (!isObject(raw)) continue;
    const { id, stickerId, x, y, rotation, scale } = raw;
    if (typeof id !== 'string' || seen.has(id)) continue;
    if (typeof stickerId !== 'string' || !KNOWN_STICKER_IDS.has(stickerId)) continue;
    if (![x, y, rotation, scale].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    seen.add(id);
    out.push({
      id,
      stickerId,
      x: Math.min(100, Math.max(0, x as number)),
      y: Math.min(100, Math.max(0, y as number)),
      rotation: rotation as number,
      scale: Math.min(3, Math.max(0.4, scale as number)),
    });
  }
  return out;
}

function sanitizeLevelStars(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObject(v)) return out;
  for (const [key, val] of Object.entries(v)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > MATH_LEVEL_COUNT) continue;
    const stars = num(val, 0, 3);
    if (stars > 0) out[String(id)] = stars;
  }
  return out;
}

export function sanitizeProgress(input: unknown): ChildProgress {
  const d = INITIAL_PROGRESS;
  const src = isObject(input) ? input : {};
  const name = typeof src.name === 'string' ? src.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  const avatar = typeof src.avatar === 'string' && src.avatar.length > 0 && src.avatar.length <= 8 ? src.avatar : d.avatar;
  return {
    name: name || d.name,
    avatar,
    stars: num(src.stars, d.stars),
    gems: num(src.gems, d.gems),
    packsOpened: num(src.packsOpened, d.packsOpened),
    masteredLetters: strList(src.masteredLetters, d.masteredLetters),
    tracedUppercase: strList(src.tracedUppercase, d.tracedUppercase),
    tracedLowercase: strList(src.tracedLowercase, d.tracedLowercase),
    unlockedStickers: strList(src.unlockedStickers, d.unlockedStickers, (s) => KNOWN_STICKER_IDS.has(s)),
    placedStickers: sanitizePlaced(src.placedStickers, d.placedStickers),
    currentBackground:
      typeof src.currentBackground === 'string' && src.currentBackground ? src.currentBackground : d.currentBackground,
    soundEnabled: bool(src.soundEnabled, d.soundEnabled),
    voiceEnabled: bool(src.voiceEnabled, d.voiceEnabled),
    completedBubbleLevels: num(src.completedBubbleLevels, d.completedBubbleLevels),
    completedWordQuizRounds: num(src.completedWordQuizRounds, d.completedWordQuizRounds),
    lettersTracedCount: num(src.lettersTracedCount, d.lettersTracedCount),
    claimedMissionIds: strList(src.claimedMissionIds, d.claimedMissionIds),
    readWords: strList(src.readWords, d.readWords, (w) => KNOWN_READING_WORDS.has(w)),
    textStyle: TEXT_STYLES.includes(src.textStyle as TextStyle) ? (src.textStyle as TextStyle) : d.textStyle,
    mathLevelStars: sanitizeLevelStars(src.mathLevelStars),
    completedMathLevels: num(src.completedMathLevels, d.completedMathLevels),
    mathExercisesSolved: num(src.mathExercisesSolved, d.mathExercisesSolved),
    mathCorrectFirstTry: num(src.mathCorrectFirstTry, d.mathCorrectFirstTry),
    englishWords: strList(src.englishWords, d.englishWords, (w) => KNOWN_ENGLISH_WORDS.has(w)),
    englishLetters: strList(src.englishLetters, d.englishLetters, (x) => KNOWN_ENGLISH_LETTERS.has(x)),
    englishFamilyWords: strList(src.englishFamilyWords, d.englishFamilyWords, (w) => KNOWN_FAMILY_WORDS.has(w)),
  };
}

export function sanitizeUsage(input: unknown): UsageStats {
  const base = createInitialUsage();
  if (!isObject(input)) return base;

  const tsOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  const tabSeconds = { ...base.tabSeconds };
  if (isObject(input.tabSeconds)) {
    for (const t of TAB_IDS) tabSeconds[t] = num(input.tabSeconds[t], 0);
  }
  const counters = { ...base.counters };
  if (isObject(input.counters)) {
    for (const t of EVENT_TYPES) counters[t] = num(input.counters[t], 0);
  }
  const daily: Record<string, DailyUsage> = {};
  if (isObject(input.daily)) {
    for (const [key, val] of Object.entries(input.daily)) {
      if (!DAY_KEY_RE.test(key) || !isObject(val)) continue;
      daily[key] = { seconds: num(val.seconds, 0), stars: num(val.stars, 0), activities: num(val.activities, 0) };
    }
  }
  const log: UsageEvent[] = [];
  if (Array.isArray(input.log)) {
    for (const e of input.log) {
      if (!isObject(e) || typeof e.type !== 'string' || !KNOWN_EVENT_TYPES.has(e.type)) continue;
      if (typeof e.t !== 'number' || !Number.isFinite(e.t)) continue;
      const ev: UsageEvent = { t: e.t, type: e.type as UsageEvent['type'] };
      if (typeof e.amount === 'number' && Number.isFinite(e.amount)) ev.amount = e.amount;
      if (typeof e.detail === 'string') ev.detail = e.detail.slice(0, 40);
      log.push(ev);
    }
  }
  return {
    firstOpenedAt: tsOrNull(input.firstOpenedAt),
    lastOpenedAt: tsOrNull(input.lastOpenedAt),
    sessions: num(input.sessions, 0),
    totalActiveSeconds: num(input.totalActiveSeconds, 0),
    tabSeconds,
    counters,
    daily,
    log: log.slice(-MAX_LOG_ENTRIES),
  };
}

export function sanitizeState(input: unknown): AppState {
  const src = isObject(input) ? input : {};
  return { progress: sanitizeProgress(src.progress), usage: sanitizeUsage(src.usage) };
}

export function createDefaultState(): AppState {
  return sanitizeState({});
}

// ---------------------------------------------------------------- storage backend

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getBrowserStore(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__alfabimbi_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: AppState;
  source: 'primary' | 'backup' | 'legacy' | 'default';
}

function parseEnvelope(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
}

export function loadState(store: KeyValueStore | null = getBrowserStore()): LoadResult {
  if (!store) return { state: createDefaultState(), source: 'default' };
  try {
    const primary = parseEnvelope(store.getItem(STORAGE_KEY));
    if (primary) return { state: primary, source: 'primary' };

    const backup = parseEnvelope(store.getItem(BACKUP_KEY));
    if (backup) return { state: backup, source: 'backup' };

    // Migration from the original AI Studio build (progress only, no usage stats).
    const legacyRaw = store.getItem(LEGACY_PROGRESS_KEY);
    if (legacyRaw) {
      const legacy: unknown = JSON.parse(legacyRaw);
      if (isObject(legacy)) {
        return { state: { progress: sanitizeProgress(legacy), usage: createInitialUsage() }, source: 'legacy' };
      }
    }
  } catch {
    // fall through to defaults
  }
  return { state: createDefaultState(), source: 'default' };
}

export function serializeState(state: AppState): string {
  return JSON.stringify({ version: SCHEMA_VERSION, progress: state.progress, usage: state.usage });
}

/** Writes the state, keeping the previous valid value as a backup. Returns false on failure. */
export function saveState(state: AppState, store: KeyValueStore | null = getBrowserStore()): boolean {
  if (!store) return false;
  try {
    const next = serializeState(state);
    const previous = store.getItem(STORAGE_KEY);
    if (previous === next) return true;
    if (previous && parseEnvelope(previous)) store.setItem(BACKUP_KEY, previous);
    store.setItem(STORAGE_KEY, next);
    return true;
  } catch {
    return false;
  }
}

export function clearStoredState(store: KeyValueStore | null = getBrowserStore()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
    store.removeItem(BACKUP_KEY);
    store.removeItem(LEGACY_PROGRESS_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------- export / import

export function exportState(state: AppState, now: number = Date.now()): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, version: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(), progress: state.progress, usage: state.usage },
    null,
    2
  );
}

export type ImportResult = { ok: true; state: AppState } | { ok: false; error: string };

export function importState(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' };
  }
  if (!isObject(parsed) || parsed.app !== EXPORT_APP_ID || !isObject(parsed.progress)) {
    return { ok: false, error: 'Il file non è un backup di Alfabimbi.' };
  }
  return { ok: true, state: sanitizeState(parsed) };
}

/** Asks the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
