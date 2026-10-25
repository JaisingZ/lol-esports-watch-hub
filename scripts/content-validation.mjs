import { languageMeta, videoTypes } from '../src/model.js';

export function validateContent({locales, sources, matches, requiredKeys = []}) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  const url = (value, context) => {
    try { const parsed = new URL(value); check(parsed.protocol === 'https:' && !parsed.username && !parsed.password, context + ': HTTPS URL required'); return parsed; }
    catch { errors.push(context + ': invalid URL'); return null; }
  };
  const date = (value, context) => check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), context + ': timestamp with timezone required');
  const language = (value, context) => {
    try { check(nonempty(value) && Intl.getCanonicalLocales(value).length === 1, context + ': invalid language'); }
    catch { errors.push(context + ': invalid language'); }
  };
  for (const [code] of languageMeta) {
    const dictionary = locales?.[code];
    check(dictionary && typeof dictionary === 'object', 'Missing locale: ' + code);
    for (const key of new Set([...Object.keys(locales?.en || {}), ...requiredKeys])) {
      check(nonempty(dictionary?.[key]), 'Missing locale text: ' + code + '.' + key);
      const placeholders = text => [...String(text || '').matchAll(/\{\w+\}/g)].map(match => match[0]).sort().join();
      check(placeholders(dictionary?.[key]) === placeholders(locales?.en?.[key]), 'Placeholder mismatch: ' + code + '.' + key);
    }
  }
  if (!Array.isArray(sources) || !Array.isArray(matches)) return [...errors, 'Both data files must contain arrays'];
  const sourceMap = new Map(); const urls = new Set();
  function evidence(record, context) {
    url(record.evidenceUrl, context + ' evidence'); date(record.verifiedAt, context);
    check(['verified','unverified'].includes(record.pageStatus), context + ': invalid pageStatus');
    check(['verified','unverified','unavailable'].includes(record.playbackStatus), context + ': invalid playbackStatus');
    if (record.playbackStatus === 'verified') check(nonempty(record.playbackEvidence), context + ': actual playback evidence required');
  }
  for (const source of sources) {
    if (!source || typeof source !== 'object') { errors.push('Invalid source'); continue; }
    check(nonempty(source.id) && !sourceMap.has(source.id), 'Missing/duplicate source ID: ' + source.id);
    sourceMap.set(source.id, source);
    check(nonempty(source.name) && nonempty(source.platform), 'Source name/platform required: ' + source.id);
    language(source.language, 'source ' + source.id); evidence(source, 'source ' + source.id);
    const parsed = url(source.url, 'source ' + source.id);
    if (parsed) { check(!urls.has(parsed.href), 'Duplicate source URL'); urls.add(parsed.href); }
  }
  const ids = new Set(); const fixtures = new Set(); const videoUrls = new Set();
  for (const match of matches) {
    if (!match || typeof match !== 'object') { errors.push('Invalid match'); continue; }
    const context = 'match ' + match.id;
    check(nonempty(match.id) && !ids.has(match.id), 'Missing/duplicate match ID'); ids.add(match.id);
    check(!match.isDemo, context + ': demo records cannot ship');
    check(match.tournamentId === 'worlds' && match.season === 2026 && nonempty(match.tournamentName), context + ': only Worlds 2026 is in scope');
    check(Array.isArray(match.teams) && match.teams.length === 2 && match.teams.every(nonempty) && match.teams[0] !== match.teams[1], context + ': two distinct teams required');
    check(['swiss','playin','knockout'].includes(match.stage), context + ': invalid stage');
    check(match.format === null || ['BO1','BO3','BO5'].includes(match.format), context + ': invalid format');
    check(match.status === 'completed', context + ': only completed matches currently supported');
    if (match.startAt !== null) date(match.startAt, context + ' startAt');
    date(match.verifiedAt, context); url(match.scheduleSource, context + ' schedule');
    const fixture = JSON.stringify([match.tournamentId,match.season,match.stage,match.round ?? null,match.startAt,Array.isArray(match.teams) ? [...match.teams].sort() : null]);
    check(!fixtures.has(fixture), context + ': duplicate fixture'); fixtures.add(fixture);
    if (!Array.isArray(match.videos)) { errors.push(context + ': videos must be an array'); continue; }
    for (const video of match.videos) {
      if (!video || typeof video !== 'object') { errors.push(context + ': invalid video'); continue; }
      language(video.language, context); evidence(video, context + ' video');
      check(videoTypes.includes(video.type), context + ': invalid video type');
      if (video.type === 'singleGame') check(Number.isInteger(video.gameNumber) && video.gameNumber > 0 && video.gameNumber <= 5, context + ': game number required');
      const source = sourceMap.get(video.sourceId);
      check(Boolean(source) && video.platform === source?.platform, context + ': missing/mismatched source');
      const parsed = url(video.url, context + ' video');
      if (parsed) {
        const canonical = parsed.hostname.endsWith('youtube.com') && parsed.searchParams.has('v') ? 'youtube:' + parsed.searchParams.get('v') : parsed.href;
        check(!videoUrls.has(canonical), context + ': duplicate video URL'); videoUrls.add(canonical);
        if (source) {
          const sourceUrl = url(source.url, context + ' channel');
          check(sourceUrl && parsed.hostname === sourceUrl.hostname && parsed.href !== sourceUrl.href, context + ': video must use source platform, not channel URL');
          if (source.platform === 'YouTube') check(parsed.pathname === '/watch' && /^[\w-]{11}$/.test(parsed.searchParams.get('v') || ''), context + ': exact YouTube watch URL required');
          if (source.platform === 'Twitch') check(/^\/videos\/\d+$/.test(parsed.pathname), context + ': exact Twitch video URL required');
        }
      }
    }
  }
  return errors;
}
