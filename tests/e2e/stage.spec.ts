import { expect, test } from '@playwright/test';
import { STORAGE_KEY, goTo, openApp, readState } from './helpers';

test.describe('Giochi in 3D', () => {
  test('draws the games on a WebGL stage without errors and keeps the real buttons usable', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    await openApp(page);
    await goTo(page, 'Caccia alle Parole');
    await expect(page.getByTestId('stage-canvas')).toHaveCount(1);
    await expect(page.locator('[data-skin]').first()).toBeVisible();
    // il pulsante DOM resta quello vero: si tocca e dà le stelle
    await page.getByRole('button', { name: 'A', exact: true }).click();
    await expect(page.getByText(/Esatto!/)).toBeVisible();
    expect((await readState(page)).progress.stars).toBeGreaterThan(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test('has no stage when the parents turned the 3D graphics off', async ({ page }) => {
    await page.addInitScript((key) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 6, progress: { graphics3d: false } }));
    }, STORAGE_KEY);
    await openApp(page);
    await goTo(page, 'Caccia alle Parole');
    await expect(page.getByText(/Indovina la Lettera Iniziale/)).toBeVisible();
    await expect(page.getByTestId('stage-canvas')).toHaveCount(0);
  });

  test('removes the stage when leaving the game', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Caccia alle Parole');
    await expect(page.getByTestId('stage-canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Torna alla città' }).click();
    await expect(page.getByTestId('stage-canvas')).toHaveCount(0);
  });

  test('shows the 3D letter while tracing and the 3D bubbles in the bubble game', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    await openApp(page);
    await goTo(page, 'Impara a Scrivere');
    await expect(page.getByTestId('stage-canvas')).toHaveCount(1);
    await expect(page.locator('[data-stage-prop="letter3d"]')).toBeVisible();
    expect(await page.locator('[data-stage-strokes]').getAttribute('data-stage-strokes')).toContain('"x"');
    await goTo(page, 'Bolle Magiche');
    await expect(page.locator('[data-skin="bubble"]').first()).toBeVisible();
    expect(problems).toEqual([]);
  });
});
