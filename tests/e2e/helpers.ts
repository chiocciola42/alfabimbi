import { expect, type Page } from '@playwright/test';
import { ISLANDS } from '../../src/world';

export const STORAGE_KEY = 'alfabimbi:state';

function locateGame(title: string) {
  for (const island of ISLANDS)
    for (const city of island.cities) {
      const game = city.games.find((g) => g.title === title);
      if (game) return { island, city, game };
    }
  return null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SECTION_LABEL = { italian: /Italiano/, math: /Matematica/, english: /Inglese/ } as const;

/** From the home page, goes to the Italian island, the first city and the alphabet explorer. */
export async function chooseItalian(page: Page) {
  await expect(page.getByRole('button', { name: /Matematica/ })).toBeVisible();
  await page.getByRole('button', { name: /Italiano/ }).click();
  await goTo(page, 'Alfabeto');
  await expect(page.getByText(/Tocca una lettera per ascoltare/)).toBeVisible();
}

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await chooseItalian(page);
}

export async function readState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
}

/** Opens a game by its title (island -> city -> game), or clicks a navigation button such as "Album Premi". */
export async function goTo(page: Page, label: string) {
  const found = locateGame(label);
  const visible = (name: string | RegExp, exact = true) =>
    page.getByRole('button', { name, exact }).locator('visible=true');
  if (!found) {
    await visible(label).first().click();
    return;
  }
  const { island, city, game } = found;
  const back = visible('Torna alla città');
  if (await back.count()) {
    const chip = visible(label);
    if (await chip.count()) {
      await chip.first().click();
      return;
    }
    await back.first().click();
  }
  if (!(await page.getByRole('heading', { name: new RegExp(escapeRe(island.name)) }).count())) {
    const home = visible('Home');
    if (await home.count()) await home.first().click();
    await page.getByRole('button', { name: SECTION_LABEL[island.section] }).click();
  }
  const cityButton = page.getByRole('button', { name: new RegExp(`^${escapeRe(city.name)}`) }).first();
  if ((await cityButton.getAttribute('aria-label'))?.includes('(bloccata)')) {
    await page.evaluate((key) => {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
      const next = JSON.stringify({ ...saved, progress: { ...(saved.progress ?? {}), allLevelsUnlocked: true } });
      localStorage.setItem(key, next);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: next }));
    }, STORAGE_KEY);
  }
  await cityButton.click();
  const gameName = game.levelId !== undefined ? new RegExp(`livello ${game.levelId}:`) : label;
  await page.getByRole('button', { name: gameName, exact: game.levelId === undefined }).click();
}

/** Plays the "initial letter" quiz correctly once (first word is "Ape" -> A). */
export async function answerFirstQuizCorrectly(page: Page) {
  await goTo(page, 'Caccia alle Parole');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(page.getByText(/Esatto!/)).toBeVisible();
}

/** Opens the parents' area: the profile button only reacts to a long press. */
export async function openParentArea(page: Page) {
  const button = page.getByRole('button', { name: /Area genitori/ }).locator('visible=true').first();
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3200);
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/** Reads the first word of the "Leggi e scegli" game correctly. */
export async function readFirstWordCorrectly(page: Page) {
  await goTo(page, 'Leggi le Parole');
  await page.locator('button[data-correct="true"]').click();
  await expect(page.getByText(/Nuova parola nel diario/)).toBeVisible();
}
