import { readFile, writeFile, rename, mkdir, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME_URL, BRACKET_URL, PRIMER_URL, parseOfficial, makeBroadcasts, officialVideos, hash } from './official-parser.mjs';
import { validateDataset } from './content-validation.mjs';
import { BILIBILI_SEARCH_URL, parseBilibiliCandidates } from './bilibili-candidates.mjs';

const DATA_FILES = ['sources','teams','matches','videos','broadcasts','candidates','meta'];
export function stableString(value) {
  const normalize = item => Array.isArray(item) ? item.map(normalize) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).filter(key=>key !== 'verifiedAt' && key !== 'updatedAt' && item[key] !== undefined).sort().map(key=>[key,normalize(item[key])]))
    : item;
  return JSON.stringify(normalize(value));
}
const json = value => JSON.stringify(value,null,2) + '\n';
async function exists(file) { try { await access(file); return true; } catch { return false; } }
export async function readDataset(root) {
  const result = {};
  for (const name of DATA_FILES) {
    const file = path.join(root,'public/data',name + '.json');
    result[name] = await exists(file) ? JSON.parse(await readFile(file,'utf8')) : name === 'meta' ? {} : [];
  }
  return result;
}
function preserveTimes(records, oldRecords) {
  const old = new Map((oldRecords || []).map(item=>[item.id,item]));
  return records.map(item=>stableString(item) === stableString(old.get(item.id)) ? old.get(item.id) : item);
}
function videoIdentity(video) {
  return [video.matchId,video.broadcastId,video.sourceId,video.type,video.gameNumber,video.url,video.segmentStartSeconds,video.segmentEndSeconds].join('|');
}
function migrateVideos(previous, matches, teams, sources) {
  if (previous.meta?.schemaVersion === 2) return previous.videos || [];
  const teamMap = new Map(teams.map(team=>[team.id,team.code]));
  const result = [];
  for (const old of previous.matches || []) {
    const sorted = [...old.teams].sort().join('|');
    const candidates = matches.filter(match=>match.stage === old.stage && match.teamIds.map(id=>teamMap.get(id)).sort().join('|') === sorted);
    if (candidates.length !== 1) throw new Error('Cannot unambiguously migrate existing video match: ' + old.id);
    const match = candidates[0];
    for (const video of old.videos || []) {
      const oldSource = previous.sources.find(source=>source.id === video.sourceId);
      const source = sources.find(source=>source.url === oldSource?.url);
      if (!source) throw new Error('Missing source for existing video: ' + video.sourceId);
      result.push({id:'curated-' + hash(video.url + match.id),...video,sourceId:source.id,matchId:match.id,broadcastId:`worlds-2026-${match.stage}-${match.scheduledDate}`,curated:true});
    }
  }
  return result;
}

export function buildCandidate({homeHtml,bracketHtml,previous,research,discoveredCandidates,now = new Date().toISOString()}) {
  const parsed = parseOfficial({homeHtml,bracketHtml,previous,verifiedAt:now});
  const sourceMap = new Map((previous.sources || []).map(source=>[source.id,source]));
  // Explicit research records replace equivalent old channel URLs and add coverage evidence.
  for (const raw of research?.sources || []) {
    for (const [id,old] of sourceMap) if (old.url.toLowerCase() === raw.url.toLowerCase() && id !== raw.id) sourceMap.delete(id);
    sourceMap.set(raw.id,{...raw,livePageStatus:raw.livePageStatus || 'verified',coverage:{tournamentId:'worlds',season:2026,evidenceUrl:raw.evidenceUrl}});
  }
  const sources = [...sourceMap.values()].map(source=>({...source,language:source.language === 'zh-Hant' ? 'zh-TW' : source.language === 'zh-Hans' ? 'zh-CN' : source.language})).sort((a,b)=>a.id.localeCompare(b.id));
  const broadcasts = makeBroadcasts(parsed.matches,sources,now);
  const inherited = migrateVideos(previous,parsed.matches,parsed.teams,sources);
  const refreshedVideoIds = new Set(parsed.vods.map(vod=>vod.videoId));
  const oldVideos = new Map(inherited.map(video=>[videoIdentity(video),video]));
  const videos = new Map(inherited.filter(video=>video.curated || !video.officialVodId || !refreshedVideoIds.has(new URL(video.url).searchParams.get('v'))).map(video=>[videoIdentity(video),video]));
  const curated = inherited.filter(video=>video.curated);
  for (const video of [...officialVideos(parsed.vods,parsed.matches,sources,now),...(research?.videos || [])]) {
    // Retain a previously checked standalone game page instead of duplicating it with t=1s.
    const base = new URL(video.url).searchParams.get('v');
    if (video.matchId && curated.some(old=>old.matchId === video.matchId && old.gameNumber === video.gameNumber && old.sourceId === video.sourceId && new URL(old.url).searchParams.get('v') === base)) continue;
    const key = videoIdentity(video), old = oldVideos.get(key);
    videos.set(key,old && old.pageStatus === 'verified' ? {...video,...old} : video);
  }
  const candidateMap = new Map((previous.candidates || []).map(candidate=>[candidate.id,candidate]));
  for (const candidate of discoveredCandidates || []) candidateMap.set(candidate.id,candidate);
  const candidate = {sources,teams:parsed.teams,matches:parsed.matches,candidates:[...candidateMap.values()].sort((a,b)=>a.id.localeCompare(b.id)),
    videos:[...videos.values()].sort((a,b)=>a.id.localeCompare(b.id)),broadcasts,
    meta:{schemaVersion:2,updatedAt:now,tournamentId:'worlds',season:2026,officialTournamentId:'115660540725177488',
      officialPublishedMatchCount:parsed.officialPublishedMatchCount,officialCompetitionDayCount:broadcasts.length,
      scheduleSources:[HOME_URL,BRACKET_URL],venueTimezoneSource:PRIMER_URL,
      sourceHealth:[{id:'official-home',url:HOME_URL,status:'ok'},{id:'official-bracket',url:BRACKET_URL,status:'ok'}],
      evidencePolicy:'Official schedule and VOD associations are parsed from published data. Page reachability and actual playback are separate checks. updatedAt is the last content change, not the last attempted sync.'}};
  for (const name of DATA_FILES.filter(name=>name !== 'meta')) candidate[name] = preserveTimes(candidate[name],previous[name]);
  if (stableString(candidate) === stableString(previous)) return {candidate:previous,changed:false};
  const errors = validateDataset(candidate);
  if (errors.length) throw new Error('Candidate validation failed:\n' + errors.join('\n'));
  return {candidate,changed:true};
}

export async function fetchChecked(url, {fetcher = fetch, binary = false, maxBytes = 8_000_000} = {}) {
  const response = await fetcher(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'lol-esports-watch-hub/1.0 (+https://github.com/JaisingZ/lol-esports-watch-hub)'}});
  if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
  const size = Number(response.headers.get('content-length'));
  if (size > maxBytes) throw new Error('Response too large: ' + url);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > maxBytes) throw new Error('Empty or oversized response: ' + url);
  return binary ? buffer : buffer.toString('utf8');
}
function isImage(buffer) {
  return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || buffer.subarray(0,3).equals(Buffer.from([255,216,255])) || (buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP');
}

// Every remote fetch and validation completes before any published file changes.
// Each replacement is atomic; if a local write fails, restore every original byte.
export async function commitFiles(files, {replace = rename} = {}) {
  const backups = new Map(), staged = [], installed = [];
  const suffix = `.sync-${process.pid}-${Date.now()}`;
  try {
    for (const [file,bytes] of files) {
      await mkdir(path.dirname(file),{recursive:true});
      backups.set(file,await exists(file) ? await readFile(file) : null);
      const temp = file + suffix;
      await writeFile(temp,bytes);
      staged.push([temp,file]);
    }
    for (const [temp,file] of staged) { await replace(temp,file); installed.push(file); }
  } catch (error) {
    for (const file of installed.reverse()) {
      const old = backups.get(file);
      if (old === null) await unlink(file).catch(()=>{}); else await writeFile(file,old);
    }
    throw error;
  } finally {
    for (const [temp] of staged) await unlink(temp).catch(()=>{});
  }
}

export async function syncOfficial({root = process.cwd(), dryRun = false, research, homeHtml, bracketHtml, fetcher = fetch, now = new Date().toISOString(), candidateHtml} = {}) {
  const previous = await readDataset(root);
  const warnings = [];
  const [home,bracket] = await Promise.all([homeHtml ?? fetchChecked(HOME_URL,{fetcher}),bracketHtml ?? fetchChecked(BRACKET_URL,{fetcher})]);
  let discoveredCandidates;
  if ([...(research?.sources || []),...previous.sources].some(source=>source.id === 'bilibili-zh-CN')) {
    try { discoveredCandidates = parseBilibiliCandidates(candidateHtml ?? await fetchChecked(BILIBILI_SEARCH_URL,{fetcher}),now); }
    catch (error) { const warning = 'Optional Bilibili discovery unavailable; existing candidates retained: ' + error.message; warnings.push(warning); console.warn(warning); }
  }
  const result = buildCandidate({homeHtml:home,bracketHtml:bracket,previous,research,discoveredCandidates,now});
  const files = [];
  for (const team of result.candidate.teams) {
    const file = path.join(root,'public',team.logo);
    if (await exists(file)) continue;
    const host = new URL(team.logoSource).hostname;
    if (!['static.lolesports.com','am-a.akamaihd.net','cmsassets.rgpub.io'].includes(host)) throw new Error('Unrecognized official logo host: ' + host);
    const bytes = await fetchChecked(team.logoSource,{fetcher,binary:true,maxBytes:3_000_000});
    if (!isImage(bytes)) throw new Error('Invalid image response: ' + team.logoSource);
    files.push([file,bytes]);
  }
  if (result.changed) for (const name of DATA_FILES) files.push([path.join(root,'public/data',name + '.json'),json(result.candidate[name])]);
  if (!dryRun && files.length) await commitFiles(files);
  return {...result,changed:result.changed || files.length > 0,dryRun,warnings,downloadedLogoCount:files.filter(([file])=>file.includes('team-logos')).length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  try {
    const researchPath = option('--research');
    const snapshotDir = option('--snapshots');
    const result = await syncOfficial({dryRun:args.includes('--dry-run'),research:researchPath ? JSON.parse(await readFile(researchPath,'utf8')) : undefined,
      homeHtml:snapshotDir ? await readFile(path.join(snapshotDir,'official-home.snapshot.html'),'utf8') : undefined,
      bracketHtml:snapshotDir ? await readFile(path.join(snapshotDir,'official-swiss.snapshot.html'),'utf8') : undefined});
    console.log(JSON.stringify({changed:result.changed,dryRun:result.dryRun,matches:result.candidate.matches.length,teams:result.candidate.teams.length,videos:result.candidate.videos.length,broadcasts:result.candidate.broadcasts.length,downloadedLogos:result.downloadedLogoCount,warnings:result.warnings},null,2));
    if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT,`changed=${result.changed}\n`,{flag:'a'});
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY,
      `Core official schedule: ${result.candidate.matches.length} matches, ${result.candidate.teams.length} teams, ${result.candidate.videos.length} video associations. Changed: ${result.changed}.\n\n` +
      (result.warnings.length ? 'Source warnings (partial source failure):\n\n' + result.warnings.map(warning=>'- ' + warning.replace(/[\r\n]/g,' ')).join('\n') + '\n\nBilibili candidates were retained; none were promoted to verified video resources.\n' : 'No source collection warnings.\n'),{flag:'a'});
  } catch (error) { console.error('Sync failed; existing published data was retained.\n' + error.message); process.exitCode = 1; }
}
