import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {displayableVideo,liveAddress} from '../src/watch-links.js';
import {verifiedVideo,hotRanking} from '../src/insights-model.js';
const source={id:'official',platform:'YouTube',evidenceUrl:'https://lolesports.com/en-US/',pageStatus:'verified',url:'https://www.youtube.com/@lolesports'};
const video={id:'v',sourceId:source.id,matchId:'m',platform:'YouTube',type:'singleGame',officialVodId:'official-vod',url:'https://www.youtube.com/watch?v=abc&t=120s',evidenceUrl:source.evidenceUrl,playbackStatus:'unverified'};
test('official video links retain segment URLs without asserting playback or heat eligibility',()=>{
 assert.equal(displayableVideo(video,source),true);
 assert.equal(video.url,'https://www.youtube.com/watch?v=abc&t=120s');
 assert.equal(verifiedVideo(video,{region:null,checks:[]}),false);
 assert.deepEqual(hotRanking([video],[{videoKey:'YouTube:abc',views:100,observedAt:new Date().toISOString()}],{checks:[]}),[]);
});
test('reject candidate, missing identity, unsafe URL, channel home and unavailable records',()=>{
 for(const patch of [{officialVodId:null},{matchId:null},{url:'javascript:alert(1)'},{url:source.url},{url:'https://youtube.com.evil.test/watch?v=abc'},{playbackStatus:'unavailable'},{type:'unknown'}])assert.equal(displayableVideo({...video,...patch},source),false);
 assert.equal(displayableVideo(video,undefined),false);
 assert.equal(displayableVideo(video,{...source,playbackStatus:'unavailable'}),false);
});
test('reviewed videos and daily recordings have separate attribution',()=>{
 assert.equal(displayableVideo({...video,officialVodId:null,curated:true,pageStatus:'verified'},source),true);
 assert.equal(displayableVideo({...video,type:'dayReplay',broadcastId:'day',matchId:null},source),true);
 assert.equal(displayableVideo({...video,type:'dayReplay',broadcastId:'day'},source),false);
});
test('live targets never fall back to a YouTube profile; Twitch channels are live destinations',()=>{
 assert.equal(liveAddress(source),null);
 assert.equal(liveAddress({...source,liveUrl:'https://www.youtube.com/watch?v=live',livePageStatus:'verified'}),'https://www.youtube.com/watch?v=live');
 assert.equal(liveAddress({...source,platform:'Twitch',url:'https://www.twitch.tv/riotgames'}),'https://www.twitch.tv/riotgames');
 assert.equal(liveAddress({...source,liveUrl:'https://example.com',livePageStatus:'unverified'}),null);
});
test('published attributed video records can display without changing source data',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
 const sources=new Map(read('sources').map(s=>[s.id,s]));const videos=read('videos');
 const expected=videos.filter(v=>v.playbackStatus!=='unavailable'&&(v.officialVodId||v.curated&&v.pageStatus==='verified'));
 assert.ok(expected.length>0);assert.equal(videos.filter(v=>displayableVideo(v,sources.get(v.sourceId))).length,expected.length);
});
