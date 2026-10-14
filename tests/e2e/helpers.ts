import { expect, type Page } from '@playwright/test';

export const STORAGE_KEY = 'alfabimbi:state';

export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByText(/Tocca una lettera per ascoltare/)).toBeVisible();
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
