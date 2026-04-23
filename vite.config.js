import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the repo at https://<user>.github.io/<repo>/.
// The deploy workflow injects BASE=/<repo>/ so builds work at that subpath.
const base = process.env.BASE || '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Расходы',
        short_name: 'Расходы',
        description: 'Офлайн-трекер расходов с аналитикой.',
        lang: 'ru',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
