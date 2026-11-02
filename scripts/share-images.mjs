import sharp from 'sharp';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {BASE} from '../src/search-routes.js';
import {esc} from './search-pages.mjs';
import {sharePath} from './search-seo.mjs';
let background;
export async function shareImage(p){
 background||=await sharp('src/assets/rift-desktop.webp').resize(1200,630,{fit:'cover'}).png().toBuffer();
 const title=p.shareTitle||({home:'WORLDS 2026',schedule:'SCHEDULE & RESULTS'}[p.type])||p.title;
 const subtitle=p.shareSubtitle||({home:'Every match. Your language.',team:'Roster · Matches · Replays',player:'Stats · Worlds history · Replays',schedule:'Play-In · Swiss Stage · Knockouts'}[p.type]);
 const fontSize=title.length>33?38:title.length>22?50:64;
 const overlay=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="shade"><stop stop-color="#0b0e18" stop-opacity=".97"/><stop offset="1" stop-color="#160d29" stop-opacity=".65"/></linearGradient></defs><rect width="1200" height="630" fill="url(#shade)"/><path d="M60 80H1140M60 560H1140" stroke="#818ab2" stroke-opacity=".6"/><text x="64" y="58" fill="#c5d0ff" font-family="sans-serif" font-size="22" letter-spacing="4">LoL ESPORTS / WATCH HUB</text><text x="64" y="170" fill="#d2b1ed" font-family="sans-serif" font-size="22" letter-spacing="3">WORLDS 2026</text><text x="64" y="${p.shareImages?.length?375:300}" fill="#fff" font-family="sans-serif" font-weight="bold" font-size="${fontSize}">${esc(title)}</text><text x="64" y="${p.shareImages?.length?430:365}" fill="#c1c8df" font-family="sans-serif" font-size="25">${esc(subtitle)}</text><text x="64" y="535" fill="#b8c2ff" font-family="sans-serif" font-size="21">REPLAYS · MATCH STATS</text></svg>`;
 const layers=[{input:Buffer.from(overlay),left:0,top:0}];
 for(const [i,file]of(p.shareImages||[]).slice(0,2).entries()){
  const input=await sharp(path.join('public',file)).resize(105,120,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();layers.push({input,left:64+i*155,top:205});
 }
 const file=path.join('dist',sharePath(p).slice(BASE.length));await mkdir(path.dirname(file),{recursive:true});
 await sharp(background).composite(layers).png().toFile(file);
}
