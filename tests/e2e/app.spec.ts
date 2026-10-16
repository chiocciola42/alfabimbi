import { expect, test } from '@playwright/test';
import {
  STORAGE_KEY,
  answerFirstQuizCorrectly,
  chooseItalian,
  goTo,
  openApp,
  openParentArea,
  readFirstWordCorrectly,
  readState,
} from './helpers';

test.describe('Alfabimbi app', () => {
  test('loads without console errors or failed requests', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
    await openApp(page);
    for (const tab of ['Impara a Scrivere', 'Bolle Magiche', 'Caccia alle Parole', 'Leggi le Parole', 'Album Premi', 'Alfabeto']) {
      await goTo(page, tab);
    }
    expect(problems).toEqual([]);
  });

  test('has no horizontal overflow on any page (phone and desktop)', async ({ page }) => {
    await openApp(page);
    for (const tab of ['Alfabeto', 'Impara a Scrivere', 'Bolle Magiche', 'Caccia alle Parole', 'Leggi le Parole', 'Album Premi']) {
      await goTo(page, tab);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, tab).toBeLessThanOrEqual(1);
    }
  });

  test('lists the 26 letters and filters them by level', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('button', { name: /Scrivi/ })).toHaveCount(26);
    await page.getByRole('button', { name: /Livello 1: Vocali/ }).click();
    await expect(page.getByRole('button', { name: /Scrivi/ })).toHaveCount(5);
  });

  test('stores progress in the browser and restores it after a reload', async ({ page }) => {
    await openApp(page);
    await answerFirstQuizCorrectly(page);

    const before = await readState(page);
    expect(before.version).toBe(4);
    expect(before.usage.counters.quiz_correct).toBe(1);

    await page.reload();
    await chooseItalian(page);
    await expect(page.getByText(new RegExp(`${before.progress.stars} stelle raccolte`))).toBeVisible();
    const after = await readState(page);
    expect(after.progress.stars).toBe(before.progress.stars);
    expect(after.usage.sessions).toBe(before.usage.sessions + 1);
  });

  test('keeps the child profile across reloads', async ({ page }) => {
    await openApp(page);
    await openParentArea(page);
    await page.getByLabel(/Nome della piccola campionessa/).fill('Camilla');
    await page.getByRole('button', { name: 'Avatar 🦄' }).click();
    await page.getByRole('button', { name: 'Salva Profilo' }).click();
    await page.reload();
    await expect(page.getByText(/Per Camilla/)).toBeVisible();
    expect((await readState(page)).progress).toMatchObject({ name: 'Camilla', avatar: '🦄' });
  });

  test('remembers sound preferences', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /Attiva o disattiva suoni/ }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: /Attiva o disattiva suoni/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('measures usage time while the page is visible', async ({ page }) => {
    await openApp(page);
    await page.waitForTimeout(3500);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect.poll(async () => (await readState(page)).usage.totalActiveSeconds).toBeGreaterThanOrEqual(3);
    expect((await readState(page)).usage.tabSeconds.explorer).toBeGreaterThanOrEqual(3);
  });

  test('recovers from corrupted saved data', async ({ page }) => {
    await page.addInitScript(([key]) => localStorage.setItem(key, '{broken json'), [STORAGE_KEY]);
    await openApp(page);
    await expect(page.getByText(/Per Inserisci Nome/)).toBeVisible();
  });

  test('migrates progress saved by the previous (AI Studio) version', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('alfabimbi:state')) {
        localStorage.setItem('alfabimbi_child_progress_v2', JSON.stringify({ name: 'Giada', stars: 61 }));
      }
    });
    await openApp(page);
    await expect(page.getByText(/Per Giada/)).toBeVisible();
    await expect(page.getByText(/61 stelle raccolte/)).toBeVisible();
  });

  test('exports a backup and restores it after a reset', async ({ page }, testInfo) => {
    await openApp(page);
    await answerFirstQuizCorrectly(page);
    const stars = (await readState(page)).progress.stars;

    await openParentArea(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Scarica backup/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^alfabimbi-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = testInfo.outputPath('backup.json');
    await download.saveAs(file);

    await page.getByRole('button', { name: /Azzera progressi/ }).click();
    await page.getByRole('button', { name: /Sì, azzera/ }).click();
    expect((await readState(page)).progress.stars).not.toBe(stars);

    await openParentArea(page);
    await page.getByTestId('import-input').setInputFiles(file);
    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await readState(page)).progress.stars).toBe(stars);
  });

  test('rejects a file that is not a backup', async ({ page }, testInfo) => {
    await openApp(page);
    await openParentArea(page);
    const bad = testInfo.outputPath('bad.json');
    await (await import('node:fs/promises')).writeFile(bad, '{"hello":"world"}');
    await page.getByTestId('import-input').setInputFiles(bad);
    await expect(page.getByRole('status')).toContainText('non è un backup');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('earns a wrong answer entry without gaining stars', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Caccia alle Parole');
    const starsBefore = (await readState(page)).progress.stars;
    const wrong = page.getByRole('button').filter({ hasText: /^[B-Z]$/ }).first();
    await wrong.click();
    await expect(page.getByText(/Riprova/).first()).toBeVisible();
    const state = await readState(page);
    expect(state.progress.stars).toBe(starsBefore);
    expect(state.usage.counters.quiz_wrong).toBe(1);
  });

  test('bubble game: popping the target letter fills the goal and pays 5 stars', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Bolle Magiche');
    const target = (await page.locator('h2 span.underline').innerText()).trim();
    const starsBefore = (await readState(page)).progress.stars;

    for (let popped = 0; popped < 5; popped++) {
      const bubble = page.locator('button.rounded-full', { hasText: new RegExp(`^${target}$`) }).first();
      await bubble.waitFor({ state: 'visible', timeout: 10_000 });
      // le bolle si muovono: l'evento diretto non manca il bersaglio sotto carico
      await bubble.dispatchEvent('click');
    }
    await expect(page.getByText('Bravissima!')).toBeVisible();
    const state = await readState(page);
    expect(state.progress.stars).toBe(starsBefore + 5);
    expect(state.usage.counters.bubble_round_completed).toBe(1);
  });

  test('tracing: following the guide with the pointer completes the letter', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /Scrivi/ }).nth(1).click(); // E
    await expect(page.getByText(/^come \w+$/)).toBeVisible();

    const stage = page.getByTestId('tracing-stage');
    const box = (await stage.boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThan(2); // square: guide and canvas coincide
    const at = (x: number, y: number) => [box.x + (x / 100) * box.width, box.y + (y / 100) * box.height] as const;

    const strokes = [
      [[30, 15], [30, 85]],
      [[30, 15], [75, 15]],
      [[30, 50], [65, 50]],
      [[30, 85], [75, 85]],
    ];
    for (const [from, to] of strokes) {
      await page.mouse.move(...at(from[0], from[1]));
      await page.mouse.down();
      for (let t = 0; t <= 1; t += 0.1) {
        await page.mouse.move(...at(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t));
      }
      await page.mouse.up();
    }
    await expect(page.getByText('Completato: 100%')).toBeVisible();
    await expect.poll(async () => (await readState(page)).progress.tracedUppercase).toContain('E');
    const state = await readState(page);
    expect(state.usage.counters.letter_traced).toBe(1);
  });

  test('sticker album: opening a pack needs 15 stars and unlocks three stickers', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('alfabimbi:state', JSON.stringify({ version: 3, progress: { stars: 40, unlockedStickers: ['stk_1'] } }));
    });
    await openApp(page);
    await goTo(page, 'Album Premi');
    await page.getByRole('button', { name: /Apri la Bustina Magica/ }).click();
    await page.getByRole('button', { name: /Apri Bustina/ }).click();
    const state = await readState(page);
    expect(state.progress.stars).toBe(25);
    expect(state.progress.packsOpened).toBe(1);
    expect(state.progress.unlockedStickers.length).toBeGreaterThanOrEqual(2);
    expect(state.usage.counters.pack_opened).toBe(1);
  });

  test('two tabs stay in sync instead of overwriting each other', async ({ browser }) => {
    const context = await browser.newContext();
    const a = await context.newPage();
    const b = await context.newPage();
    await openApp(a);
    await openApp(b);
    await answerFirstQuizCorrectly(a);
    const stars = (await readState(a)).progress.stars;
    await expect(b.getByText(new RegExp(`${stars} stelle raccolte`))).toBeVisible();
    await context.close();
  });
});

test.describe('Matematica', () => {
  test('is reachable from the home page, shares the stars and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Matematica/ }).click();
    await expect(page.getByText(/Scegli il tuo Mondo/)).toBeVisible();
    for (const tab of ['Mappa dei Numeri', 'Laboratorio', 'Album Premi']) {
      await goTo(page, tab);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, tab).toBeLessThanOrEqual(1);
    }

    await goTo(page, 'Mappa dei Numeri');
    await page.getByRole('button', { name: /Gioca il livello 1:/ }).click();
    for (let i = 0; i < 5; i++) {
      const options = page.locator('main').getByRole('button', { name: /^\d+$/ });
      if (await options.count()) {
        await options.first().click();
      } else {
        // domanda interattiva (telaio da costruire): riempie una casella e controlla
        await page.getByRole('button', { name: /Casella 1,/ }).click();
        await page.getByRole('button', { name: 'Controlla' }).click();
      }
      await page.getByRole('button', { name: /Prossima Domanda|Vedi Risultato/ }).click();
    }
    await expect(page.getByRole('dialog', { name: 'Livello completato' })).toBeVisible();
    const state = await readState(page);
    expect(state.progress.completedMathLevels).toBe(1);
    expect(state.progress.stars).toBeGreaterThan(0);
  });

});

test.describe('Lettura, traguardi e area genitori', () => {
  test('reads a word, fills the diary and shows it on the home page goals', async ({ page }) => {
    await openApp(page);
    await readFirstWordCorrectly(page);
    const state = await readState(page);
    expect(state.progress.readWords).toHaveLength(1);
    expect(state.usage.counters.word_read).toBe(1);

    await page.getByRole('button', { name: 'Torna alla pagina iniziale' }).click();
    await expect(page.getByRole('heading', { name: 'I miei traguardi' })).toBeVisible();
    await expect(page.getByText(/1 \/ \d+ parole lette/)).toBeVisible();
    await page.getByRole('button', { name: /Il mio diario/ }).click();
    await expect(page.getByRole('dialog', { name: /diario delle parole/ })).toBeVisible();
    await expect(page.locator('[data-read="true"]')).toHaveCount(1);
  });

  test('puts the syllables in order', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Leggi le Parole');
    await page.getByRole('button', { name: /Metti in ordine/ }).click();
    const slots = await page.getByTestId('syllable-slots').locator('> div').count();
    expect(slots).toBeGreaterThanOrEqual(2);
    // the word is shown by its picture: try every tile in turn until the word is complete
    for (let i = 0; i < slots; i++) {
      const tiles = page.locator('button.h-16:not([disabled])');
      const count = await tiles.count();
      for (let t = 0; t < count; t++) {
        const before = await page.getByTestId('syllable-slots').locator('> div.bg-amber-400').count();
        await tiles.nth(t).click();
        const after = await page.getByTestId('syllable-slots').locator('> div.bg-amber-400').count();
        if (after > before) break;
      }
    }
    await expect(page.getByText(/Nuova parola nel diario/)).toBeVisible();
    expect((await readState(page)).progress.readWords).toHaveLength(1);
  });

  test('the parents area needs a long press and the text style applies everywhere', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /Area genitori/ }).locator('visible=true').first().click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('status')).toContainText('Tieni premuto');

    await openParentArea(page);
    await page.getByRole('group', { name: /Come scrivere le parole/ }).getByRole('button').nth(1).click();
    await page.getByRole('button', { name: 'Chiudi' }).click();
    expect((await readState(page)).progress.textStyle).toBe('lower');
    await goTo(page, 'Leggi le Parole');
    await expect(page.getByRole('img', { name: /^[a-z]+$/ })).toBeVisible();
  });

  test('has touch targets of at least 56px on the main game controls', async ({ page }) => {
    await openApp(page);
    const tooSmall: string[] = [];
    const check = async (label: string, locator: ReturnType<typeof page.locator>) => {
      for (const el of await locator.all()) {
        if (!(await el.isVisible())) continue;
        const box = (await el.boundingBox())!;
        if (box.height < 55.5) tooSmall.push(`${label}: ${box.height}px`);
      }
    };
    await check('explorer', page.getByRole('button', { name: /Scrivi/ }));
    await goTo(page, 'Caccia alle Parole');
    await check('quiz', page.locator('button.h-24'));
    await goTo(page, 'Leggi le Parole');
    await check('reading', page.locator('main button'));
    expect(tooSmall).toEqual([]);
  });

  test('prints a certificate once five letters are learned', async ({ page }) => {
    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      const five = ['A', 'E', 'I', 'O', 'U'];
      localStorage.setItem(key, JSON.stringify({ version: 4, progress: { masteredLetters: five, tracedUppercase: five, tracedLowercase: five, name: 'Sofia' } }));
    }, STORAGE_KEY);
    await page.goto('/');
    await page.getByRole('button', { name: 'Attestato: 5 lettere imparate' }).click();
    await expect(page.getByRole('dialog', { name: /Attestato di bravura/ })).toContainText('Sofia');
    await expect(page.getByRole('button', { name: /Stampa/ })).toBeVisible();
  });
});
