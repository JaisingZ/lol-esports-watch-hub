import test from 'node:test';
import assert from 'node:assert/strict';
const seo=await import('./search-seo.mjs').catch(()=>({}));
import {shareAddress} from '../src/share.js';
test('share URL retains game but never adds search text or scores',()=>{
 const url=shareAddress('match','x','game=gol%3A5&number=2&score=2-0&search=private');
 assert.ok(url.includes('game=gol%3A5'));assert.ok(!url.includes('score'));assert.ok(!url.includes('private'));
});
test('SEO emits absolute project URLs and real optional verification only',()=>{
 assert.equal(typeof seo.metadata,'function');
 const p={path:'/lol-esports-watch-hub/en/worlds/2026/',title:'A & B',description:'Replays',indexable:true};
 const html=seo.metadata(p,{},'/lol-esports-watch-hub/share/home.png');
 assert.ok(html.includes('https://jaisingz.github.io/lol-esports-watch-hub/share/home.png'));
 assert.ok(html.includes('A &amp; B'));assert.ok(!html.includes('google-site-verification'));assert.ok(!html.includes('VideoObject'));
 assert.ok(seo.metadata(p,{searchConsoleVerification:'abc123'},'/x.png').includes('content="abc123"'));
});
test('sitemap omits noindex entities and preserves last modification dates',()=>{
 assert.equal(typeof seo.sitemap,'function');
 const xml=seo.sitemap([{path:'/a/',indexable:true,lastmod:'2026-10-25T00:00:00Z'},{path:'/tbd/',indexable:false}]);
 assert.ok(xml.includes('<lastmod>2026-10-25T00:00:00Z</lastmod>'));assert.ok(!xml.includes('/tbd/'));
});
