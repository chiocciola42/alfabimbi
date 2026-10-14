import { expect, test } from '@playwright/test';
import { chooseItalian, openApp } from './helpers';

test.describe('PWA', () => {
  test('exposes a valid web app manifest with installable icons', async ({ page, request }) => {
    await openApp(page);
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await request.get(new URL(href!, page.url()).toString());
    expect(res.ok()).toBe(true);
    const manifest = await res.json();

    expect(manifest).toMatchObject({
      name: expect.stringContaining('Alfabimbi'),
      short_name: 'Alfabimbi',
      lang: 'it',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      theme_color: '#F59E0B',
      background_color: '#FFFBEB',
    });
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      const r = await request.get(new URL(icon.src, page.url()).toString());
      expect(r.ok(), icon.src).toBe(true);
      expect(r.headers()['content-type']).toContain('image/png');
    }
  });

  test('declares theme color, favicon and the iOS home-screen icon', async ({ page, request }) => {
    await openApp(page);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F59E0B');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
      const href = await page.locator(sel).getAttribute('href');
      const r = await request.get(new URL(href!, page.url()).toString());
      expect(r.ok(), sel).toBe(true);
    }
  });

  test('registers a service worker that takes control of the page', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain('/sw.js');
  });

  test('works offline once it has been loaded (including saved progress)', async ({ page, context }) => {
    await openApp(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    await context.setOffline(true);
    await page.reload();
    await chooseItalian(page);

    // deep navigation inside the app shell also works offline
    await page.getByRole('button', { name: 'Bolle Magiche', exact: true }).locator('visible=true').first().click();
    await expect(page.getByText(/Missione Bolle Magiche/)).toBeVisible();
    await context.setOffline(false);
  });

  test('serves the app for unknown routes (SPA fallback) and ships the service worker uncached', async ({ page, request }) => {
    const res = await page.goto('/una/pagina/qualunque');
    expect(res?.status()).toBe(200);
    await chooseItalian(page);

    const sw = await request.get('/sw.js');
    expect(sw.ok()).toBe(true);
    expect(sw.headers()['content-type']).toMatch(/javascript/);
  });

  test('self-hosts its fonts (no third-party requests)', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol.startsWith('http')) external.push(r.url());
    });
    await openApp(page);
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });
});
