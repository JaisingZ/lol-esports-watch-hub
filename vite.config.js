import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  base: '/lol-esports-watch-hub/',
  build: { rollupOptions: { input: { app: 'index.html', english: 'english.html' } } },
});
