import config from '../config/site.json';
import words from './growth-locales.json';
import {createAnalytics} from './analytics-core.js';
import {BASE,ORIGIN,entityPath} from './search-routes.js';
import './growth.css';
export const commentaryPreference='lol-esports-watch-hub.commentary';
const consentKey='lol-esports-watch-hub.analytics-consent';
export const readPreference=key=>{try{return localStorage.getItem(key)}catch{return null}};
export const savePreference=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
export const growthText=(lang,key)=>words[lang]?.[key]||words.en[key];
export function preferredCommentary(available,fallback='all'){
 const preferred=readPreference(commentaryPreference);return available.includes(preferred)?preferred:fallback;
}
export function startGrowth(getPage){
 const id=config.gaMeasurementId;let tagLoaded=false;
 let debug=false;try{debug=sessionStorage.getItem('worlds.analytics.debug')==='1'}catch{}
 const live=location.hostname==='jaisingz.github.io',enabledId=(live||debug)?id:null;
 window['ga-disable-'+id]=true;
 function gtag(){window.dataLayer||=[];window.dataLayer.push(arguments)}
 const analytics=createAnalytics({id:enabledId,
  load(){
   window['ga-disable-'+id]=false;
   gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   gtag('consent','update',{analytics_storage:'granted'});gtag('js',new Date());
   gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_path:BASE,cookie_prefix:'worlds',debug_mode:debug});
   const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);script.dataset.hubAnalytics='true';document.head.append(script);tagLoaded=true;
  },
  emit(name,params){gtag('event',name,{...params,page_location:ORIGIN+params.canonical_path,page_referrer:safeReferrer(),debug_mode:debug})}
 });
 function safeReferrer(){try{const url=new URL(document.referrer);return url.origin+url.pathname}catch{return ''}}
 const bar=document.createElement('section');bar.className='consent-bar';bar.setAttribute('aria-label','Analytics preferences');bar.innerHTML='<p></p><button type="button" data-consent="granted"></button><button type="button" data-consent="denied"></button>';document.body.append(bar);
 const preferences=document.createElement('button');preferences.type='button';preferences.className='privacy-preferences';document.querySelector('footer')?.append(preferences);preferences.addEventListener('click',()=>{bar.hidden=false;bar.querySelector('button').focus()});
 function applyConsent(choice){
  window['ga-disable-'+id]=choice!=='granted';
  analytics.consent(choice);
  if(choice==='denied'&&tagLoaded){
   document.querySelector('[data-hub-analytics]')?.remove();
   // Removing a loaded script cannot unload its listeners. Reload after disabling it.
   location.reload();
  }
 }
 bar.addEventListener('click',e=>{const choice=e.target.dataset.consent;if(!choice)return;savePreference(consentKey,choice);bar.hidden=true;applyConsent(choice);preferences.focus()});
 let current;
 function refresh(){
  current=getPage();const lang=current?.lang||document.documentElement.lang||'en';
  bar.querySelector('p').textContent=growthText(lang,'consent');bar.querySelector('[data-consent=granted]').textContent=growthText(lang,'accept');bar.querySelector('[data-consent=denied]').textContent=growthText(lang,'reject');preferences.textContent=growthText(lang,'preferences');
  analytics.page(current);
  document.querySelectorAll('#commentary,#live-language,[data-filter=vodLanguage],[data-commentary],[data-live-language]').forEach(el=>el.dataset.previousLanguage=el.value);
 }
 bar.hidden=['granted','denied'].includes(readPreference(consentKey));refresh();applyConsent(readPreference(consentKey)||'unknown');
 window.addEventListener('hub:render',refresh);window.addEventListener('hashchange',refresh);window.addEventListener('popstate',refresh);
 document.addEventListener('click',e=>{const a=e.target.closest('a[data-watch]');if(!a)return;analytics.track('watch_click',{match_id:a.dataset.matchId||'',video_id:a.dataset.videoId||'',platform:a.dataset.platform||'',commentary_language:a.dataset.commentaryLanguage||'',video_type:a.dataset.videoType||'',entry_position:a.dataset.entryPosition||''})});
 document.addEventListener('change',e=>{
  if(!e.target.matches('#commentary,#live-language,[data-filter=vodLanguage],[data-commentary],[data-live-language]'))return;
  const from=e.target.dataset.previousLanguage||readPreference(commentaryPreference)||'all',to=e.target.value;
  savePreference(commentaryPreference,to);analytics.track('commentary_change',{from_language:from,to_language:to});
  window.dispatchEvent(new CustomEvent('hub:commentary',{detail:to}));e.target.dataset.previousLanguage=to;
 },true);
 window.addEventListener('hub:match-view',e=>analytics.track('match_view_change',e.detail));
 window.addEventListener('hub:share',e=>analytics.track('share_click',e.detail));
 return analytics;
}
export function legacyAnalyticsPage(lang){
 const [route]=(location.hash.slice(1)||'watch').split('?'),[type,encoded]=route.split('/');let id='';try{id=decodeURIComponent(encoded||'')}catch{}
 if(lang==='en'&&['watch','main','schedule','match','player'].includes(type))return null;
 return {lang,type:['match','player','schedule','players','hot'].includes(type)?type:'home',path:['match','player'].includes(type)?entityPath(type,id):type==='schedule'?entityPath('schedule'):BASE+'#'+(['players','hot'].includes(type)?type:'watch')};
}
