import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_PROGRESS, STICKERS_CATALOG } from '../../src/data/alphabet';
import {
  BACKUP_KEY,
  LEGACY_PROGRESS_KEY,
  MAX_NAME_LENGTH,
  SCHEMA_VERSION,
  STORAGE_KEY,
  clearStoredState,
  createDefaultState,
  exportState,
  importState,
  loadState,
  requestPersistentStorage,
  sanitizeProgress,
  sanitizeState,
  sanitizeUsage,
  saveState,
  type KeyValueStore,
} from '../../src/storage/persistence';
import { addActiveTime, recordEvent } from '../../src/state/usage';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

describe('sanitizeProgress', () => {
  it('returns the defaults for garbage input', () => {
    for (const junk of [null, undefined, 42, 'x', [], true]) {
      expect(sanitizeProgress(junk)).toEqual(INITIAL_PROGRESS);
    }
  });

  it('keeps valid values and replaces wrongly-typed ones', () => {
    const p = sanitizeProgress({
      name: '  Giulia  ',
      avatar: '🦄',
      stars: 77.9,
      gems: 'many',
      soundEnabled: false,
      voiceEnabled: 'yes',
      tracedUppercase: ['A', 'B', 3, 'A'],
      currentBackground: 'space',
    });
    expect(p.name).toBe('Giulia');
    expect(p.avatar).toBe('🦄');
    expect(p.stars).toBe(77);
    expect(p.gems).toBe(INITIAL_PROGRESS.gems);
    expect(p.soundEnabled).toBe(false);
    expect(p.voiceEnabled).toBe(INITIAL_PROGRESS.voiceEnabled);
    expect(p.tracedUppercase).toEqual(['A', 'B']);
    expect(p.currentBackground).toBe('space');
  });

  it('clamps negative / infinite numbers and truncates long names', () => {
    const p = sanitizeProgress({ stars: -10, packsOpened: Infinity, name: 'x'.repeat(100) });
    expect(p.stars).toBe(0);
    expect(p.packsOpened).toBe(INITIAL_PROGRESS.packsOpened);
    expect(p.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('falls back to the default name when blank', () => {
    expect(sanitizeProgress({ name: '   ' }).name).toBe(INITIAL_PROGRESS.name);
  });

  it('drops unknown stickers and malformed placed stickers', () => {
    const known = STICKERS_CATALOG[0].id;
    const p = sanitizeProgress({
      unlockedStickers: [known, 'stk_does_not_exist', 5],
      placedStickers: [
        { id: 'ok', stickerId: known, x: 50, y: 50, rotation: 10, scale: 1 },
        { id: 'ok', stickerId: known, x: 1, y: 1, rotation: 0, scale: 1 }, // duplicate id
        { id: 'bad1', stickerId: 'nope', x: 1, y: 1, rotation: 0, scale: 1 },
        { id: 'bad2', stickerId: known, x: 'left', y: 1, rotation: 0, scale: 1 },
        null,
        'str',
      ],
    });
    expect(p.unlockedStickers).toEqual([known]);
    expect(p.placedStickers).toHaveLength(1);
    expect(p.placedStickers[0].id).toBe('ok');
  });

  it('clamps placed sticker position and scale', () => {
    const known = STICKERS_CATALOG[0].id;
    const [s] = sanitizeProgress({
      placedStickers: [{ id: 'a', stickerId: known, x: 250, y: -20, rotation: 0, scale: 99 }],
    }).placedStickers;
    expect(s).toMatchObject({ x: 100, y: 0, scale: 3 });
  });

  it('does not share references with INITIAL_PROGRESS defaults', () => {
    const p = sanitizeProgress({});
    p.masteredLetters.push('ZZ');
    p.placedStickers.push({ id: 'z', stickerId: 'stk_1', x: 0, y: 0, rotation: 0, scale: 1 });
    expect(INITIAL_PROGRESS.masteredLetters).not.toContain('ZZ');
    expect(INITIAL_PROGRESS.placedStickers.find((s) => s.id === 'z')).toBeUndefined();
  });
});

describe('sanitizeUsage', () => {
  it('returns an empty usage for garbage', () => {
    expect(sanitizeUsage('nope').sessions).toBe(0);
    expect(sanitizeUsage(null).log).toEqual([]);
  });

  it('keeps valid data and drops invalid entries', () => {
    const u = sanitizeUsage({
      firstOpenedAt: 1000,
      lastOpenedAt: 'yesterday',
      sessions: 4,
      totalActiveSeconds: 90,
      tabSeconds: { tracing: 60, unknown: 5, words: -3 },
      counters: { quiz_correct: 3, bogus: 9 },
      daily: { '2026-10-14': { seconds: 10, stars: 2, activities: 1 }, 'not-a-day': { seconds: 1 } },
      log: [
        { t: 1, type: 'quiz_correct' },
        { t: 2, type: 'made_up' },
        { t: 'x', type: 'quiz_wrong' },
        { t: 3, type: 'stars_earned', amount: 5, detail: 'd' },
      ],
    });
    expect(u.firstOpenedAt).toBe(1000);
    expect(u.lastOpenedAt).toBeNull();
    expect(u.sessions).toBe(4);
    expect(u.tabSeconds.tracing).toBe(60);
    expect(u.tabSeconds.words).toBe(0);
    expect(u.counters.quiz_correct).toBe(3);
    expect(Object.keys(u.daily)).toEqual(['2026-10-14']);
    expect(u.log.map((e) => e.type)).toEqual(['quiz_correct', 'stars_earned']);
  });
});

describe('save / load', () => {
  it('returns defaults when no storage is available', () => {
    expect(loadState(null)).toEqual({ state: createDefaultState(), source: 'default' });
    expect(saveState(createDefaultState(), null)).toBe(false);
  });

  it('returns defaults on an empty store', () => {
    expect(loadState(store).source).toBe('default');
  });

  it('round-trips progress and usage', () => {
    let state = createDefaultState();
    state = { ...state, progress: { ...state.progress, name: 'Anna', stars: 99 } };
    state = { ...state, usage: recordEvent(addActiveTime(state.usage, 75, 'words', 5e11), 'quiz_correct', 5e11) };
    expect(saveState(state, store)).toBe(true);
    const loaded = loadState(store);
    expect(loaded.source).toBe('primary');
    expect(loaded.state).toEqual(state);
  });

  it('stores a versioned envelope', () => {
    saveState(createDefaultState(), store);
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).version).toBe(SCHEMA_VERSION);
  });

  it('recovers from corrupted primary data using the backup', () => {
    const first = { ...createDefaultState() };
    first.progress = { ...first.progress, stars: 11 };
    const second = { ...first, progress: { ...first.progress, stars: 22 } };
    saveState(first, store);
    saveState(second, store); // first becomes the backup
    store.setItem(STORAGE_KEY, '{not json');
    const loaded = loadState(store);
    expect(loaded.source).toBe('backup');
    expect(loaded.state.progress.stars).toBe(11);
  });

  it('never overwrites the backup with corrupted data', () => {
    const good = createDefaultState();
    saveState(good, store);
    saveState({ ...good, progress: { ...good.progress, stars: 5 } }, store); // `good` becomes the backup
    const backupBefore = store.getItem(BACKUP_KEY);
    expect(backupBefore).not.toBeNull();
    store.setItem(STORAGE_KEY, '###');
    saveState({ ...good, progress: { ...good.progress, stars: 9 } }, store);
    expect(store.getItem(BACKUP_KEY)).toBe(backupBefore);
    expect(loadState(store).state.progress.stars).toBe(9);
  });

  it('falls back to defaults when everything is corrupted', () => {
    store.setItem(STORAGE_KEY, 'x');
    store.setItem(BACKUP_KEY, 'y');
    expect(loadState(store).source).toBe('default');
  });

  it('sanitizes tampered data on load', () => {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 3, progress: { stars: 'lots', name: 5 }, usage: 7 }));
    const { state } = loadState(store);
    expect(state.progress.stars).toBe(INITIAL_PROGRESS.stars);
    expect(state.progress.name).toBe(INITIAL_PROGRESS.name);
    expect(state.usage.sessions).toBe(0);
  });

  it('migrates the progress saved by the original AI Studio build', () => {
    store.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ ...INITIAL_PROGRESS, name: 'Vecchia', stars: 64 }));
    const loaded = loadState(store);
    expect(loaded.source).toBe('legacy');
    expect(loaded.state.progress.name).toBe('Vecchia');
    expect(loaded.state.progress.stars).toBe(64);
    expect(loaded.state.usage.sessions).toBe(0);
  });

  it('prefers the new format over the legacy key', () => {
    store.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ name: 'Vecchia' }));
    const s = createDefaultState();
    saveState({ ...s, progress: { ...s.progress, name: 'Nuova' } }, store);
    expect(loadState(store).state.progress.name).toBe('Nuova');
  });

  it('reports failure (instead of throwing) when the quota is exceeded', () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(saveState(createDefaultState(), full)).toBe(false);
  });

  it('survives a store whose getItem throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadState(broken).source).toBe('default');
  });

  it('clearStoredState removes every key', () => {
    store.setItem(LEGACY_PROGRESS_KEY, '{}');
    saveState(createDefaultState(), store);
    saveState({ ...createDefaultState(), progress: { ...INITIAL_PROGRESS, stars: 1 } }, store);
    clearStoredState(store);
    expect(store.data.size).toBe(0);
  });

  it('sanitizeState tolerates non-object input', () => {
    expect(sanitizeState(undefined)).toEqual(createDefaultState());
  });
});

describe('export / import', () => {
  it('round-trips a full state', () => {
    let state = createDefaultState();
    state = { progress: { ...state.progress, name: 'Marta', stars: 123 }, usage: recordEvent(state.usage, 'pack_opened', 5e11) };
    const text = exportState(state, 0);
    expect(JSON.parse(text).app).toBe('alfabimbi');
    const result = importState(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state).toEqual(state);
  });

  it.each([
    ['not json', 'JSON valido'],
    ['[]', 'backup di Alfabimbi'],
    [JSON.stringify({ app: 'other', progress: {} }), 'backup di Alfabimbi'],
    [JSON.stringify({ app: 'alfabimbi' }), 'backup di Alfabimbi'],
  ])('rejects invalid file %#', (text, message) => {
    const result = importState(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it('sanitizes imported data', () => {
    const result = importState(JSON.stringify({ app: 'alfabimbi', progress: { stars: -5, unlockedStickers: ['zzz'] } }));
    expect(result.ok && result.state.progress.stars).toBe(0);
    expect(result.ok && result.state.progress.unlockedStickers).toEqual([]);
  });
});

describe('requestPersistentStorage', () => {
  it('returns false when the Storage API is missing', async () => {
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('asks the browser to persist and reports the answer', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist, persisted: vi.fn().mockResolvedValue(false) } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not ask again when already persistent', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', { storage: { persist, persisted: vi.fn().mockResolvedValue(true) } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('swallows errors', async () => {
    vi.stubGlobal('navigator', { storage: { persist: vi.fn().mockRejectedValue(new Error('x')) } });
    expect(await requestPersistentStorage()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('math progress', () => {
  it('keeps valid level stars and drops unknown levels and out-of-range values', () => {
    const p = sanitizeProgress({ mathLevelStars: { '1': 3, '2': 9, '0': 1, '46': 2, abc: 1, '5': -2 }, completedMathLevels: 4 });
    expect(p.mathLevelStars).toEqual({ '1': 3, '2': 3 });
    expect(p.completedMathLevels).toBe(4);
  });

  it('loads backups written before the math section existed', () => {
    const p = sanitizeProgress({ name: 'Ada', stars: 12 });
    expect(p.mathLevelStars).toEqual({});
    expect(p.completedMathLevels).toBe(0);
  });
});
