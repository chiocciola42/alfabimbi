import { act, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { PARENT_HOLD_MS } from '../../src/utils/ui';

/** Presses and holds a button for `ms` (needs fake timers, which this switches on). */
export function holdButton(button: HTMLElement, ms: number = PARENT_HOLD_MS) {
  vi.useFakeTimers();
  fireEvent.pointerDown(button);
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  fireEvent.pointerUp(button);
}

/** Opens the parents' area (profile and settings) with the required long press. */
export function openParentArea() {
  holdButton(screen.getByRole('button', { name: /Area genitori/ }));
}

// ------------------------------------------------------------------ navigation through islands and cities

import { ISLANDS, type CityDef, type GameDef, type IslandDef } from '../../src/world';
import { STORAGE_KEY } from '../../src/storage/persistence';

export function locateGame(title: string): { island: IslandDef; city: CityDef; game: GameDef } | null {
  for (const island of ISLANDS) {
    for (const city of island.cities) {
      const game = city.games.find((g) => g.title === title);
      if (game) return { island, city, game };
    }
  }
  return null;
}

/** Lets the parents' "unlock everything" flag through, as if the code had been typed (keeps all other progress). */
function unlockEverything() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const saved = raw ? (JSON.parse(raw) as { progress?: Record<string, unknown> }) : {};
  const next = JSON.stringify({ ...saved, progress: { ...(saved.progress ?? {}), allLevelsUnlocked: true } });
  localStorage.setItem(STORAGE_KEY, next);
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }));
  });
}

/** Opens a game from wherever the app is: island -> city -> game (unlocking the city if needed). */
export function goToGame(title: string) {
  const found = locateGame(title);
  if (!found) throw new Error(`Unknown game: ${title}`);
  const { island, city } = found;

  // Already playing a game of this city: use the shortcut chips.
  const chip = screen.queryAllByRole('button', { name: title, pressed: false })[0];
  if (chip && screen.queryByRole('button', { name: 'Torna alla città' })) {
    fireEvent.click(chip);
    return;
  }
  const back = screen.queryByRole('button', { name: 'Torna alla città' });
  if (back) fireEvent.click(back);
  if (!screen.queryByRole('heading', { name: new RegExp(island.name) })) {
    const home = screen.queryAllByRole('button', { name: 'Home' })[0];
    if (home) fireEvent.click(home);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(island.section === 'italian' ? 'Italiano' : island.section === 'math' ? 'Matematica' : 'Inglese') }));
  }
  const cityButton = () => screen.getByRole('button', { name: new RegExp(`^${city.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) });
  if (cityButton().getAttribute('aria-label')?.includes('(bloccata)')) unlockEverything();
  fireEvent.click(cityButton());
  const gameName = found.game.levelId !== undefined ? new RegExp(`livello ${found.game.levelId}:`) : title;
  fireEvent.click(screen.getByRole('button', { name: gameName }));
}

/** Clicks a navigation button, or opens the game with that name. */
export function nav(label: string) {
  if (locateGame(label)) {
    goToGame(label);
    return;
  }
  fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
}
