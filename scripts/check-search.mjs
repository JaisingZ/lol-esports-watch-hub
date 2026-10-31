import {readFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BASE,ORIGIN} from '../src/search-routes.js';
const manifest=JSON.parse(await readFile('dist/search-manifest.json','utf8'));
const paths=new Set(manifest.map(p=>p.path));
assert.equal(paths.size,manifest.length);
for(const p of manifest){
 const html=await readFile('dist/'+p.path.slice(BASE.length)+'index.html','utf8');
 assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN+p.path}">`));
 assert.match(html,/<h1>[^<]+<\/h1>/);
 const share=html.match(/property="og:image" content="https:\/\/jaisingz.github.io([^\"]+)"/);assert.ok(share,'Missing OG image');await access('dist/'+share[1].slice(BASE.length));
 assert.ok(!html.includes('<!--SEARCH_'));
 for(const [,raw]of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
  const value=raw.replaceAll('&amp;','&');if(!value.startsWith(BASE))continue;
  const pathname=value.split(/[?#]/)[0];if(pathname===BASE)continue;
  if(pathname.includes('/en/worlds/'))assert.ok(paths.has(pathname),'Unknown internal URL '+pathname);
  else await access('dist/'+pathname.slice(BASE.length));
 }
 assert.equal(html.includes('name="robots" content="noindex,follow"'),!p.indexable);
}
const sitemap=await readFile('dist/sitemap.xml','utf8');
for(const p of manifest)assert.equal(sitemap.includes('<loc>'+ORIGIN+p.path+'</loc>'),p.indexable);
console.log(`Checked canonical paths, HTML and local resources for ${manifest.length} pages.`);
