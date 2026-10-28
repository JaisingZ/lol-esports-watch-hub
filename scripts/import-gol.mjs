import {readFileSync,existsSync} from 'node:fs';
import {commitFiles} from './sync-official.mjs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const raw=read(process.argv[2]||'data-research/worlds-2026-games.json');
const matches=read('public/data/matches.json'),teams=read('public/data/teams.json');
const normal=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={'cloud9':'C9','geng':'GEN','teamliquid':'TLAW','losgrandes':'LOS','anyoneslegend':'AL'};
const teamFor=name=>{const key=normal(name),found=teams.filter(t=>normal(t.name)===key||normal(t.code)===key||t.code===aliases[key]);assert.equal(found.length,1,'Unmapped team '+name);return found[0];};
const champ=s=>({"Wukong":"MonkeyKing","Renata Glasc":"Renata","Jarvan IV":"JarvanIV","K'Sante":"KSante","Rek'Sai":"RekSai","Kai'Sa":"Kaisa","Kha'Zix":"Khazix","Vel'Koz":"Velkoz","Cho'Gath":"Chogath","Bel'Veth":"Belveth","LeBlanc":"Leblanc","Nunu & Willump":"Nunu"}[s]||({'KhaZix':'Khazix','VelKoz':'Velkoz'}[s.replace(/[ .']/g,'')]||s.replace(/[ .']/g,'')));
const roles={JUNGLE:'JGL',ADC:'BOT',SUPPORT:'SUP',TOP:'TOP',MID:'MID'};
const players=new Map(),games=[],rows=[],seen=new Set(),now=new Date().toISOString();
for(const source of raw){
 const id='gol:'+source.sourceUrl.match(/stats\/(\d+)/)[1];assert.ok(!seen.has(id),'Duplicate game '+id);seen.add(id);
 const blue=teamFor(source.blue.name),red=teamFor(source.red.name);
 const found=matches.filter(m=>m.season===2026&&m.scheduledDate===source.date&&m.teamIds.includes(blue.id)&&m.teamIds.includes(red.id));assert.equal(found.length,1,'Ambiguous official match '+source.title);const match=found[0];
 assert.equal(source.rows.length,10);assert.ok(source.patch&&source.duration&&source.number);assert.notEqual(source.blue.winner,source.red.winner);
 const [minutes,seconds]=source.duration.split(':').map(Number);
 const game={id,matchId:match.id,number:source.number,patch:source.patch,durationSeconds:minutes*60+seconds,winner:source.blue.winner?'blue':'red',sourceUrl:source.sourceUrl,statsSourceUrl:source.statsUrl,verifiedAt:now};
 for(const [i,player]of source.rows.entries()){
  assert.equal(source.stats.Player[i],player.name,'Player columns shifted');const side=player.side,team=side==='blue'?blue:red;
  const value=key=>{const cell=source.stats[key]?.[i];if(cell===undefined||cell==='')return null;const n=Number(cell);assert.ok(Number.isFinite(n)&&n>=0,key);return n;};
  const [kills,deaths,assists]=player.kda.split('/').map(Number);assert.equal(kills,value('Kills'));assert.equal(deaths,value('Deaths'));assert.equal(assists,value('Assists'));assert.equal(player.cs,value('CS'));
  const role=roles[source.stats.Role[i]];assert.ok(role,'Unknown role');
  const old=players.get(player.id);if(old)assert.equal(old.teamId,team.id,'Multiple current teams');
  players.set(player.id,{id:player.id,name:player.name,aliases:[...new Set([...(old?.aliases||[]),player.name])],worlds2026:true,role,teamId:team.id,teamName:team.name,sourceUrl:player.sourcePlayerUrl});
  rows.push({gameId:id,matchId:match.id,playerId:player.id,season:2026,stage:match.stage,date:source.date,teamId:team.id,teamName:team.name,side,role,durationSeconds:game.durationSeconds,champion:champ(player.champion),kills,deaths,assists,cs:player.cs,gold:value('Golds'),damage:value('Total damage to Champion'),vision:value('Vision Score'),win:source[side].winner,sourceUrl:source.statsUrl});
 }
 for(const [side,team]of [['blue',blue],['red',red]]){
  const s=source[side],sideRows=rows.filter(r=>r.gameId===id&&r.side===side);assert.equal(sideRows.length,5);assert.equal(sideRows.reduce((a,r)=>a+r.kills,0),Number(s.scores.Kills),'Team kills mismatch');
  game[side]={name:team.name,teamId:team.id,picks:sideRows.map(r=>r.champion),bans:s.bans.map(champ),kills:Number(s.scores.Kills),gold:sideRows.every(r=>r.gold!==null)?sideRows.reduce((a,r)=>a+r.gold,0):null,towers:Number(s.scores.Towers),dragons:Number(s.scores.Dragons),barons:Number(s.scores.Nashor)};
 }
 for(const side of ['blue','red']){const opponent=side==='blue'?'red':'blue',deaths=rows.filter(r=>r.gameId===id&&r.side===side).reduce((a,r)=>a+r.deaths,0);assert.ok(deaths>=game[opponent].kills,'Deaths below opponent kills '+id);game[side].deaths=deaths;game[side].deathsWithoutOpponentKill=deaths-game[opponent].kills;}games.push(game);
}
for(const m of matches.filter(m=>m.status==='completed')){const g=games.filter(g=>g.matchId===m.id);assert.equal(g.length,m.scores.reduce((a,b)=>a+b,0),'Incomplete series '+m.id);for(const [i,team]of m.teamIds.entries())assert.equal(g.filter(g=>g[g.winner].teamId===team).length,m.scores[i],'Official result mismatch '+m.id);}
const history=existsSync('data-research/worlds-player-history.json')?read('data-research/worlds-player-history.json').filter(r=>players.has(r.playerId)&&r.season<2026):[];
for(const row of history){assert.ok(row.sourcePlayerId&&Number.isInteger(row.kills)&&Number.isInteger(row.deaths)&&Number.isInteger(row.assists));const p=players.get(row.playerId);p.aliases=[...new Set([...p.aliases,row.sourcePlayerName])];}
const portraits=existsSync('data-research/player-portraits.json')?read('data-research/player-portraits.json'):{};for(const p of players.values())if(portraits[p.id])p.portrait=portraits[p.id].path;
const allRows=[...rows,...history],rowKeys=allRows.map(r=>r.gameId+':'+r.playerId);assert.equal(new Set(rowKeys).size,rowKeys.length,'Duplicate player game');
const coverage={updatedAt:now,season:2026,completedSeries:matches.filter(m=>m.status==='completed').length,coveredSeries:new Set(games.map(g=>g.matchId)).size,games:games.length,players:players.size,playerGameRows:rows.length,historicalPlayerGameRows:history.length,historyYears:[...new Set(allRows.map(r=>r.season))].sort(),historicalComplete:false,source:'https://gol.gg/',missingFields:['Historical stage not inferred; pre-2014 games not covered; source damage rounding can differ by 1–2 units']};
const files=Object.entries({games,players:[...players.values()],'player-games':allRows,'stats-coverage':coverage}).map(([name,value])=>['public/data/'+name+'.json',JSON.stringify(value,null,2)+'\n']);
if(process.argv.includes('--install-cache'))files.push(['data-research/worlds-2026-games.json',JSON.stringify(raw,null,2)+'\n']);
for(const game of games)for(const side of ['blue','red'])for(const name of [...game[side].picks,...game[side].bans]){const path='public/champions/'+game.patch+'/'+name+'.png';if(existsSync(path)||files.some(([p])=>p===path))continue;assert.ok(/^\d+\.\d+\.\d+$/.test(game.patch)&&/^[A-Za-z0-9]+$/.test(name));const response=await fetch('https://ddragon.leagueoflegends.com/cdn/'+game.patch+'/img/champion/'+name+'.png',{signal:AbortSignal.timeout(30000)});assert.ok(response.ok,'Missing champion asset '+name);const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Invalid image');files.push([path,bytes]);}
await commitFiles(files);
console.log(JSON.stringify(coverage));
