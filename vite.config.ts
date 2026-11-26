import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Anteprime social (og:image, og:url, twitter:card): vogliono URL assoluti, quindi le aggiungo solo
 * quando il build gira su Vercel e conosce il dominio di produzione. In locale e in CI non cambia nulla.
 */
function socialMeta(): Plugin {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    name: 'alfabimbi-social-meta',
    transformIndexHtml() {
      if (!host) return [];
      const base = `https://${host}`;
      const meta = (attrs: Record<string, string>) => ({ tag: 'meta', attrs, injectTo: 'head' as const });
      return [
        meta({ property: 'og:url', content: `${base}/` }),
        meta({ property: 'og:image', content: `${base}/icons/pwa-512.png` }),
        meta({ property: 'og:image:width', content: '512' }),
        meta({ property: 'og:image:height', content: '512' }),
        meta({ property: 'og:image:alt', content: 'Alfabimbi, la webapp per imparare giocando' }),
        meta({ name: 'twitter:card', content: 'summary' }),
      ];
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    socialMeta(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Alfabimbi - Italiano e Matematica per bambini',
        short_name: 'Alfabimbi',
        description:
          "Webapp educativa per imparare l'italiano e la matematica giocando, con stelle e figurine da collezionare.",
        lang: 'it',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFFBEB',
        theme_color: '#F59E0B',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
