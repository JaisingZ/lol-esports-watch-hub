import { defineConfig } from 'vite';
import { socialMetaTags } from './scripts/social-meta.mjs';

export default defineConfig({
  appType: 'mpa',
  base: '/lol-esports-watch-hub/',
  build: { rollupOptions: { input: { app: 'index.html', english: 'english.html' } } },
  plugins: [{
    name: 'social-meta',
    transformIndexHtml(html) {
      const marker = '<!--social-meta-->';
      return html.includes(marker) ? html.replace(marker, socialMetaTags()) : html;
    },
  }],
});
