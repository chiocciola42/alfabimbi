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
    for (const tab of ['Impara a Scrivere', 'Bolle Magiche', 'Caccia alle Parole', 'Leggi le Parole', 'Esercizi', 'Album Premi', 'Alfabeto']) {
      await goTo(page, tab);
    }
    expect(problems).toEqual([]);
  });

  test('has no horizontal overflow on any page (phone and desktop)', async ({ page }) => {
    await openApp(page);
    for (const tab of ['Alfabeto', 'Impara a Scrivere', 'Bolle Magiche', 'Caccia alle Parole', 'Leggi le Parole', 'Esercizi', 'Album Premi']) {
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

  test('the exercises are playable in every mode, fit the screen and have big touch targets', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Esercizi');
    const tooSmall: string[] = [];
    const checkPage = async (label: string) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, label).toBeLessThanOrEqual(1);
      for (const el of await page.locator('main button').all()) {
        if (!(await el.isVisible())) continue;
        const box = (await el.boundingBox())!;
        if (box.height < 55.5 || box.width < 55.5) tooSmall.push(`${label}: ${await el.innerText()} ${box.width}x${box.height}`);
      }
    };
    await checkPage('syllables');
    for (const mode of ['Trova la sillaba', 'Scrivi la sillaba', 'Completa la parola', 'Inizia con…', 'Cerchia le lettere']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await checkPage(mode);
    }
    expect(tooSmall).toEqual([]);
  });

  test('finds a syllable, completes a word and keeps both after a reload', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Esercizi');
    await page.getByRole('button', { name: 'Trova la sillaba', exact: true }).click();
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova sillaba/)).toBeVisible();
    await page.getByRole('button', { name: 'Completa la parola', exact: true }).click();
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova parola nel diario/)).toBeVisible();

    await page.reload();
    await chooseItalian(page);
    const state = await readState(page);
    expect(state.progress.syllables).toHaveLength(1);
    expect(state.progress.readWords).toHaveLength(1);
    expect(state.usage.counters.syllable_learned).toBe(1);
  });

  test('circles the letters of a word and finds the pictures that start with a letter', async ({ page }) => {
    await openApp(page);
    await goTo(page, 'Esercizi');
    await page.getByRole('button', { name: 'Cerchia le lettere', exact: true }).click();
    const letters = page.getByTestId('hunt-word').getByRole('button');
    const n = await letters.count();
    for (let i = 0; i < n; i++) {
      if ((await letters.nth(i).innerText()) === 'L') await letters.nth(i).click();
    }
    await expect(page.getByText(/Tutte cerchiate/)).toBeVisible();

    await page.getByRole('button', { name: 'Inizia con…', exact: true }).click();
    for (const b of await page.locator('[data-starts="true"]').all()) await b.click();
    await expect(page.getByText(/Tutte trovate/)).toBeVisible();
    expect((await readState(page)).progress.completedWordQuizRounds).toBe(2);
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

  test('shows the maths goals on the home page and prints a maths certificate', async ({ page }) => {
    await page.addInitScript((key) => {
      if (localStorage.getItem(key)) return;
      const stars: Record<string, number> = {};
      for (let i = 1; i <= 6; i++) stars[String(i)] = 3;
      localStorage.setItem(key, JSON.stringify({ version: 4, progress: { name: 'Sofia', mathLevelStars: stars, completedMathLevels: 6 } }));
    }, STORAGE_KEY);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Matematica/, level: 3 })).toBeVisible();
    await expect(page.getByTestId('math-map').getByRole('listitem')).toHaveCount(9);
    await expect(page.getByText('6 / 45 livelli')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Attestato: 5 livelli di matematica' }).click();
    await expect(page.getByRole('dialog', { name: /Attestato di bravura/ })).toContainText('5 livelli');
  });
});

test.describe('Inglese', () => {
  const chooseEnglish = async (page: import('@playwright/test').Page) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Inglese/ }).click();
    await expect(page.getByRole('button', { name: 'Ascolta la parola inglese' })).toBeVisible();
  };

  test('is reachable from the home page, loads cleanly and has no horizontal overflow', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
    await chooseEnglish(page);
    for (const tab of ['ABC Inglese', 'Leggi in Inglese', 'Scrivi in Inglese', 'Storie e Canzoni', 'Parole Inglesi', 'Album Premi']) {
      await goTo(page, tab);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, tab).toBeLessThanOrEqual(1);
    }
    await page.getByRole('button', { name: 'Torna alla pagina iniziale' }).click();
    const home = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(home, 'home').toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test('recognises a word by ear, earns stars and shows it on the home page goals', async ({ page }) => {
    await chooseEnglish(page);
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova parola inglese/)).toBeVisible();
    const state = await readState(page);
    expect(state.progress.englishWords).toHaveLength(1);
    expect(state.progress.stars).toBeGreaterThanOrEqual(2);
    expect(state.usage.counters.english_word_learned).toBe(1);

    await page.getByRole('button', { name: 'Torna alla pagina iniziale' }).click();
    await expect(page.getByRole('button', { name: /Inglese/ })).toContainText('1 parole su 64');
    await expect(page.getByTestId('english-world-map')).toBeVisible();
  });

  test('finds a letter by its name and builds a word from a family', async ({ page }) => {
    await chooseEnglish(page);
    await goTo(page, 'ABC Inglese');
    await page.getByRole('button', { name: 'Trova la lettera' }).click();
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova lettera inglese/)).toBeVisible();

    await goTo(page, 'Leggi in Inglese');
    await expect(page.getByTestId('rime')).toBeVisible();
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova parola letta/)).toBeVisible();
    await expect(page.getByTestId('onset-slot')).toHaveAttribute('data-filled', 'true');

    const state = await readState(page);
    expect(state.progress.englishLetters).toHaveLength(1);
    expect(state.progress.englishFamilyWords).toHaveLength(1);
  });

  test('recognises a sight word and finishes a story by listening to every line', async ({ page }) => {
    await chooseEnglish(page);
    await goTo(page, 'Leggi in Inglese');
    await page.getByRole('button', { name: "A colpo d'occhio" }).click();
    await page.locator('button[data-correct="true"]').click();
    await expect(page.getByText(/Nuova parola riconosciuta/)).toBeVisible();

    await goTo(page, 'Storie e Canzoni');
    await expect(page.getByRole('button', { name: 'Ho letto tutto!' })).toBeDisabled();
    const speakers = page.getByRole('button', { name: /^Ascolta la riga / });
    for (let i = 0; i < (await speakers.count()); i++) await speakers.nth(i).click();
    await page.getByRole('button', { name: 'Ho letto tutto!' }).click();
    await expect(page.getByText(/Hai letto/)).toBeVisible();

    const state = await readState(page);
    expect(state.progress.englishSightWords).toHaveLength(1);
    expect(state.progress.englishStories).toEqual(['red-cat']);
    expect(state.usage.counters.english_story_read).toBe(1);
  });

  test('builds a word with its letters', async ({ page }) => {
    await chooseEnglish(page);
    await goTo(page, 'Scrivi in Inglese');
    await page.getByRole('button', { name: 'Costruisci le parole' }).click();
    const slots = await page.getByTestId('letter-slots').locator('> div').count();
    expect(slots).toBe(3);
    // the word is shown by its picture: try every free letter in turn until the word is complete
    for (let i = 0; i < slots; i++) {
      const filled = () => page.getByTestId('letter-slots').locator('> div.bg-emerald-400').count();
      const before = await filled();
      const tiles = page.getByRole('button', { name: /^Lettera [A-Z]$/ });
      const count = await tiles.count();
      for (let t = 0; t < count; t++) {
        if (!(await tiles.nth(t).isEnabled())) continue;
        await tiles.nth(t).click();
        if (i === slots - 1 || (await filled()) > before) break;
      }
    }
    await expect(page.getByText(/Hai scritto una nuova parola/)).toBeVisible();
    expect((await readState(page)).progress.englishSpelledWords).toHaveLength(1);
  });

  test('traces an English letter with the pointer', async ({ page }) => {
    await chooseEnglish(page);
    await goTo(page, 'Scrivi in Inglese');
    await expect(page.getByText('is for apple')).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByTitle('Lettera successiva').click(); // A -> E
    await expect(page.getByText('is for egg')).toBeVisible();

    const stage = page.getByTestId('tracing-stage');
    const box = (await stage.boundingBox())!;
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
    await expect.poll(async () => (await readState(page)).progress.englishTraced).toContain('E');
    const state = await readState(page);
    expect(state.usage.counters.english_letter_traced).toBe(1);
    expect(state.progress.tracedUppercase).toEqual([]); // the Italian progress is untouched
  });

  test('has touch targets of at least 56px on the game controls', async ({ page }) => {
    await chooseEnglish(page);
    const tooSmall: string[] = [];
    const check = async (label: string, locator: ReturnType<typeof page.locator>) => {
      for (const el of await locator.all()) {
        if (!(await el.isVisible())) continue;
        const box = (await el.boundingBox())!;
        if (box.height < 55.5) tooSmall.push(`${label}: ${box.height}px`);
      }
    };
    await check('vocabulary', page.locator('main button'));
    await goTo(page, 'ABC Inglese');
    await check('alphabet explore', page.locator('main button'));
    await page.getByRole('button', { name: 'Trova la lettera' }).click();
    await check('alphabet quiz', page.locator('main button'));
    await goTo(page, 'Leggi in Inglese');
    await check('families', page.locator('main button'));
    await page.getByRole('button', { name: "A colpo d'occhio" }).click();
    await check('sight words', page.locator('main button'));
    await goTo(page, 'Scrivi in Inglese');
    await page.getByRole('button', { name: 'Costruisci le parole' }).click();
    await check('spelling', page.locator('main button'));
    await goTo(page, 'Storie e Canzoni');
    await check('stories', page.locator('main button'));
    expect(tooSmall).toEqual([]);
  });
});
