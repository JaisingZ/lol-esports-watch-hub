import { defineConfig } from 'vite';
import { socialMetaTags } from './scripts/social-meta.mjs';

export default defineConfig({
  base: '/lol-esports-watch-hub/',
  plugins: [{
    name: 'social-meta',
    transformIndexHtml(html) {
      const marker = '<!--social-meta-->';
      return html.includes(marker) ? html.replace(marker, socialMetaTags()) : html;
    },
  }],
});
