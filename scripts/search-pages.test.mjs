import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const routes=await import('../src/search-routes.js').catch(()=>({}));
const pages=await import('./search-pages.mjs').catch(()=>({}));
const data=Object.fromEntries(await Promise.all(['matches','teams','players','player-games','games','videos','sources','broadcasts'].map(async k=>[k,JSON.parse(await readFile(`public/data/${k}.json`,'utf8'))])));
test('stable entity paths encode original IDs without name dependencies',()=>{
 assert.equal(typeof routes.entityPath,'function');
 assert.equal(routes.entityPath('match','official:123'),'/lol-esports-watch-hub/en/worlds/2026/matches/id-6f6666696369616c3a313233/');
 assert.match(routes.entityPath('player','id/with?symbols'),/\/players\/id-[0-9a-f]+\/$/);
});
test('legacy English match route preserves game and analysis, drops unrelated input',()=>{
 assert.equal(typeof routes.legacyTarget,'function');
 const manifest=[{type:'match',id:'official:123',path:routes.entityPath('match','official:123')}];
 assert.equal(routes.legacyTarget('#match/official%3A123?view=analysis&game=gol%3A5&q=private','en',manifest),manifest[0].path+'?view=analysis&game=gol%3A5');
 assert.equal(routes.legacyTarget('#match/official%3A123','zh-Hans',manifest),null);
 assert.equal(routes.legacyTarget('#match/missing','en',manifest),null);
});
test('English match HTML contains real links and stats without JavaScript',()=>{
 assert.equal(typeof pages.createPages,'function');
 const all=pages.createPages(data);const m=data.matches.find(m=>data.games.some(g=>g.matchId===m.id));
 const page=all.find(p=>p.type==='match'&&p.id===m.id);
 assert.match(page.body,/<h1>/);assert.match(page.body,/Replays/);assert.match(page.body,/K \/ D \/ A/);
 assert.ok(page.body.includes(data.videos.find(v=>v.matchId===m.id).url.replaceAll('&','&amp;')));
 assert.ok(all.some(p=>p.type==='team')&&all.some(p=>p.type==='player'));
 assert.equal(new Set(all.map(p=>p.path)).size,all.length);
});
test('unknown opponents are accessible but not indexed; no phantom team/player pages',()=>{
 assert.equal(typeof pages.createPages,'function');
 const all=pages.createPages({...data,matches:[{...data.matches[0],id:'tbd',teamIds:['unknown','unknown']}],players:[]});
 assert.equal(all.find(p=>p.id==='tbd').indexable,false);
 assert.equal(all.filter(p=>p.type==='team'||p.type==='player').length,0);
});
test('unchanged rendered content retains lastmod even when verification timestamp changes',()=>{
 assert.equal(typeof pages.updateIndex,'function');
 const p={path:'/x/',type:'match',id:'x',title:'x',description:'x',body:'same',indexable:true};
 const first=pages.updateIndex([p],{},'2026-10-25T00:00:00Z');
 const second=pages.updateIndex([p],first,'2026-10-31T00:00:00Z');
 assert.equal(second['/x/'].lastmod,first['/x/'].lastmod);
 assert.notEqual(pages.updateIndex([{...p,body:'new'}],first,'2026-10-31T00:00:00Z')['/x/'].lastmod,first['/x/'].lastmod);
});
