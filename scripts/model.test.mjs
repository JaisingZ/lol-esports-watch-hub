import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,unlink,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseOfficial,extractObjects,decodeFlight,dateInZone,officialVideos,makeBroadcasts} from './official-parser.mjs';
import {validateDataset} from './content-validation.mjs';
import {buildCandidate,stableString,syncOfficial,commitFiles} from './sync-official.mjs';
import {fixture,source,stamp} from './fixtures/official-fixture.mjs';
import {parseBilibiliCandidates} from './bilibili-candidates.mjs';
const initial = () => ({sources:[source],teams:[],matches:[],videos:[],broadcasts:[],meta:{}});
const candidate = () => buildCandidate({...fixture(),previous:initial(),now:stamp}).candidate;
async function cleanup(root) { assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('worlds-')); await rm(root,{recursive:true,force:true}); }
test('data extraction handles escaped braces and rejects executable JS',()=>{
 const object={__typename:'Match',id:'brace',name:'escaped " } { \\ text'};
 assert.deepEqual(extractObjects('prefix '+JSON.stringify(object)+' suffix','Match'),[object]);
 assert.deepEqual(extractObjects('{"__typename":"Match","id":(()=>{throw 1})()}','Match'),[]);
 assert.ok(decodeFlight(fixture().bracketHtml).includes('fixture-3'));
});
test('bracket restores live match absent from homepage; TBD remains null and scoreless',()=>{
 const result=parseOfficial({...fixture(),verifiedAt:stamp});
 assert.equal(result.matches.length,3);
 assert.equal(result.matches.find(m=>m.id.endsWith('3')).status,'live');
 assert.equal(result.matches.find(m=>m.id.endsWith('3')).bestOf,null);
 const tbd=result.matches.find(m=>m.id.endsWith('2'));
 assert.deepEqual(tbd.teamIds,[null,null]); assert.equal(tbd.scores,undefined);
});
test('venue dates cross UTC midnight and respect US daylight saving changes',()=>{
 assert.equal(dateInZone('2026-10-25T00:00:00Z','America/Chicago'),'2026-10-24');
 assert.equal(dateInZone('2026-11-14T04:30:00Z','America/New_York'),'2026-11-13');
 assert.equal(dateInZone('2026-10-25T04:30:00Z','America/New_York'),'2026-10-25');
});
test('shared official recording uses distinct explicit segment links and daily associations',()=>{
 const parsed=parseOfficial({...fixture(),verifiedAt:stamp});
 const videos=officialVideos(parsed.vods,parsed.matches,[source],stamp);
 assert.equal(videos.filter(v=>v.type==='singleGame').length,2);
 assert.ok(videos.some(v=>v.url.endsWith('&t=10s')));
 assert.ok(videos.some(v=>v.url.endsWith('&t=200s')));
 assert.ok(videos.filter(v=>v.type==='dayReplay').every(v=>v.matchId===null && !v.isSegment));
});
test('one series with several games is not mislabeled as a whole competition day',()=>{
 const parsed=parseOfficial({...fixture(),verifiedAt:stamp});
 parsed.vods[1].matchId=parsed.vods[0].matchId; parsed.vods[1].gameNumber=2;
 const videos=officialVideos(parsed.vods,parsed.matches,[source],stamp);
 assert.equal(videos.filter(v=>v.type==='singleGame').length,2);
 assert.equal(videos.filter(v=>v.type==='dayReplay').length,0);
});
test('empty or incomplete official response cannot replace existing data',()=>{
 assert.throws(()=>parseOfficial({homeHtml:'<html>Unavailable</html>',bracketHtml:''}),/empty/);
 const data=fixture(); data.homeHtml=data.homeHtml.split('\n')[0];
 data.bracketHtml=data.bracketHtml.replaceAll('2026-10-26T17:00:00Z','$undefined');
 assert.throws(()=>parseOfficial(data),/No official date/);
});
test('unchanged source facts do not refresh timestamps or create an update',()=>{
 const previous=candidate();
 const next=buildCandidate({...fixture(),previous,now:'2026-10-26T00:00:00Z'});
 assert.equal(next.changed,false); assert.deepEqual(next.candidate,previous);
 assert.equal(stableString(next.candidate),stableString(previous));
 assert.equal(stableString({a:1,b:2}),stableString({b:2,a:1}));
});
test('V2 validation accepts distinct shared segments and rejects duplicate IDs and bad times',()=>{
 const data=candidate(); assert.deepEqual(validateDataset(data),[]);
 const duplicate=structuredClone(data); duplicate.videos.push(duplicate.videos[0]);
 assert.ok(validateDataset(duplicate).some(error=>error.includes('duplicate ID')));
 const badTime=structuredClone(data); badTime.matches[0].startAt='2026-10-25T00:00:00';
 assert.ok(validateDataset(badTime).some(error=>error.includes('timezone required')));
 const day=structuredClone(data); day.matches[0].datePrecision='day'; day.matches[0].startAt=null;
 assert.deepEqual(validateDataset(day),[]);
});
test('playback claims require actual playback evidence',()=>{
 const data=candidate(); data.videos[0].playbackStatus='verified';
 assert.ok(validateDataset(data).some(error=>error.includes('actual playback evidence')));
});
test('a network failure leaves existing bytes unchanged',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'worlds-sync-'));
 try {
  await mkdir(path.join(root,'public/data'),{recursive:true});
  const file=path.join(root,'public/data/matches.json'); const bytes='[]\n'; await writeFile(file,bytes);
  await assert.rejects(()=>syncOfficial({root,fetcher:async()=>{throw new Error('network unavailable');}}),/network unavailable/);
  assert.equal(await readFile(file,'utf8'),bytes);
 } finally { await cleanup(root); }
});
test('failed local installation restores earlier replacements',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'worlds-transaction-'));
 try {
  const first=path.join(root,'first.json'), second=path.join(root,'second.json');
  await writeFile(first,'old first'); await writeFile(second,'old second'); let calls=0;
  await assert.rejects(()=>commitFiles([[first,'new first'],[second,'new second']],{replace:async(from,to)=>{if(++calls===2)throw new Error('disk failure');await writeFile(to,await readFile(from));await unlink(from);}}),/disk failure/);
  assert.equal(await readFile(first,'utf8'),'old first'); assert.equal(await readFile(second,'utf8'),'old second');
 } finally { await cleanup(root); }
});
test('broadcast live state is official, not inferred from a past start time',()=>{
 const parsed=parseOfficial({...fixture({includeLive:false}),verifiedAt:stamp});
 const broadcasts=makeBroadcasts(parsed.matches,[source],stamp);
 assert.equal(broadcasts.find(b=>b.date==='2026-10-26').status,'scheduled');
 assert.equal(broadcasts.find(b=>b.date==='2026-10-24').status,'ended');
});
test('Bilibili discovery accepts only the explicit official account card and remains unpublished',()=>{
 const card = id => `<div class="b-user-video-card"><a href="//space.bilibili.com/${id}">owner</a><div><a href="//www.bilibili.com/video/BV1abcdefghj/"><h3 title="【2026全球总决赛】fixture"></h3></a></div></div>`;
 assert.throws(()=>parseBilibiliCandidates(card('someone-else'),stamp),/empty/);
 const discovered=parseBilibiliCandidates(card('50329118'),stamp);
 assert.equal(discovered.length,1); assert.equal(discovered[0].status,'awaitingReview');
 assert.equal(discovered[0].matchId,undefined); assert.equal(discovered[0].type,undefined);
 const baseline=candidate();
 baseline.sources.push({...source,id:'bilibili-zh-CN',name:'Fixture Bilibili official account',language:'zh-CN',platform:'Bilibili',url:'https://space.bilibili.com/50329118'});
 const updated=buildCandidate({...fixture(),previous:baseline,discoveredCandidates:discovered,now:stamp});
 assert.deepEqual(updated.candidate.videos,baseline.videos);
 const unavailable=buildCandidate({...fixture(),previous:updated.candidate,now:'2026-10-26T00:00:00Z'});
 assert.equal(unavailable.changed,false); assert.equal(unavailable.candidate.candidates.length,1);
});
