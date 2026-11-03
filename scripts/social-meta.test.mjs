import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OG_IMAGE_URL, SOCIAL_DESCRIPTION, SOCIAL_TITLE, socialMetaTags } from './social-meta.mjs';

test('built-in social tags are an absolute summary_large_image card', () => {
  const html = socialMetaTags();
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /property="og:url" content="https:\/\/jaisingz\.github\.io\/lol-esports-watch-hub\/"/);
  assert.match(html, /property="og:title" content="LoL Esports Watch Hub — Worlds 2026"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="og:image" content="https:\/\/jaisingz\.github\.io\/lol-esports-watch-hub\/og\.jpg"/);
  assert.match(html, /name="twitter:image" content="https:\/\/jaisingz\.github\.io\/lol-esports-watch-hub\/og\.jpg"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:locale:alternate" content="zh_CN"/);
  assert.match(html, /rel="canonical" href="https:\/\/jaisingz\.github\.io\/lol-esports-watch-hub\/"/);
  assert.equal(OG_IMAGE_URL, 'https://jaisingz.github.io/lol-esports-watch-hub/og.jpg');
  assert.equal(SOCIAL_TITLE, 'LoL Esports Watch Hub — Worlds 2026');
});

test('index.html description matches the card and leaves injection to the build', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<!--social-meta-->/);
  assert.ok(html.includes(`content="${SOCIAL_DESCRIPTION}"`));
  assert.equal(html.includes('property="og:image"'), false);
});
