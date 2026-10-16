import { expect, type Page } from '@playwright/test';

export const STORAGE_KEY = 'alfabimbi:state';

/** From the home page, picks the Italian section (alphabet explorer). */
export async function chooseItalian(page: Page) {
  await expect(page.getByRole('button', { name: /Matematica/ })).toBeVisible();
  await page.getByRole('button', { name: /Italiano/ }).click();
  await expect(page.getByText(/Tocca una lettera per ascoltare/)).toBeVisible();
}

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await chooseItalian(page);
}

export async function readState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
}

/** Navigation tabs exist twice (desktop + mobile bar); click whichever is visible. */
export async function goTo(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).locator('visible=true').first().click();
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
