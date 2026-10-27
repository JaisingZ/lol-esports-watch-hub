import { compareSources } from './insights-model.js';
import {displayableVideo,liveAddress} from './watch-links.js';
export const languageMeta = [['zh-Hans','简体中文'],['zh-Hant','繁體中文'],['en','English'],['ko','한국어'],['ja','日本語'],['vi','Tiếng Việt'],['th','ไทย'],['pt-BR','Português (Brasil)']];
export const videoTypes = ['fullMatch','singleGame','highlights','dayReplay'];
export const stages = ['playin','swiss','knockout'];
export function matchLocale(code) {
  const value=String(code||'').toLowerCase();
  if(value.startsWith('zh')) return /hant|tw|hk|mo/.test(value)?'zh-Hant':'zh-Hans';
  if(value.startsWith('pt')) return 'pt-BR';
  return languageMeta.find(([language])=>language.toLowerCase()===value||value.startsWith(`${language.toLowerCase()}-`))?.[0]||null;
}
export function dateKey(value=new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone}).formatToParts(new Date(value));
  const part=type=>parts.find(item=>item.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function displayDate(record,timeZone){
  // Convert actual timestamps, never invent midnight for a published calendar day.
  if(record.startAt&&record.datePrecision!=='day') return dateKey(record.startAt,timeZone);
  return record.scheduledDate||record.date||'';
}
export function nearestDate(dates,today=dateKey()){
  const sorted=[...new Set(dates.filter(Boolean))].sort();
  return sorted.filter(date=>date<=today).at(-1)||sorted[0]||'all';
}
export function commentaryKey(language,source){
  if(language==='zh-CN'||language==='zh-TW') return language;
  if(String(language).toLowerCase().startsWith('zh')){
    if(source?.region==='CN') return 'zh-CN';
    if(source?.region==='TW') return 'zh-TW';
    return 'zh';
  }
  return language;
}
export function matchingVideos(videos,filters,sourceMap){
  return videos.filter(video=>displayableVideo(video,sourceMap.get(video.sourceId))&&
    (filters.commentary==='all'||commentaryKey(video.language,sourceMap.get(video.sourceId))===filters.commentary)&&
    (!filters.type||filters.type==='all'||video.type===filters.type));
}
export function liveEntriesForMatch(match,broadcasts,sourceMap,commentary='all',verification={}){
  const ids=new Set(broadcasts.filter(day=>day.stage===match.stage&&day.date===match.scheduledDate).flatMap(day=>day.sourceIds||[]));
  return [...ids].map(id=>sourceMap.get(id)).filter(source=>source&&liveAddress(source)&&
    (commentary==='all'||commentaryKey(source.language,source)===commentary)).sort((a,b)=>compareSources(a,b,verification));
}
export function matchResources(match,filters,context){
  const sourceMap=context.sourceMap||new Map((context.sources||[]).map(source=>[source.id,source]));
  const videos=matchingVideos((context.videos||[]).filter(video=>video.matchId===match.id),{...filters,checks:context.checks,region:context.region,now:context.now},sourceMap);
  const liveEntries=liveEntriesForMatch(match,context.broadcasts||[],sourceMap,filters.commentary,context);
  return {videos,liveEntries,kind:videos.length?'replay':liveEntries.length?'live':'pending'};
}
export function filterMatches(matches,filters,context={}){
  const teamMap=context.teamMap||new Map((context.teams||[]).map(team=>[team.id,team]));
  const query=String(filters.search||'').trim().normalize('NFKC').toLocaleLowerCase();
  return matches.filter(match=>{
    const names=(match.teamIds||[]).map(id=>teamMap.get(id)).filter(Boolean).flatMap(team=>[team.name,team.code]).join(' ').normalize('NFKC').toLocaleLowerCase();
    const unknownTeam=(match.teamIds||[]).some(id=>id===null)&&['TBD',...(context.tbdLabels||[])].some(label=>String(label).trim().normalize('NFKC').toLocaleLowerCase()===query);
    return (!query||names.includes(query)||unknownTeam)&&(!filters.stage||filters.stage==='all'||match.stage===filters.stage)&&
      (!filters.date||filters.date==='all'||displayDate(match,context.timeZone)===filters.date)&&
      (!filters.availability||filters.availability==='all'||matchResources(match,filters,context).kind===filters.availability);
  });
}
