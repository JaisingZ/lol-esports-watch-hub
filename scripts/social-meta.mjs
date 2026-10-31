export const SITE_URL = 'https://jaisingz.github.io/lol-esports-watch-hub/';
export const OG_IMAGE_URL = `${SITE_URL}og.jpg`;
export const SOCIAL_TITLE = 'LoL Esports Watch Hub — Worlds 2026';
export const SOCIAL_DESCRIPTION = 'Worlds 2026 schedule, official broadcast channels, and verified replay links in 8 languages. Fan-made navigation to official sources — no embeds.';
export const SOCIAL_IMAGE_ALT = 'Fan-made neon canyon art for the LoL Esports Watch Hub, Worlds 2026. Not official Riot artwork.';

const alternateLocales = ['zh_CN', 'zh_TW', 'ko_KR', 'ja_JP', 'vi_VN', 'th_TH', 'pt_BR'];

function escapeAttr(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}
function meta(attribute, name, content) {
  return `<meta ${attribute}="${name}" content="${escapeAttr(content)}">`;
}

export function socialMetaTags() {
  return [
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'LoL Esports Watch Hub'),
    meta('property', 'og:locale', 'en_US'),
    ...alternateLocales.map(code => meta('property', 'og:locale:alternate', code)),
    meta('property', 'og:url', SITE_URL),
    meta('property', 'og:title', SOCIAL_TITLE),
    meta('property', 'og:description', SOCIAL_DESCRIPTION),
    meta('property', 'og:image', OG_IMAGE_URL),
    meta('property', 'og:image:secure_url', OG_IMAGE_URL),
    meta('property', 'og:image:type', 'image/jpeg'),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', SOCIAL_IMAGE_ALT),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', SOCIAL_TITLE),
    meta('name', 'twitter:description', SOCIAL_DESCRIPTION),
    meta('name', 'twitter:image', OG_IMAGE_URL),
    meta('name', 'twitter:image:alt', SOCIAL_IMAGE_ALT),
    `<link rel="canonical" href="${escapeAttr(SITE_URL)}">`,
  ].join('');
}
