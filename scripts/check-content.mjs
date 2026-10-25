import { readFileSync } from 'node:fs';
import { validateContent } from './content-validation.mjs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const html = readFileSync('index.html','utf8');
const code = readFileSync('src/main.js','utf8');
const requiredKeys = [...html.matchAll(/data-i18n="([^"]+)"/g),...code.matchAll(/translate\('([^']+)'/g)].map(match=>match[1]);
const errors = validateContent({locales:read('src/locales.json'),sources:read('public/data/sources.json'),matches:read('public/data/matches.json'),requiredKeys});
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Content checks passed: languages, sources, fixtures and video evidence.');
