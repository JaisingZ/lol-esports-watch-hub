import { dateInZone, hasTimestamp } from './official-parser.mjs';
export const INTERFACE_LANGUAGES = ['zh-Hans','zh-Hant','en','ko','ja','vi','th','pt-BR'];
const STAGES = ['playin','swiss','knockout'];
export function validateContent({locales, requiredKeys = [], ...dataset}) {
  const errors = validateDataset(dataset);
  if (!locales) return [...errors,'Interface dictionaries are required'];
  for (const code of INTERFACE_LANGUAGES) {
    const dictionary = locales[code];
    for (const key of new Set([...Object.keys(locales.en || {}),...requiredKeys])) {
      if (typeof dictionary?.[key] !== 'string' || !dictionary[key].trim()) errors.push(`Missing locale text: ${code}.${key}`);
      const placeholders = text => [...String(text || '').matchAll(/\{\w+\}/g)].map(match=>match[0]).sort().join();
      if (placeholders(dictionary?.[key]) !== placeholders(locales.en?.[key])) errors.push(`Placeholder mismatch: ${code}.${key}`);
    }
  }
  return errors;
}
export function validateDataset(data) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  const url = (value, context) => {
    try { const parsed = new URL(value); check(parsed.protocol === 'https:' && !parsed.username && !parsed.password,context + ': HTTPS required'); return parsed; }
    catch { errors.push(context + ': invalid URL'); return null; }
  };
  const stamp = (value, context) => check(hasTimestamp(value),context + ': timestamp with timezone required');
  const language = (value, context) => { try { check(nonempty(value) && Intl.getCanonicalLocales(value).length === 1,context + ': invalid language'); } catch { errors.push(context + ': invalid language'); } };
  const day = (value, context) => { const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')); check(valid && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value,context + ': invalid date'); };
  const zone = (value, context) => { try { check(nonempty(value),context + ': timezone required'); new Intl.DateTimeFormat('en',{timeZone:value}).format(); } catch { errors.push(context + ': invalid timezone'); } };
  const maps = {};
  for (const name of ['sources','teams','matches','videos','broadcasts']) {
    if (!Array.isArray(data[name])) { errors.push(name + ': array required'); continue; }
    maps[name] = new Map();
    for (const item of data[name]) {
      if (!item || typeof item !== 'object') { errors.push(name + ': invalid record'); continue; }
      check(nonempty(item.id) && !maps[name].has(item.id),name + ': missing/duplicate ID ' + item.id);
      maps[name].set(item.id,item);
    }
  }
  if (Object.keys(maps).length !== 5) return errors;
  function evidence(record, context) {
    url(record.evidenceUrl,context + ' evidence'); stamp(record.verifiedAt,context);
    check(['verified','unverified','restricted'].includes(record.pageStatus),context + ': invalid pageStatus');
    check(['verified','unverified','unavailable'].includes(record.playbackStatus),context + ': invalid playbackStatus');
    if (record.playbackStatus === 'verified') check(nonempty(record.playbackEvidence),context + ': actual playback evidence required');
  }
  for (const source of maps.sources.values()) {
    const context = 'source ' + source.id;
    check(nonempty(source.name) && nonempty(source.platform),context + ': name/platform required');
    url(source.url,context); language(source.language,context); evidence(source,context);
    if (source.liveUrl) url(source.liveUrl,context + ' live');
  }
  for (const team of maps.teams.values()) {
    check(nonempty(team.code) && nonempty(team.name),'team ' + team.id + ': code/name required');
    check(/^team-logos\/[\w.-]+\.(png|webp|jpe?g)$/.test(team.logo || ''),'team ' + team.id + ': local logo path required');
    url(team.logoSource,'team ' + team.id + ' logo source');
  }
  const fixtures = new Set();
  for (const match of maps.matches.values()) {
    const context = 'match ' + match.id;
    check(!match.isDemo && match.tournamentId === 'worlds' && match.season === 2026,context + ': only real Worlds 2026 records allowed');
    check(STAGES.includes(match.stage),context + ': invalid stage');
    check([null,1,3,5].includes(match.bestOf),context + ': invalid bestOf');
    check(Array.isArray(match.teamIds) && match.teamIds.length === 2 && match.teamIds.every(id=>id === null || maps.teams.has(id)),context + ': invalid team references');
    check(!match.teamIds?.[0] || match.teamIds[0] !== match.teamIds[1],context + ': team cannot play itself');
    check(['scheduled','live','completed','postponed','cancelled'].includes(match.status),context + ': invalid status');
    check(['time','day'].includes(match.datePrecision),context + ': invalid datePrecision');
    day(match.scheduledDate,context); zone(match.dateTimezone,context);
    if (match.datePrecision === 'time') stamp(match.startAt,context + ' startAt'); else check(match.startAt === null,context + ': day precision must not invent a start time');
    if (hasTimestamp(match.startAt)) { try { check(dateInZone(match.startAt,match.dateTimezone) === match.scheduledDate,context + ': date does not match venue timezone'); } catch {} }
    stamp(match.verifiedAt,context); url(match.sourceUrl,context);
    if (match.scores !== undefined) check(Array.isArray(match.scores) && match.scores.length === 2 && match.scores.every(v=>Number.isInteger(v) && v >= 0 && v <= 5) && ['live','completed'].includes(match.status),context + ': invalid scores');
    const fixture = [match.stage,match.startAt,match.round,(match.teamIds || []).join(':')].join('|');
    if (match.teamIds?.every(Boolean)) { check(!fixtures.has(fixture),context + ': duplicate fixture'); fixtures.add(fixture); }
  }
  for (const broadcast of maps.broadcasts.values()) {
    const context = 'broadcast ' + broadcast.id;
    day(broadcast.date,context); zone(broadcast.dateTimezone,context); stamp(broadcast.verifiedAt,context); url(broadcast.sourceUrl,context);
    check(STAGES.includes(broadcast.stage),context + ': invalid stage');
    check(['scheduled','live','ended','unknown'].includes(broadcast.status),context + ': invalid status');
    if (broadcast.startAt !== null) stamp(broadcast.startAt,context);
    check(Array.isArray(broadcast.sourceIds) && broadcast.sourceIds.every(id=>maps.sources.has(id)),context + ': missing source');
  }
  const links = new Set();
  for (const video of maps.videos.values()) {
    const context = 'video ' + video.id, source = maps.sources.get(video.sourceId), match = maps.matches.get(video.matchId);
    check(Boolean(source),context + ': missing source');
    check(video.matchId === null || Boolean(match),context + ': missing match');
    check(video.broadcastId === null || maps.broadcasts.has(video.broadcastId),context + ': missing broadcast');
    check(video.matchId !== null || video.broadcastId !== null,context + ': match or broadcast required');
    check(['singleGame','fullMatch','highlights','dayReplay'].includes(video.type),context + ': invalid type');
    if (video.type === 'dayReplay') check(video.matchId === null && video.broadcastId !== null,context + ': day replay must be attached to broadcast');
    if (video.type === 'singleGame') check(Number.isInteger(video.gameNumber) && video.gameNumber > 0 && video.gameNumber <= (match?.bestOf || 5),context + ': invalid game number');
    language(video.language,context); check(source?.language === video.language,context + ': source language mismatch'); evidence(video,context);
    const parsed = url(video.url,context);
    if (parsed && source) {
      check(video.url !== source.url && video.url !== source.liveUrl,context + ': channel/live entry is not a replay');
      if (source.platform === 'YouTube') check(parsed.hostname === 'www.youtube.com' && parsed.pathname === '/watch' && /^[\w-]{11}$/.test(parsed.searchParams.get('v') || ''),context + ': exact YouTube watch URL required');
      if (source.platform === 'Twitch') check(parsed.hostname === 'www.twitch.tv' && /^\/videos\/\d+$/.test(parsed.pathname),context + ': exact Twitch video URL required');
      if (source.platform === 'Bilibili') check(['www.bilibili.com','bilibili.com'].includes(parsed.hostname) && /^\/video\/BV[\w]+\/?$/.test(parsed.pathname),context + ': exact Bilibili video URL required');
      if (video.isSegment) {
        check(Number.isInteger(video.segmentStartSeconds) && video.segmentStartSeconds >= 0 && Number.isInteger(video.segmentEndSeconds) && video.segmentEndSeconds > video.segmentStartSeconds,context + ': invalid official segment');
        if (source.platform === 'YouTube') check(parsed.searchParams.get('t') === video.segmentStartSeconds + 's',context + ': segment URL does not match official start');
      }
      const canonical = source.platform === 'YouTube' ? parsed.searchParams.get('v') : parsed.href;
      const key = [video.matchId,video.broadcastId,source.id,video.type,video.gameNumber,canonical,video.segmentStartSeconds,video.segmentEndSeconds].join('|');
      check(!links.has(key),context + ': duplicate video association'); links.add(key);
    }
  }
  check(data.meta?.schemaVersion === 2,'meta: schemaVersion must be 2');
  stamp(data.meta?.updatedAt,'meta updatedAt');
  check(data.meta?.officialPublishedMatchCount === maps.matches.size,'meta: official match count mismatch');
  const candidateIds = new Set();
  for (const candidate of data.candidates || []) {
    check(candidate.status === 'awaitingReview' && maps.sources.has(candidate.sourceId),'candidate: pending status and known source required');
    check(nonempty(candidate.id) && !candidateIds.has(candidate.id),'candidate: missing/duplicate ID'); candidateIds.add(candidate.id);
    check(candidate.matchId === undefined && candidate.type === undefined,'candidate: unverified match/type cannot be published');
    check(nonempty(candidate.reason),'candidate: review reason required');
    url(candidate.url,'candidate URL'); url(candidate.evidenceUrl,'candidate evidence'); stamp(candidate.verifiedAt,'candidate');
  }
  return errors;
}
