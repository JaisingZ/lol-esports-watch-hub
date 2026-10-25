import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const languages = ['zh-Hans', 'zh-Hant', 'en', 'ko', 'ja', 'vi', 'th', 'pt-BR'];
const localePath = resolve('src/locales.json');
const locales = JSON.parse(readFileSync(localePath, 'utf8'));
const requiredKeys = ['nativeName', 'languageLabel', 'status', 'heading', 'description', 'detail', 'schedule', 'footer'];
const errors = [];

for (const language of languages) {
  for (const key of requiredKeys) {
    if (typeof locales[language]?.[key] !== 'string' || !locales[language][key].trim()) {
      errors.push(`Missing locale text: ${language}.${key}`);
    }
  }
}

function validateUrl(url, context) {
  try {
    if (new URL(url).protocol !== 'https:') errors.push(`${context}: expected HTTPS URL`);
  } catch {
    errors.push(`${context}: invalid URL`);
  }
}

for (const name of ['sources', 'matches']) {
  const path = resolve(`public/data/${name}.json`);
  if (!existsSync(path)) {
    console.log(`No ${name} data yet; content check skipped.`);
    continue;
  }
  const records = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(records)) {
    errors.push(`${name}.json must contain an array`);
    continue;
  }
  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim()) {
      errors.push(`${name}: every record needs a non-empty string id`);
      continue;
    }
    if (ids.has(record.id)) errors.push(`${name}: duplicate id ${record.id}`);
    ids.add(record.id);
    if (name === 'sources') {
      validateUrl(record.url, `source ${record.id}`);
    } else {
      if (!record.tournamentId || !record.season) errors.push(`match ${record.id}: tournamentId and season required`);
      if (record.videos !== undefined && !Array.isArray(record.videos)) {
        errors.push(`match ${record.id}: videos must be an array`);
        continue;
      }
      for (const video of record.videos || []) {
        if (!video || typeof video !== 'object') {
          errors.push(`match ${record.id}: invalid video record`);
          continue;
        }
        if (record.isDemo) errors.push(`match ${record.id}: demo matches cannot contain video links`);
        if (!video.language) errors.push(`match ${record.id}: video language required`);
        validateUrl(video.url, `match ${record.id} video`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Content checks passed: 8 interface languages; available data files validated.');
}
