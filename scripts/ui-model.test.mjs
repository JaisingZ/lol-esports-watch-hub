import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayDate, nearestDate, commentaryKey, matchingVideos, liveEntriesForMatch,
  filterMatches, matchResources, matchLocale,
} from '../src/model.js';

const baseFilters={search:'',stage:'all',date:'all',commentary:'all',type:'all',availability:'all'};
const teams=[{id:'alpha',code:'ALP',name:'Team Alpha'},{id:'beta',code:'BET',name:'Team Beta'}];
const sources=[
  {id:'cn',language:'zh-CN',region:'CN',pageStatus:'restricted',livePageStatus:'verified',playbackStatus:'unverified'},
  {id:'tw',language:'zh-TW',region:'TW',pageStatus:'verified',playbackStatus:'unverified'},
  {id:'en',language:'en',pageStatus:'verified',livePageStatus:'unverified',playbackStatus:'unverified'},
];
for(const s of sources){s.platform='Twitch';s.url='https://www.twitch.tv/'+s.id;s.evidenceUrl='https://lolesports.com/en-US/';}
const sourceMap=new Map(sources.map(source=>[source.id,source]));
const matches=[
  {id:'a',teamIds:['alpha','beta'],stage:'swiss',scheduledDate:'2026-10-25',dateTimezone:'America/Chicago',datePrecision:'time',startAt:'2026-10-25T23:00:00Z'},
  {id:'b',teamIds:[null,'beta'],stage:'knockout',scheduledDate:'2026-11-03',dateTimezone:'America/Chicago',datePrecision:'day',startAt:null},
];
const broadcasts=[{id:'day-a',stage:'swiss',date:'2026-10-25',sourceIds:['cn','tw','en']}];
const videos=[
  {id:'v-cn',matchId:'a',sourceId:'cn',language:'zh-CN',type:'singleGame',pageStatus:'unverified',playbackStatus:'unverified'},
  {id:'v-tw',matchId:'a',sourceId:'tw',language:'zh-TW',type:'fullMatch',pageStatus:'verified',playbackStatus:'unverified'},
  {id:'v-down',matchId:'a',sourceId:'tw',language:'zh-TW',type:'highlights',pageStatus:'verified',playbackStatus:'unavailable'},
];
const context={teams,sources,sourceMap,matches,videos,broadcasts,timeZone:'Asia/Shanghai',tbdLabels:['待定','待定','미정','未定','Chưa xác định','รอประกาศ','A definir']};

const now=Date.parse('2026-10-26T00:00:00Z');
for(const v of videos){v.platform='YouTube';v.originalVideoId=v.id;v.url='https://www.youtube.com/watch?v='+v.id;v.officialVodId=v.id;v.evidenceUrl='https://lolesports.com/en-US/';}
const checks=[...videos.map(v=>({target:'Test:'+v.id,kind:'vod',region:'test',regionConfirmed:true,status:'passed',checkedAt:new Date(now).toISOString(),environment:{browser:'Test',network:'Test'},evidence:'Test fixture',samples:['start','middle','end'].map(position=>({position,advancedSeconds:20}))})),...['cn','tw'].map(id=>({target:id,kind:'live',region:'test',regionConfirmed:true,status:'passed',checkedAt:new Date(now).toISOString(),environment:{browser:'Test',network:'Test'},evidence:'Test fixture',samples:[{position:'live',advancedSeconds:20}]}))];
Object.assign(baseFilters,{checks,region:'test',now});Object.assign(context,{checks,region:'test',now});

test('a real timestamp is grouped by the viewer timezone, including cross-day changes',()=>{
  assert.equal(displayDate(matches[0],'Asia/Shanghai'),'2026-10-26');
  assert.equal(displayDate(matches[0],'America/Los_Angeles'),'2026-10-25');
});
test('a date-only fixture retains its announced regional date in either timezone',()=>{
  assert.equal(displayDate(matches[1],'Pacific/Kiritimati'),'2026-11-03');
  assert.equal(displayDate(matches[1],'America/Los_Angeles'),'2026-11-03');
  assert.equal(displayDate({...matches[1],startAt:'2026-11-03T00:00:00Z'},'America/Los_Angeles'),'2026-11-03');
});
test('latest match day selects the latest published day no later than today',()=>{
  assert.equal(nearestDate(['2026-11-01','2026-10-25','2026-10-27'],'2026-10-26'),'2026-10-25');
  assert.equal(nearestDate(['2026-11-01','2026-10-27'],'2026-10-26'),'2026-10-27');
  assert.equal(nearestDate([],'2026-10-26'),'all');
});
test('UI script preferences never infer commentary origin',()=>{
  assert.equal(matchLocale('zh-TW'),'zh-Hant');
  assert.equal(matchLocale('zh-CN'),'zh-Hans');
  assert.equal(commentaryKey('zh-Hans',{}),'zh');
  assert.equal(commentaryKey('zh-Hant',{}),'zh');
  assert.equal(commentaryKey('zh-Hant',{region:'TW'}),'zh-TW');
  assert.equal(commentaryKey('zh-CN',{}),'zh-CN');
});
test('commentary and video-type filters select resources independently of interface language',()=>{
  const filters={...baseFilters,commentary:'zh-CN',type:'singleGame'};
  assert.deepEqual(matchingVideos(videos,{...filters,lang:'en'},sourceMap).map(video=>video.id),['v-cn']);
  assert.deepEqual(matchingVideos(videos,{...filters,lang:'zh-Hant'},sourceMap).map(video=>video.id),['v-cn']);
  assert.equal(matchingVideos(videos,{...filters,commentary:'zh-TW'},sourceMap,'all',context).length,0);
});
test('official links remain visible without playback evidence or a region',()=>{
  assert.deepEqual(matchingVideos(videos,{...baseFilters,checks:[],region:null},sourceMap).map(v=>v.id),['v-cn','v-tw']);
 const found=matchingVideos(videos,baseFilters,sourceMap);
  assert.deepEqual(found.map(video=>video.id),['v-cn','v-tw']);
  assert.equal(found[0].pageStatus,'unverified');
  assert.ok(!found.some(video=>video.playbackStatus==='unavailable'));
});
test('verified live pages survive restricted profiles, explicit unverified live pages override profiles',()=>{
  assert.deepEqual(liveEntriesForMatch(matches[0],broadcasts,sourceMap,'all',context).map(source=>source.id),['cn','tw']);
  assert.deepEqual(liveEntriesForMatch(matches[0],broadcasts,sourceMap,'zh-CN',context).map(source=>source.id),['cn']);
  assert.equal(liveEntriesForMatch(matches[1],broadcasts,sourceMap,'all',context).length,0);
});
test('resource classifications use actual matching links and do not hide published fixtures',()=>{
  assert.equal(matchResources(matches[0],baseFilters,context).kind,'replay');
  assert.equal(matchResources(matches[0],{...baseFilters,type:'highlights'},context).kind,'live');
  assert.equal(matchResources(matches[0],{...baseFilters,commentary:'ko'},context).kind,'pending');
  assert.equal(filterMatches(matches,{...baseFilters,commentary:'ko'},context).length,2);
});
test('team, stage, local date and resource filters compose',()=>{
  assert.deepEqual(filterMatches(matches,{...baseFilters,search:'ＡＬＰ',stage:'swiss',date:'2026-10-26',availability:'replay'},context).map(match=>match.id),['a']);
  assert.equal(filterMatches(matches,{...baseFilters,search:'ALP',date:'2026-10-25'},context).length,0);
  assert.deepEqual(filterMatches(matches,{...baseFilters,availability:'pending'},context).map(match=>match.id),['b']);
});
test('TBD opponents do not crash search and are discoverable without inventing a team',()=>{
  assert.deepEqual(filterMatches(matches,{...baseFilters,search:'TBD'},context).map(match=>match.id),['b']);
  assert.deepEqual(filterMatches(matches,{...baseFilters,search:'待定'},context).map(match=>match.id),['b']);
  assert.deepEqual(filterMatches(matches,{...baseFilters,search:'Team Beta'},context).map(match=>match.id),['a','b']);
  assert.equal(filterMatches(matches,{...baseFilters,search:'Not a real team'},context).length,0);
});
