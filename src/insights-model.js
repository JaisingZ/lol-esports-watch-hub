const DAY=86400000;
export function originalVideoKey(video){
  if(video.originalVideoId)return `${video.platform}:${video.originalVideoId}`;
  try{const u=new URL(video.url);if(u.hostname.endsWith('youtube.com'))return `YouTube:${u.searchParams.get('v')}`;if(u.hostname.endsWith('twitch.tv')&&/^\/videos\/\d+$/.test(u.pathname))return `Twitch:${u.pathname.split('/').at(-1)}`;if(u.hostname.endsWith('bilibili.com'))return `Bilibili:${u.pathname.match(/BV[\w]+/)?.[0]||u.pathname}`;if(u.hostname==='youtu.be')return `YouTube:${u.pathname.slice(1)}`;return `${video.platform}:${u.origin+u.pathname}`;}catch{return null}
}
export function latestCheck(target,kind,region,checks=[],now=Date.now()){
  if(!region)return null;
  const latest=checks.filter(c=>c.target===target&&c.kind===kind&&c.region===region&&Date.parse(c.checkedAt)<=now).sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt))[0];
  if(!latest||latest.status!=='passed'||now-Date.parse(latest.checkedAt)>(kind==='live'?DAY:7*DAY))return null;
  if(!latest.evidence||!latest.environment?.browser||!latest.environment?.network||!latest.regionConfirmed)return null;
  const points=kind==='live'?['live']:['start','middle','end'];
  if(!points.every(p=>latest.samples?.some(s=>s.position===p&&s.advancedSeconds>=10)))return null;
  return latest;
}
export function verifiedVideo(video,{checks=[],region,now=Date.now()}={}){
  if(video.playbackStatus==='unavailable')return false;
  const check=latestCheck(originalVideoKey(video),'vod',region,checks,now);
  return Boolean(check&&(!video.isSegment||check.segments?.some(s=>s.startSeconds===video.segmentStartSeconds&&s.advancedSeconds>=10)));
}
export function reliability(target,region,checks=[],now=Date.now()){
  const history=checks.filter(c=>c.target===target&&c.region===region&&Date.parse(c.checkedAt)<=now&&now-Date.parse(c.checkedAt)<=7*DAY);
  return {samples:history.length,successRate:history.length?history.filter(c=>c.status==='passed').length/history.length:null};
}
export function compareSources(a,b,context){
 const ar=reliability(a.id,context.region,context.checks,context.now),br=reliability(b.id,context.region,context.checks,context.now);
 const ac=latestCheck(a.id,'live',context.region,context.checks,context.now),bc=latestCheck(b.id,'live',context.region,context.checks,context.now);
 return (br.successRate??-1)-(ar.successRate??-1)||(bc?.height??-1)-(ac?.height??-1)||(ac?.startupMs??Infinity)-(bc?.startupMs??Infinity)||a.id.localeCompare(b.id);
}
export function aggregatePlayers(rows,players,{season=null,stage='all',role='all',team='all'}={}){
 const ids=new Set(players.filter(p=>p.worlds2026).map(p=>p.id)),map=new Map(),seen=new Set();
 for(const row of rows){
  if(!ids.has(row.playerId)||(season!==null&&row.season!==season)||(stage!=='all'&&row.stage!==stage)||(role!=='all'&&row.role!==role)||(team!=='all'&&row.teamId!==team))continue;
  const key=row.gameId+':'+row.playerId;if(seen.has(key))continue;seen.add(key);
  if(!map.has(row.playerId))map.set(row.playerId,{playerId:row.playerId,games:0,wins:0,kills:0,deaths:0,assists:0,years:new Set(),complete:true});
  const s=map.get(row.playerId);s.games++;s.wins+=row.win===true?1:0;s.years.add(row.season);
  for(const k of ['kills','deaths','assists'])if(Number.isFinite(row[k])&&row[k]>=0)s[k]+=row[k];else s.complete=false;
 }
 return [...map.values()].map(s=>({...s,years:[...s.years].sort(),kda:s.complete?(s.deaths===0?Infinity:(s.kills+s.assists)/s.deaths):null,winRate:s.wins/s.games}));
}
export function percentile(value,population){
 if(population.length<2)return 50;
 const below=population.filter(n=>n<value).length,equal=population.filter(n=>n===value).length;
 return (below+(equal-1)/2)/(population.length-1)*100;
}
export function hotRanking(videos,metrics,context={}){
 const now=context.now??Date.now(),snapshots=new Map();
 for(const m of metrics){if(!Number.isFinite(m.views)||m.views<0||Date.parse(m.observedAt)>now||!(now-Date.parse(m.observedAt)<=DAY))continue;const old=snapshots.get(m.videoKey);if(!old||Date.parse(m.observedAt)>Date.parse(old.observedAt))snapshots.set(m.videoKey,m);}
 const unique=new Map();
 for(const v of videos){const key=originalVideoKey(v),metric=snapshots.get(key);if(!metric)continue;
  if(!unique.has(key))unique.set(key,{...v,videoKey:key,views:metric.views,observedAt:metric.observedAt,publishedAt:metric.publishedAt||'',associations:[]});unique.get(key).associations.push(v.id);
 }
 const all=[...unique.values()],list=all.filter(v=>verifiedVideo(v,context)),channels=new Map();for(const v of all)channels.set(v.sourceId,(channels.get(v.sourceId)||0)+v.views);
 for(const v of list){const peers=list.filter(p=>p.platform===v.platform),sourceIds=[...new Set(peers.map(p=>p.sourceId))];v.sourceViews=channels.get(v.sourceId);v.sampleSize=peers.length;v.score=.7*percentile(v.views,peers.map(p=>p.views))+.3*percentile(v.sourceViews,sourceIds.map(id=>channels.get(id)));}
 return list.sort((a,b)=>b.score-a.score||b.views-a.views||b.publishedAt.localeCompare(a.publishedAt)||a.videoKey.localeCompare(b.videoKey));
}
