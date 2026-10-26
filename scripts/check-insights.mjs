import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const words=read('src/insights-locales.json'),keys=Object.keys(words.en).sort();
assert.equal(Object.keys(words).length,8);
for(const [lang,dict]of Object.entries(words)){assert.deepEqual(Object.keys(dict).sort(),keys,lang+' missing translation');for(const value of Object.values(dict))assert.ok(typeof value==='string'&&value.trim());}
const tables=Object.fromEntries(['games','players','player-games','verification','regions','video-metrics'].map(k=>[k,read('public/data/'+k+'.json')]));
for(const [name,rows] of Object.entries(tables)){assert.ok(Array.isArray(rows),name);assert.ok(!/demo-|example\.invalid/.test(JSON.stringify(rows)),name+' contains demo records');}
for(const name of ['games','players','regions']){const ids=tables[name].map(r=>r.id);assert.ok(ids.every(Boolean),name+' missing ID');assert.equal(new Set(ids).size,ids.length,name+' duplicate ID');}
const gameIds=new Set(tables.games.map(r=>r.id)),playerIds=new Set(tables.players.map(r=>r.id)),rowIds=new Set();
for(const row of tables['player-games']){assert.ok(playerIds.has(row.playerId));assert.ok(row.gameId&&Number.isInteger(row.season));const id=row.gameId+':'+row.playerId;assert.ok(!rowIds.has(id),'duplicate player game');rowIds.add(id);for(const k of ['kills','deaths','assists'])assert.ok(row[k]===null||(Number.isInteger(row[k])&&row[k]>=0));assert.ok(/^https:\/\//.test(row.sourceUrl));}
for(const game of tables.games){assert.ok(game.matchId&&/^https:\/\//.test(game.sourceUrl));}
for(const check of tables.verification){assert.ok(check.target&&['live','vod'].includes(check.kind)&&Number.isFinite(Date.parse(check.checkedAt)));assert.ok(['passed','failed','pending'].includes(check.status));if(check.status==='passed')assert.ok(check.regionConfirmed&&check.region&&check.evidence&&check.environment?.browser&&check.environment?.network);}
for(const m of tables['video-metrics'])assert.ok(m.videoKey&&Number.isFinite(m.views)&&m.views>=0&&Number.isFinite(Date.parse(m.observedAt)));
console.log('Insights checks passed: eight translations, isolated production data, IDs and evidence.');
