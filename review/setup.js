import data from './fixture.js';
import words from '../src/insights-locales.json';
window.__HUB_DEMO__=true;
const nativeFetch=window.fetch.bind(window);
window.fetch=async(url,options)=>{const match=String(url).match(/data\/([a-z-]+)\.json/);if(match&&data[match[1]])return new Response(JSON.stringify(data[match[1]]),{status:200,headers:{'Content-Type':'application/json'}});return nativeFetch(url,options)};
const banner=document.createElement('div');banner.className='demo-banner';document.body.prepend(banner);
function render(){const lang=document.documentElement.lang,dict=words[lang]||words.en;banner.replaceChildren();const title=document.createElement('strong');title.textContent=dict.demo;banner.append(title);for(const [hash,key]of [['match/demo-series','details'],['players','players'],['player/demo-player-2','profile'],['hot','hot']]){const a=document.createElement('a');a.href='#'+hash;a.textContent=dict[key];banner.append(a)}banner.title=dict.reviewNote;}
window.addEventListener('hub:render',render);render();
document.addEventListener('click',e=>{const link=e.target.closest('a');if(link&&/^https?:/.test(link.getAttribute('href')||'')){e.preventDefault()}},true);
if(!location.hash)location.hash='match/demo-series';
