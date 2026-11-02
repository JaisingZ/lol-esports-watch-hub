import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchingVideos} from '../src/model.js';
test('remembered commentary falls back for a match while an explicit filter remains strict',async()=>{
 const videos=JSON.parse(await readFile('public/data/videos.json','utf8')).filter(v=>v.matchId==='official:115660540726095005').map(v=>({...v,language:'en'}));
 const sources=new Map(JSON.parse(await readFile('public/data/sources.json','utf8')).map(s=>[s.id,s]));
 assert.ok(matchingVideos(videos,{commentary:'ko',type:'all',fallbackCommentary:true},sources).length>0);
 assert.equal(matchingVideos(videos,{commentary:'ko',type:'all',fallbackCommentary:false},sources).length,0);
});
const module=await import('../src/analytics-core.js').catch(()=>({}));
test('consent and sharing controls have all eight translations',async()=>{
 const translations=JSON.parse(await readFile('src/growth-locales.json','utf8'));
 assert.equal(Object.keys(translations).length,8);
 for(const value of Object.values(translations)){assert.deepEqual(Object.keys(value).sort(),Object.keys(translations.en).sort());assert.ok(Object.values(value).every(v=>typeof v==='string'&&v.trim()))}
});
test('denied or unknown consent never loads a tag or sends events',()=>{
 assert.equal(typeof module.createAnalytics,'function');let loads=0;const events=[];
 const a=module.createAnalytics({id:'G-1234567890',load:()=>loads++,emit:(...args)=>events.push(args)});
 a.page({path:'/home/',type:'home',lang:'en'});a.track('watch_click',{match_id:'x'});a.consent('denied');a.track('watch_click',{});
 assert.equal(loads,0);assert.equal(events.length,0);
});
test('opt-in tracks current page once and ignores re-render and view-only query changes',()=>{
 assert.equal(typeof module.createAnalytics,'function');let loads=0;const events=[];
 const a=module.createAnalytics({id:'G-1234567890',load:()=>loads++,emit:(...args)=>events.push(args)});
 a.page({path:'/match/x/',type:'match',lang:'en'});a.consent('granted');a.page({path:'/match/x/',type:'match',lang:'en'});a.consent('granted');
 assert.equal(loads,1);assert.equal(events.filter(([name])=>name==='page_view').length,1);
 a.page({path:'/match/y/',type:'match',lang:'en'});assert.equal(events.filter(([name])=>name==='page_view').length,2);
 a.consent('denied');a.track('watch_click',{});assert.equal(events.length,2);
});
test('watch event strips unapproved parameters and computes only first-click delay per page',()=>{
 assert.equal(typeof module.createAnalytics,'function');let now=100;const events=[];
 const a=module.createAnalytics({id:'G-1234567890',now:()=>now,load:()=>{},emit:(...args)=>events.push(args)});
 a.page({path:'/match/x/',type:'match',lang:'en'});a.consent('granted');now=3100;
 a.track('watch_click',{match_id:'x',url:'https://example.com/?private=x',search:'secret'});now=5100;a.track('watch_click',{match_id:'x'});
 assert.equal(events[1][1].first_watch_seconds,3);assert.equal(events[2][1].first_watch_seconds,undefined);
 assert.equal(events[1][1].url,undefined);assert.equal(events[1][1].search,undefined);
});
test('missing config and broken tag cannot break site interactions',()=>{
 assert.equal(typeof module.createAnalytics,'function');const events=[];
 const a=module.createAnalytics({id:null,load:()=>{throw Error('should not load')},emit:x=>events.push(x)});a.consent('granted');a.page({path:'/',type:'home',lang:'en'});assert.equal(events.length,0);
 const b=module.createAnalytics({id:'G-1234567890',load:()=>{throw Error('blocked')},emit:()=>{throw Error('blocked')}});assert.doesNotThrow(()=>{b.consent('granted');b.page({path:'/',type:'home',lang:'en'});b.track('watch_click',{})});
});
