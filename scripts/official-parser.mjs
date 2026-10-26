import { createHash } from 'node:crypto';

export const TOURNAMENT_ID = '115660540725177488';
export const HOME_URL = 'https://lolesports.com/en-US/';
export const BRACKET_URL = `https://lolesports.com/en-US/tournament/${TOURNAMENT_ID}/stage/115660540725570706`;
export const PRIMER_URL = 'https://lolesports.com/en-GB/news/worlds-2026-primer';
const STAGES = new Map([['115660540725570705','playin'],['115660540725570706','swiss'],['115660540725570707','knockout']]);
const STATE = {unstarted:'scheduled',inProgress:'live',completed:'completed',postponed:'postponed',cancelled:'cancelled'};
export const localeLanguage = locale => ({'en-US':'en','ko-KR':'ko','ja-JP':'ja','vi-VN':'vi','th-TH':'th','zh-TW':'zh-TW','zh-CN':'zh-CN','pt-BR':'pt-BR'}[locale]);
export const hash = value => createHash('sha256').update(value).digest('hex').slice(0,16);

// Read data only. Never execute the site's scripts or evaluate its JavaScript.
export function decodeFlight(html) {
  const parts = [];
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    const raw = script[1].trim();
    const prefix = 'self.__next_f.push(';
    if (!raw.startsWith(prefix)) continue;
    const argument = raw.slice(prefix.length).replace(/\);?\s*$/, '');
    try { const value = JSON.parse(argument); if (value[0] === 1 && typeof value[1] === 'string') parts.push(value[1]); } catch { /* Not a data chunk. */ }
  }
  return parts.join('');
}

export function extractObjects(text, typename) {
  const startPattern = new RegExp('\\{\\s*"__typename"\\s*:\\s*"' + typename + '"','g');
  const objects = [];
  for (const match of text.matchAll(startPattern)) {
    let depth = 0, quoted = false, escaped = false;
    for (let i = match.index; i < text.length; i++) {
      const c = text[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try { objects.push(JSON.parse(text.slice(match.index,i + 1))); } catch { /* Reject JS placeholders; other complete objects remain usable. */ }
        break;
      }
    }
  }
  return objects;
}

export function dateInZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp));
  const part = type => parts.find(item=>item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function hasTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
const realTeam = team => team?.teamId && team.teamId !== '0' && team.code !== 'TBD';
const richness = match => (hasTimestamp(match.startTime) ? 100 : 0) + (match.matchTeams?.length === 2 ? 20 : 0) + (match.games?.length || 0);
const rank = state => ({unstarted:0,postponed:1,inProgress:2,completed:3,cancelled:4}[state] ?? -1);

export function parseOfficial({homeHtml, bracketHtml, previous = {}, verifiedAt = new Date().toISOString()}) {
  const homeText = homeHtml + '\n' + decodeFlight(homeHtml);
  const bracketText = bracketHtml + '\n' + decodeFlight(bracketHtml);
  const events = new Map();
  for (const item of extractObjects(homeText,'EventMatch')) {
    if (item.tournament?.id !== TOURNAMENT_ID) continue;
    const old = events.get(item.id);
    if (!old || richness(item) > richness(old) || rank(item.state) > rank(old.state)) events.set(item.id,item);
  }
  const membership = new Map();
  for (const stage of extractObjects(bracketText,'Stage')) {
    if (!STAGES.has(stage.id)) continue;
    for (const section of stage.sections || []) for (const match of section.matches || []) membership.set(match.id,STAGES.get(stage.id));
  }
  if (!events.size || !membership.size) throw new Error('Official schedule is empty or its schema changed; existing data retained.');
  const bracket = new Map();
  for (const item of extractObjects(bracketText,'Match')) {
    if (!membership.has(item.id)) continue;
    const old = bracket.get(item.id);
    if (!old || richness(item) > richness(old)) bracket.set(item.id,item);
  }
  const rounds = new Map();
  for (const cell of extractObjects(bracketText,'Cell')) for (const item of cell.matches || []) if (membership.has(item.id) && cell.name) rounds.set(item.id,cell.name);
  const oldMatches = new Map((previous.matches || []).filter(m=>m.id.startsWith('official:')).map(m=>[m.id,m]));
  const teams = new Map((previous.teams || []).map(team=>[team.id,team]));
  const matches = [], vods = [];
  for (const [officialId, stage] of membership) {
    const event = events.get(officialId), detail = bracket.get(officialId);
    const prior = oldMatches.get('official:' + officialId);
    const rich = event || detail;
    if (!rich) throw new Error(`Missing published match ${officialId}; refusing partial update.`);
    const current = detail && rank(detail.state) > rank(event?.state) ? detail : event || detail;
    const matchTeams = current.matchTeams?.length === 2 ? current.matchTeams : rich.matchTeams;
    if (matchTeams?.length !== 2) throw new Error(`Missing team slots for ${officialId}`);
    const startAt = [event?.startTime,detail?.startTime,prior?.startAt].find(hasTimestamp) || null;
    const final = event?.blockName === 'Finals' || rounds.get(officialId)?.toLowerCase() === 'finals' || officialId === '115660540726095133';
    const dateTimezone = stage === 'playin' ? 'America/Los_Angeles' : final ? 'America/New_York' : 'America/Chicago';
    const scheduledDate = startAt ? dateInZone(startAt,dateTimezone) : prior?.scheduledDate;
    if (!scheduledDate) throw new Error(`No official date for ${officialId}; refusing to infer a date.`);
    const status = STATE[current.state];
    if (!status) throw new Error(`Unknown match state ${current.state}`);
    const match = {id:'official:' + officialId,tournamentId:'worlds',tournamentName:'Worlds',season:2026,stage,
      round:rounds.get(officialId) || event?.blockName || prior?.round || null,
      bestOf:event?.match?.strategy?.count ?? prior?.bestOf ?? null,
      teamIds:matchTeams.map(team=>realTeam(team) ? team.teamId : null),
      startAt,scheduledDate,dateTimezone,datePrecision:startAt ? 'time' : 'day',status,
      sourceUrl:BRACKET_URL,verifiedAt};
    if (['completed','live'].includes(status) && matchTeams.every(team=>Number.isInteger(team.result?.gameWins))) match.scores = matchTeams.map(team=>team.result.gameWins);
    matches.push(match);
    for (const team of matchTeams) {
      if (!realTeam(team)) continue;
      const previousTeam = teams.get(team.teamId);
      const image = (team.lightImage || team.image || previousTeam?.logoSource)?.replace(/^http:/,'https:');
      if (!image) throw new Error(`No official logo for ${team.teamId}`);
      const extension = new URL(image).pathname.match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase() || 'png';
      teams.set(team.teamId,{id:team.teamId,code:team.code,name:team.name,logo:`team-logos/${team.teamId}-${hash(image)}.${extension}`,logoSource:image,...(team.homeLeague?.regionSlug || previousTeam?.region ? {region:team.homeLeague?.regionSlug || previousTeam.region} : {})});
    }
    for (const game of event?.match?.games || []) for (const vod of game.vods || []) {
      const language = localeLanguage(vod.mediaLocale?.locale);
      if (language && vod.provider === 'youtube' && /^[\w-]{11}$/.test(vod.parameter || '')) vods.push({matchId:match.id,gameNumber:game.number,language,videoId:vod.parameter,startMillis:vod.startMillis,endMillis:vod.endMillis,officialVodId:vod.id});
    }
  }
  for (const match of oldMatches.values()) if (!membership.has(match.id.slice(9))) throw new Error('Published match disappeared from official bracket; manual review required.');
  matches.sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate) || (a.startAt || '').localeCompare(b.startAt || '') || a.id.localeCompare(b.id));
  const usedTeams = new Set(matches.flatMap(match=>match.teamIds).filter(Boolean));
  return {matches,teams:[...teams.values()].filter(team=>usedTeams.has(team.id)).sort((a,b)=>a.code.localeCompare(b.code)),vods,officialPublishedMatchCount:membership.size};
}

export function makeBroadcasts(matches, sources, stamp) {
  const days = new Map();
  for (const match of matches) {
    const id = `worlds-2026-${match.stage}-${match.scheduledDate}`;
    if (!days.has(id)) days.set(id,[]);
    days.get(id).push(match);
  }
  return [...days].map(([id,items])=>({id,date:items[0].scheduledDate,dateTimezone:items[0].dateTimezone,stage:items[0].stage,
    startAt:items.map(m=>m.startAt).filter(Boolean).sort()[0] || null,
    status:items.some(m=>m.status === 'live') ? 'live' : items.every(m=>m.status === 'completed') ? 'ended' : items.every(m=>m.status === 'scheduled') ? 'scheduled' : 'unknown',
    sourceIds:sources.filter(source=>source.coverage?.tournamentId === 'worlds' && source.coverage?.season === 2026 && source.liveUrl).map(source=>source.id),
    sourceUrl:BRACKET_URL,verifiedAt:stamp}));
}

export function officialVideos(vods, matches, sources, stamp) {
  const matchMap = new Map(matches.map(match=>[match.id,match]));
  const result = new Map();
  const uses = new Map(), matchUses = new Map();
  for (const vod of vods) { const key = vod.language + ':' + vod.videoId; if (!uses.has(key)) { uses.set(key,new Set()); matchUses.set(key,new Set()); } uses.get(key).add(vod.matchId + ':' + vod.gameNumber); matchUses.get(key).add(vod.matchId); }
  for (const vod of vods) {
    const source = sources.find(source=>source.language === vod.language && source.platform === 'YouTube' && localeLanguage(source.officialVodLanguage) === vod.language);
    if (!source) continue;
    const match = matchMap.get(vod.matchId);
    const broadcastId = `worlds-2026-${match.stage}-${match.scheduledDate}`;
    const base = {matchId:vod.matchId,broadcastId,sourceId:source.id,language:vod.language,platform:'YouTube',type:'singleGame',gameNumber:vod.gameNumber,
      url:`https://www.youtube.com/watch?v=${vod.videoId}`,verifiedAt:stamp,pageStatus:'unverified',playbackStatus:'unverified',evidenceUrl:HOME_URL,officialVodId:vod.officialVodId};
    const segmented = Number.isFinite(vod.startMillis) && vod.startMillis >= 0 && Number.isFinite(vod.endMillis) && vod.endMillis > vod.startMillis;
    const sharedRecording = uses.get(vod.language + ':' + vod.videoId).size > 1;
    if (segmented) {
      base.isSegment = true;
      base.segmentStartSeconds = Math.floor(vod.startMillis / 1000);
      base.segmentEndSeconds = Math.ceil(vod.endMillis / 1000);
      base.url += `&t=${base.segmentStartSeconds}s`;
    }
    // The game association comes from games[].vods, never from a video title or upload date.
    const key = [vod.matchId,vod.gameNumber,source.id,vod.videoId,base.segmentStartSeconds ?? '',base.segmentEndSeconds ?? ''].join(':');
    if (!sharedRecording || segmented) result.set(key,{id:'vod-' + hash(key),...base});
    if (matchUses.get(vod.language + ':' + vod.videoId).size > 1) {
      const dayKey = [broadcastId,source.id,vod.videoId].join(':');
      result.set(dayKey,{id:'day-' + hash(dayKey),...base,matchId:null,type:'dayReplay',url:`https://www.youtube.com/watch?v=${vod.videoId}`,gameNumber:undefined,isSegment:undefined,segmentStartSeconds:undefined,segmentEndSeconds:undefined});
    }
  }
  return [...result.values()];
}
