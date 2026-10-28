import {verifiedVideo} from './insights-model.js';
import {displayableVideo,liveAddress} from './watch-links.js';
import { installInsights } from './insights.js';
import insightWords from './insights-locales.json';
import messages from './locales.json';
import { languageMeta, stages, matchLocale, displayDate, nearestDate, commentaryKey, matchingVideos, matchResources, filterMatches } from './model.js';
import './styles.css';

const $=selector=>document.querySelector(selector);
const preferenceKey='lol-esports-watch-hub.ui-language';
let preference;try{preference=localStorage.getItem(preferenceKey)}catch{}
const state={lang:Object.hasOwn(messages,preference)?preference:(navigator.languages||[navigator.language]).map(matchLocale).find(Boolean)||'en',stage:'all',date:null,search:'',commentary:'all',type:'all',availability:'all',showScores:true,region:null,liveLanguage:null,expanded:new Set()};
const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
let content={teams:[],sources:[],matches:[],videos:[],broadcasts:[],checks:[],regions:[],meta:{}},status='loading',loading=false;
let teamMap=new Map(),sourceMap=new Map();
const context=()=>({...content,region:state.region,showScores:state.showScores,teamMap,sourceMap,timeZone,tbdLabels:Object.values(messages).map(dictionary=>dictionary.tbd)});
const it=key=>insightWords[state.lang]?.[key]||insightWords.en[key]||key;
const t=(key,values={})=>{let text=messages[state.lang][key]||messages.en[key]||key;for(const [name,value]of Object.entries(values))text=text.replaceAll('{'+name+'}',String(value));return text};
const node=(tag,className='',text='')=>{const element=document.createElement(tag);element.className=className;element.textContent=text;return element};
const svg=id=>{const element=document.createElementNS('http://www.w3.org/2000/svg','svg');element.classList.add('icon');element.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+id);element.append(use);return element};
const option=(value,label)=>{const element=node('option','',label);element.value=value;return element};
const external=(url,label,className='')=>{const element=node('a',className,label);element.href=url;element.target='_blank';element.rel='noopener noreferrer';return element};
const formatDate=(date,options={month:'short',day:'numeric',weekday:'short'})=>new Intl.DateTimeFormat(state.lang,{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const formatTimestamp=(date,options={dateStyle:'medium',timeStyle:'short'})=>date&&Number.isFinite(Date.parse(date))?new Intl.DateTimeFormat(state.lang,{...options,timeZone}).format(new Date(date)):t('unknownTime');
function audioName(key){if(key==='zh-CN')return t('cnCommentary');if(key==='zh-TW')return t('twCommentary');if(key==='zh')return t('zhUnspecified');try{return new Intl.DisplayNames([state.lang],{type:'language'}).of(key)||key}catch{return key}}
function roundLabel(match){const round=String(match.round||'');const number=round.match(/(?:round|r)\s*(\d+)/i);if(number)return t('roundNumber',{number:number[1]});if(/quarter/i.test(round))return t('quarterfinals');if(/semi/i.test(round))return t('semifinals');if(/final/i.test(round))return t('final');return ''}
function statusBadge(value){return node('span','status status-'+value,t(['scheduled','live','completed','postponed','cancelled','ended'].includes(value)?value:'unknown'))}
function logo(team,featured=false){
  const fallback=()=>node('span','team-fallback',team?.code?.slice(0,3)||'?');
  if(!team?.logo)return fallback();
  const image=node('img','team-logo');image.src=import.meta.env.BASE_URL+team.logo.replace(/^\/+/, '');image.alt='';image.width=featured?56:36;image.height=featured?56:36;image.decoding='async';image.addEventListener('error',()=>image.replaceWith(fallback()),{once:true});return image;
}
function teamBlock(id,featured=false){const team=teamMap.get(id);const element=node('div',featured?'featured-team':'match-team');const names=node('div','team-names');names.append(node('span','team-code',team?.code||t('tbd')));if(team?.name&&team.name!==team.code)names.append(node('span','team-full-name',team.name));element.append(logo(team,featured),names);return element}
function scoreText(match){return state.showScores&&Array.isArray(match.scores)&&match.scores.length===2&&match.scores.every(Number.isFinite)?match.scores.join(' : '):t('versus')}
function liveLink(source){const element=external(liveAddress(source),'','live-link');element.append(node('span','',audioName(commentaryKey(source.language,source))),node('span','platform',source.platform),svg('arrow-icon'));element.title=source.name;return element}
function videoLink(video){
  const label=video.isSegment?([video.gameNumber?t('gameNumber',{number:video.gameNumber}):'',t('locateGame')].filter(Boolean).join(' · ')):video.type==='singleGame'?t('gameNumber',{number:video.gameNumber||''}):t(video.type);
  const wrapper=node('div','video-entry'),element=external(video.url,'','video-link');
  element.append(svg('play-icon'),node('span','',label),node('span','platform',sourceMap.get(video.sourceId)?.platform||''),svg('arrow-icon'));
  wrapper.append(element);
  return wrapper;
}
function fillSelect(id,entries,value){$(id).replaceChildren(...entries.map(([key,label])=>option(key,label)));$(id).value=value}
function populateFilters(){
  const audio=[...new Set([...content.sources.map(source=>commentaryKey(source.language,source)),...content.videos.map(video=>commentaryKey(video.language,sourceMap.get(video.sourceId)))])].filter(Boolean);
  const scoped=filterMatches(content.matches,{...state,commentary:'all',availability:'all'},context());
  const entries=[['all',t('allLanguages')],...audio.map(key=>{
    const videos=new Set(),channels=new Set();
    for(const match of scoped){const resources=matchResources(match,{...state,commentary:key},context());resources.videos.forEach(video=>videos.add(video.id));resources.liveEntries.forEach(source=>channels.add(source.id))}
    return [key,audioName(key)+' · '+t('languageCounts',{videos:videos.size,channels:channels.size})];
  })];
  fillSelect('#commentary',entries,state.commentary);
  fillSelect('#video-type',[['all',t('allTypes')],...['fullMatch','singleGame','highlights'].map(type=>[type,t(type)])],state.type);
}
function stageMatches(){return content.matches.filter(match=>state.stage==='all'||match.stage===state.stage)}
function availableDates(){return [...new Set([...stageMatches().map(match=>displayDate(match,timeZone)),...content.broadcasts.filter(day=>state.stage==='all'||day.stage===state.stage).map(day=>displayDate(day,timeZone))])].filter(Boolean).sort()}
function renderStageTabs(){
  const tabs=$('#stage-tabs');tabs.replaceChildren();tabs.setAttribute('aria-label',t('stage'));
  for(const value of ['all',...stages]){const count=value==='all'?content.matches.length:content.matches.filter(match=>match.stage===value).length;const button=node('button','stage-tab');button.type='button';button.dataset.stage=value;button.setAttribute('aria-pressed',String(value===state.stage));button.append(node('span','',t(value==='all'?'allStages':value)),node('span','tab-count',String(count)));button.addEventListener('click',()=>{state.stage=value;state.date=nearestDate(availableDates());state.availability='all';renderAll();scrollSelectedDate()});tabs.append(button)}
}
function renderDates(){
  const dates=availableDates(),track=$('#date-track');const position=track.scrollLeft;track.replaceChildren();
  for(const value of ['all',...dates]){const button=node('button','date-button');button.type='button';button.dataset.date=value;button.setAttribute('aria-pressed',String(value===state.date));button.append(node('span','date-number',value==='all'?t('allDates'):formatDate(value,{month:'short',day:'numeric'})),node('span','date-weekday',value==='all'?String(stageMatches().length):formatDate(value,{weekday:'short'})));button.addEventListener('click',()=>{state.date=value;state.availability='all';renderAll()});track.append(button)}track.scrollLeft=position;
}
function scrollSelectedDate(){requestAnimationFrame(()=>{const track=$('#date-track'),selected=track.querySelector('[aria-pressed=true]');if(selected)track.scrollLeft=Math.max(0,selected.offsetLeft-track.offsetLeft-track.clientWidth/2+selected.clientWidth/2)})}
function featuredMatch(){const items=stageMatches().filter(match=>state.date==='all'||displayDate(match,timeZone)===state.date);return items.find(match=>match.status==='live')||items.find(match=>match.status==='scheduled')||items.at(-1)||null}
function renderFeatured(){
  const match=featuredMatch(),container=$('#featured-match'),channels=$('#hero-channels');container.replaceChildren();channels.replaceChildren();
  const preferred=state.liveLanguage||({'zh-Hans':'zh-CN','zh-Hant':'zh-TW'}[state.lang]||state.lang);
  const entries=match?matchResources(match,{...state,commentary:'all'},context()).liveEntries:[];
  const languages=[...new Set([preferred,...entries.map(source=>commentaryKey(source.language,source))])];
  fillSelect('#live-language',languages.map(key=>[key,audioName(key)]),preferred);
  $('#featured-label').textContent=match?t(match.status==='live'?'liveMatch':match.status==='scheduled'?'nextMatch':'recentMatch'):'';
  if(!match){container.append(node('p','hero-empty',t(status==='loading'?'loading':'featuredEmpty')));channels.append(node('span','hero-empty',it('noSource')));return}
  const duel=node('div','featured-duel');const center=node('div','featured-center',scoreText(match));if(match.bestOf)center.append(node('span','match-format',t('bestOf',{count:match.bestOf})));duel.append(teamBlock(match.teamIds[0],true),center,teamBlock(match.teamIds[1],true));container.append(duel);
  const meta=node('div','featured-meta');meta.append(statusBadge(match.status),node('span','',t(match.stage)),node('span','',match.startAt?formatTimestamp(match.startAt):formatDate(match.scheduledDate)+' · '+t('dateOnly',{zone:match.dateTimezone})));const round=roundLabel(match);if(round)meta.append(node('span','',round));container.append(meta);
  const selected=entries.filter(source=>commentaryKey(source.language,source)===preferred);
  for(const source of selected)channels.append(liveLink(source));
  if(!selected.length)channels.append(node('span','hero-empty',it('noSource')));
}
function baseMatches(){return filterMatches(content.matches,{...state,availability:'all'},context())}
function renderResourceTabs(){
  const base=baseMatches(),counts={all:base.length,replay:0,live:0,pending:0};for(const match of base)counts[matchResources(match,state,context()).kind]++;
  const holder=$('#resource-tabs');holder.replaceChildren();
  for(const [value,key]of [['all','allResources'],['replay','withReplay'],['live','liveOnly'],['pending','pendingOnly']]){const button=node('button','resource-tab');button.type='button';button.dataset.availability=value;button.setAttribute('aria-pressed',String(state.availability===value));button.append(node('span','',t(key)),node('span','resource-count',String(counts[value])));button.addEventListener('click',()=>{state.availability=value;renderAll()});holder.append(button)}
}
function videoGroups(videos){const groups=new Map();for(const video of videos){const key=commentaryKey(video.language,sourceMap.get(video.sourceId));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(video)}return groups}
function videoDetail(videos){
  const fragment=document.createDocumentFragment();
  for(const [language,items]of videoGroups(videos)){
    const group=node('section','detail-group'),title=node('h4','detail-heading',audioName(language));
    title.append(node('span','detail-count',t('replayCount',{count:items.length})));group.append(title);
    const links=node('div','video-links');
    for(const video of [...items].sort((a,b)=>(a.gameNumber||0)-(b.gameNumber||0)))links.append(videoLink(video));
    group.append(links);
    fragment.append(group);
  }
  return fragment;
}
function createMatch(match,index){
  const resource=matchResources(match,state,context()),expanded=state.expanded.has(match.id),card=node('article','match-row');card.dataset.matchId=match.id;card.dataset.status=match.status;
  const summary=node('button','match-summary');summary.type='button';summary.setAttribute('aria-expanded',String(expanded));summary.setAttribute('aria-controls','match-detail-'+index);summary.title=t(expanded?'collapseMatch':'expandMatch');
  const info=node('div','match-context');info.append(node('span','match-hour',match.startAt?formatTimestamp(match.startAt,{hour:'2-digit',minute:'2-digit',hour12:false}):t('unknownTime')),statusBadge(match.status));
  const duel=node('div','match-duel');duel.append(teamBlock(match.teamIds[0]),node('span','match-middle'+(state.showScores&&Array.isArray(match.scores)?' scores':''),scoreText(match)),teamBlock(match.teamIds[1]));
  const resources=node('div','match-resources');const resourceText=resource.kind==='replay'?t('replayCount',{count:resource.videos.length}):resource.kind==='live'?t('liveOnly'):t('pendingOnly');resources.append(node('span','resource-state '+resource.kind,resourceText),node('span','match-resource-caption',[roundLabel(match),match.bestOf?t('bestOf',{count:match.bestOf}):t(match.stage)].filter(Boolean).join(' · ')));
  const chevron=svg('chevron-icon');chevron.classList.add('expand-chevron');summary.append(info,duel,resources,chevron);card.append(summary);
  const detail=node('div','match-detail');detail.id='match-detail-'+index;detail.hidden=!expanded;
  if(resource.videos.length)detail.append(videoDetail(resource.videos));else detail.append(node('p','detail-pending',(state.commentary==='all'?'':audioName(state.commentary)+' · ')+t('pendingDescription')));
  if(resource.liveEntries.length){const live=node('section','detail-live');live.append(node('h4','detail-heading',t('liveEntries')));const links=node('div','video-links');resource.liveEntries.forEach(source=>links.append(liveLink(source)));live.append(links);detail.append(live)}
  const detailLink=node('a','match-data-link',it('details')+' ↗');detailLink.href='#match/'+encodeURIComponent(match.id)+'?view=analysis';card.append(detailLink);
  const source=node('div','detail-source');source.append(external(match.sourceUrl,t('matchSource')+' ↗'),node('span','',t('updated',{date:formatTimestamp(match.verifiedAt)})));if(match.datePrecision==='day')source.append(node('span','',t('dateOnly',{zone:match.dateTimezone})));card.append(detail);
  summary.addEventListener('click',()=>{const next=!state.expanded.has(match.id);if(next)state.expanded.add(match.id);else state.expanded.delete(match.id);summary.setAttribute('aria-expanded',String(next));summary.title=t(next?'collapseMatch':'expandMatch');detail.hidden=!next});return card;
}
function renderMatches(){
  const found=filterMatches(content.matches,state,context()).sort((a,b)=>(a.startAt||a.scheduledDate).localeCompare(b.startAt||b.scheduledDate));const groups=new Map();for(const match of found){const date=displayDate(match,timeZone);if(!groups.has(date))groups.set(date,[]);groups.get(date).push(match)}
  const list=$('#match-list');list.replaceChildren();let index=0;
  for(const [date,items]of [...groups.entries()].sort(([a],[b])=>b.localeCompare(a))){const group=node('section','date-group');const title=node('h3','date-group-heading',date+' · '+formatDate(date,{weekday:'long'}));title.append(node('span','',t('dateMatches',{count:items.length})));group.append(title,...items.map(match=>createMatch(match,index++)));list.append(group)}
  list.hidden=status!=='ready'||found.length===0;$('#empty').hidden=status==='ready'&&found.length>0;
  $('#empty-title').textContent=t(status==='loading'?'loading':status==='error'?'loadError':content.matches.length?'emptyTitle':'noMatchesTitle');
  $('#empty-description').textContent=status==='ready'?t(content.matches.length?'emptyDescription':'noMatchesDescription'):'';
  $('#reset-empty').hidden=status!=='ready'||!content.matches.length;$('#retry').hidden=status!=='error';
  $('#result-count').textContent=status==='ready'?t('results',{count:found.length}):t(status==='error'?'loadError':'loading');
  $('#coverage-count').textContent=status==='ready'?t('coverageCount',{count:content.matches.length,total:content.meta.officialPublishedMatchCount??content.matches.length}):t('loading');
  $('#date-hint').textContent=t('dateHintShort',{zone:timeZone});$('#date-hint').title=t('dateHint',{zone:timeZone});
}
function renderDayReplays(){
  const holder=$('#day-replay-list');holder.replaceChildren();if(status!=='ready'){return}
  const broadcasts=content.broadcasts.filter(day=>(state.stage==='all'||day.stage===state.stage)&&(state.date==='all'||displayDate(day,timeZone)===state.date));let count=0;
  for(const day of broadcasts){const videos=matchingVideos(content.videos.filter(video=>video.broadcastId===day.id&&video.type==='dayReplay'),{...state,type:'dayReplay',checks:content.checks,region:state.region},sourceMap);if(!videos.length)continue;count++;
    const card=node('article','day-replay-card'),info=node('div','day-replay-info'),icon=node('span','day-icon');icon.append(svg('play-icon'));const text=node('div','');text.append(node('h3','',formatDate(displayDate(day,timeZone))+' · '+t(day.stage)),node('p','',t('dayReplay')));info.append(icon,text);card.append(info);const links=node('div','video-links');for(const video of videos){const item=videoLink(video);item.prepend(node('span','',audioName(commentaryKey(video.language,sourceMap.get(video.sourceId)))));links.append(item)}card.append(links);holder.append(card)
  }
  if(!count){const empty=node('div','day-replay-card'),info=node('div','day-replay-info'),icon=node('span','day-icon');icon.append(svg('play-icon'));const text=node('div');text.append(node('h3','',t('dayReplayEmpty')),node('p','',t('dayReplayNote')));info.append(icon,text);empty.append(info);holder.append(empty)}
}
function renderSources(){const holder=$('#source-list');holder.replaceChildren();const available=content.sources.filter(source=>liveAddress(source)||content.videos.some(v=>v.sourceId===source.id&&displayableVideo(v,source)));if(!available.length)holder.append(node('p','',it('noSource')));for(const source of available){const item=node('div','source-item');item.append(node('strong','',source.name),node('p','',source.platform+' · '+audioName(source.language)),node('p','verification',it('playbackPending')));holder.append(item)}$('#updated').textContent=content.meta.updatedAt?t('updated',{date:formatTimestamp(content.meta.updatedAt)}):''}

function renderAll(){document.documentElement.lang=state.lang;$('#ui-language').value=state.lang;document.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n)});$('#search').placeholder=t('searchPlaceholder');$('#reset').title=t('clear');$('#reset').setAttribute('aria-label',t('clear'));$('#date-previous').setAttribute('aria-label',t('previousDates'));$('#date-next').setAttribute('aria-label',t('nextDates'));$('#scores-toggle').setAttribute('aria-pressed',String(state.showScores));$('#scores-toggle span').textContent=t(state.showScores?'hideScores':'showScores');populateFilters();renderStageTabs();renderDates();renderFeatured();renderResourceTabs();renderMatches();renderDayReplays();renderSources();window.dispatchEvent(new Event('hub:render'))}
function resetFilters(){Object.assign(state,{stage:'all',date:'all',search:'',commentary:'all',type:'all',availability:'all'});$('#search').value='';renderAll();$('#search').focus()}
async function loadContent(){if(loading)return;loading=true;status='loading';renderAll();try{const names=['teams','sources','matches','videos','broadcasts','meta','verification','regions'];const records=await Promise.all(names.map(async name=>{const response=await fetch(import.meta.env.BASE_URL+'data/'+name+'.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(name);const result=await response.json();if(name==='meta'?result?.schemaVersion!==2:!Array.isArray(result))throw new Error('Schema');return result}));content=Object.fromEntries(names.map((name,index)=>[name==='verification'?'checks':name,records[index]]));if(!content.regions.some(r=>r.id===state.region))state.region=window.__HUB_DEMO__?(content.regions[0]?.id||null):null;teamMap=new Map(content.teams.map(team=>[team.id,team]));sourceMap=new Map(content.sources.map(source=>[source.id,source]));if(state.date===null||state.date!=='all'&&!availableDates().includes(state.date))state.date=nearestDate(availableDates());status='ready'}catch{content={teams:[],sources:[],matches:[],videos:[],broadcasts:[],checks:[],regions:[],meta:{}};teamMap=new Map();sourceMap=new Map();status='error'}finally{loading=false;renderAll();scrollSelectedDate()}}
$('#ui-language').replaceChildren(...languageMeta.map(([code,name])=>option(code,name)));$('#ui-language').addEventListener('change',event=>{state.lang=event.target.value;try{localStorage.setItem(preferenceKey,state.lang)}catch{}renderAll();scrollSelectedDate()});
$('#live-language').addEventListener('change',event=>{state.liveLanguage=event.target.value;renderFeatured()});
$('#search').addEventListener('input',event=>{state.search=event.target.value;populateFilters();renderResourceTabs();renderMatches()});
for(const [id,key]of [['commentary','commentary'],['video-type','type']])$('#'+id).addEventListener('change',event=>{state[key]=event.target.value;state.availability='all';renderAll()});
$('#filters').addEventListener('submit',event=>event.preventDefault());$('#reset').addEventListener('click',resetFilters);$('#reset-empty').addEventListener('click',resetFilters);$('#retry').addEventListener('click',loadContent);
$('#scores-toggle').addEventListener('click',()=>{state.showScores=!state.showScores;renderAll()});$('#recent-date').addEventListener('click',()=>{state.date=nearestDate(availableDates());state.availability='all';renderAll();scrollSelectedDate()});
for(const [id,direction]of [['date-previous',-1],['date-next',1]])$('#'+id).addEventListener('click',()=>$('#date-track').scrollBy({left:direction*300,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(scrollSelectedDate,100)});

installInsights(()=>({...context(),lang:state.lang,translate:t,demo:Boolean(window.__HUB_DEMO__),setRegion:value=>{state.region=value;renderAll()}}));
setInterval(()=>{if(status==='ready')renderAll()},60000);
renderAll();loadContent();
