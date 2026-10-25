import locales from './locales.json';
import './styles.css';

const storageKey = 'lol-esports-watch-hub.ui-language';
const languageSelect = document.querySelector('#language');

function matchLanguage(language) {
  if (Object.hasOwn(locales, language)) return language;
  const normalized = language.toLowerCase();
  if (normalized.startsWith('zh')) {
    return /(?:hant|tw|hk|mo)/.test(normalized) ? 'zh-Hant' : 'zh-Hans';
  }
  if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
  const baseLanguage = normalized.split('-')[0];
  return Object.hasOwn(locales, baseLanguage) ? baseLanguage : null;
}

function initialLanguage() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && Object.hasOwn(locales, saved)) return saved;
  } catch {
    // Language selection still works when browser storage is unavailable.
  }
  for (const language of navigator.languages || [navigator.language]) {
    const match = matchLanguage(language);
    if (match) return match;
  }
  return 'en';
}

function renderLanguage(language) {
  const messages = locales[language] || locales.en;
  document.documentElement.lang = language;
  document.title = `LoL Esports Watch Hub — ${messages.status}`;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = messages[element.dataset.i18n] || locales.en[element.dataset.i18n];
  });
  languageSelect.value = language;
}

for (const [language, messages] of Object.entries(locales)) {
  const option = document.createElement('option');
  option.value = language;
  option.lang = language;
  option.textContent = messages.nativeName;
  languageSelect.append(option);
}

languageSelect.addEventListener('change', () => {
  const language = languageSelect.value;
  renderLanguage(language);
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Persistence is optional; do not prevent changing the display language.
  }
});

renderLanguage(initialLanguage());
