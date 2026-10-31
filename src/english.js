import './styles.css';
import './insights.css';
import './english.css';
import {legacyPath,viewQuery} from './search-routes.js';
import {shareMatch} from './share.js';
const root=document.querySelector('[data-page-type]');
document.querySelector('[data-share]')?.addEventListener('click',e=>shareMatch(e.currentTarget,{id:root.dataset.entityId,query:location.search}));
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
for(const el of document.querySelectorAll('[data-local-time]')){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(el.dateTime));
 const v=k=>parts.find(p=>p.type===k)?.value;el.textContent=`${v('year')}-${v('month')}-${v('day')} · ${v('hour')}:${v('minute')} ${zone}`;
}
document.querySelector('[data-ui-language]')?.addEventListener('change',e=>{
 try{localStorage.setItem('lol-esports-watch-hub.ui-language',e.target.value)}catch{}
 if(e.target.value!=='en')location.assign(legacyPath(root.dataset.pageType,root.dataset.entityId,location.search));
});
const form=document.querySelector('[data-schedule-filters]');
form?.addEventListener('submit',e=>e.preventDefault());
form?.addEventListener('input',()=>{let count=0;for(const row of document.querySelectorAll('[data-search]')){row.hidden=!row.dataset.search.includes(form.elements.team.value.toLowerCase())||(form.elements.stage.value!=='all'&&row.dataset.stage!==form.elements.stage.value);if(!row.hidden)count++}document.querySelector('[data-search-empty]').hidden=count>0});
const live=document.querySelector('[data-live-language]');
const filterLive=()=>document.querySelectorAll('[data-live-choice]').forEach(el=>el.hidden=el.dataset.liveChoice!==live.value);
if(live){live.addEventListener('change',filterLive);filterLive()}
const commentary=document.querySelector('[data-commentary]'),type=document.querySelector('[data-video-filter]');
function filterVideos(){
 const q=new URLSearchParams(location.search),game=q.get('game'),number=game?document.querySelector(`[data-game="${CSS.escape(game)}"]`)?.dataset.number:q.get('number');
 let count=0;for(const row of document.querySelectorAll('[data-video-language]')){row.hidden=(commentary.value!=='all'&&row.dataset.videoLanguage!==commentary.value)||(type.value!=='all'&&row.dataset.videoType!==type.value)||(number&&row.dataset.gameNumber&&row.dataset.gameNumber!==number);if(!row.hidden)count++}
 const empty=document.querySelector('[data-video-empty]');if(empty)empty.hidden=count>0||!document.querySelector('[data-video-language]');
}
function renderView(){
 const q=new URLSearchParams(location.search),view=q.get('view')==='analysis'?'analysis':'vod',game=q.get('game'),number=q.get('number');
 document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==view);
 document.querySelectorAll('[data-game]').forEach(el=>el.hidden=Boolean(game?el.dataset.game!==game:number&&el.dataset.number!==number));
 document.querySelectorAll('.search-view-tabs a').forEach(a=>{const v=new URL(a.href).searchParams.get('view');const params=new URLSearchParams(viewQuery(location.search));params.set('view',v);a.href='?'+params;a.setAttribute('aria-current',String(v===view))});
 document.querySelectorAll('.search-game-tabs a').forEach(a=>{const params=new URL(a.href).searchParams;params.set('view',view);a.href='?'+params;a.setAttribute('aria-current',String((params.get('game')||params.get('number'))===(game||number)))});
 if(commentary)filterVideos();
}
document.querySelectorAll('.search-view-tabs a,.search-game-tabs a').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();history.pushState(null,'',a.href);renderView()}));
window.addEventListener('popstate',renderView);
if(commentary){commentary.addEventListener('change',filterVideos);type.addEventListener('change',filterVideos);renderView()}
