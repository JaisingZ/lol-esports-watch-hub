import {readFileSync,writeFileSync,existsSync,unlinkSync,appendFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {extractGameDocument,extractStatsDocument} from './gol-browser-extract.js';
const cache='data-research/worlds-2026-games.json',raw=JSON.parse(readFileSync(cache,'utf8')),known=new Set(raw.map(g=>g.sourceUrl)),temp='data-research/.stats-candidate.json';
const matches=JSON.parse(readFileSync('public/data/matches.json','utf8')),games=JSON.parse(readFileSync('public/data/games.json','utf8'));
let browser;
const report=text=>{console.log(text);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n');};
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});const page=await browser.newPage();page.setDefaultNavigationTimeout(45000);const links=[];
 for(const tournament of ['Worlds 2026 Main Event','Worlds 2026 Play-In']){
  const response=await page.goto('https://gol.gg/tournament/tournament-matchlist/'+encodeURIComponent(tournament)+'/',{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('Stats index HTTP '+response?.status());
  const found=await page.locator('table a[href*="/game/stats/"]').evaluateAll(es=>es.map(a=>a.href));if(!found.length)throw Error('Empty tournament index');links.push(...found);
 }
 const urls=[];
 for(const url of [...new Set(links)]){
  if(url.includes('/page-game/')){urls.push(url);continue;}
  const firstUrl=url.replace('/page-summary/','/page-game/'),first=games.find(g=>g.sourceUrl===firstUrl),match=matches.find(m=>m.id===first?.matchId);
  if(first&&match?.status==='completed'&&games.filter(g=>g.matchId===match.id).length===match.scores.reduce((a,b)=>a+b,0))continue;
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('Series page unavailable');const found=await page.locator('a[href*="/page-game/"]').evaluateAll(es=>es.filter(a=>/Game \d+/i.test(a.textContent)).map(a=>a.href));if(!found.length)throw Error('Empty series');urls.push(...found);
 }
 const added=[];
 for(const url of [...new Set(urls)].filter(url=>!known.has(url))){
  let response=await page.goto(url,{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('Game page unavailable');const record=await page.evaluate(extractGameDocument);response=await page.goto(record.statsUrl,{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('Stats page unavailable');const stats=await page.evaluate(extractStatsDocument);record.stats=Object.fromEntries(['Player','Role','Kills','Deaths','Assists','CS','Golds','Total damage to Champion','Vision Score'].map(k=>[k,stats[k]]));added.push(record);
 }
 if(!added.length){report('Stats unchanged; retained existing games and player history.');}
 else{
  writeFileSync(temp,JSON.stringify([...raw,...added],null,2)+'\n');execFileSync(process.execPath,['scripts/import-gol.mjs',temp,'--install-cache'],{stdio:'inherit'});report('Imported '+added.length+' new games; official results and ten-player totals validated.');
 }
}catch(error){report('Stats source warning: '+error.message+'. Retained the last successful statistics; no empty overwrite.');}
finally{await browser?.close();if(existsSync(temp))unlinkSync(temp);}
