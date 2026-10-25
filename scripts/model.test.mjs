import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterMatches, matchLocale} from '../src/model.js';
import {validateContent} from './content-validation.mjs';
const read = name => JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const valid = {locales:read('../src/locales.json'),sources:read('../public/data/sources.json'),matches:read('../public/data/matches.json')};
const all = {search:'',commentary:'all',stage:'all',tournament:'all',season:'all',type:'all'};
test('browser language matching and unsupported fallback',()=>{
  assert.equal(matchLocale('zh-TW'),'zh-Hant');assert.equal(matchLocale('zh-CN'),'zh-Hans');assert.equal(matchLocale('pt-PT'),'pt-BR');assert.equal(matchLocale('fr-FR'),null);
});
test('search, season and video type compose; missing commentary remains discoverable',()=>{
  const fixtures=[{teams:['Alpha','Beta'],stage:'swiss',season:2026,tournamentId:'worlds',videos:[{language:'en',type:'singleGame'}]}];
  assert.equal(filterMatches(fixtures,{...all,search:'ＡＬＰＨＡ'}).length,1);
  assert.equal(filterMatches(fixtures,{...all,season:'2025'}).length,0);
  assert.equal(filterMatches(fixtures,{...all,commentary:'ko'}).length,1);
  assert.equal(filterMatches(fixtures,{...all,type:'highlights'}).length,0);
  assert.equal(filterMatches(fixtures,{...all,type:'singleGame',commentary:'ko'}).length,0);
});
test('reject fabricated boundaries, invalid source references and playback claims',()=>{
  assert.deepEqual(validateContent(valid),[]);
  for(const mutate of [
    data=>{data.matches[0].isDemo=true;},
    data=>{data.matches[0].videos[0].sourceId='missing';},
    data=>{data.matches[0].videos[0].url=data.sources[0].url;},
    data=>{data.matches[0].videos[0].playbackStatus='verified';},
    data=>{data.matches[0].startAt='2026-10-24T12:00:00';},
    data=>{data.matches.push(structuredClone(data.matches[0]));},
    data=>{data.locales.th.results='No count placeholder';},
  ]) {const copy=structuredClone(valid);mutate(copy);assert.ok(validateContent(copy).length>0);}
});
