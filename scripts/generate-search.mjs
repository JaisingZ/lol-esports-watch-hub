import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createPages,pageShell,esc,updateIndex} from './search-pages.mjs';
import {BASE,ORIGIN} from '../src/search-routes.js';
const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));
const data=Object.fromEntries(await Promise.all(['matches','teams','players','player-games','games','videos','sources','broadcasts'].map(async k=>[k,await readJSON(`public/data/${k}.json`)])));
const template=await readFile('dist/english.html','utf8');
const pages=createPages(data);
const previous=await readJSON('data-research/search-index.json').catch(()=>({}));
const index=updateIndex(pages,previous);
const manifest=[];
for(const p of pages){
 const relative=p.path.slice(BASE.length),folder=path.join('dist',relative);
 const head=`<title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><link rel="canonical" href="${ORIGIN+p.path}">${p.indexable?'':'<meta name="robots" content="noindex,follow">'}`;
 const html=template.replace('<!--SEARCH_HEAD-->',head).replace('<!--SEARCH_BODY-->',pageShell(p));
 await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'index.html'),html);
 manifest.push({type:p.type,id:p.id,path:p.path,indexable:p.indexable,lastmod:index[p.path].lastmod});
}
await writeFile('dist/search-manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('data-research/search-index.json',JSON.stringify(index,null,2)+'\n');
await writeFile('dist/404.html',template.replace('<!--SEARCH_HEAD-->','<title>Page not found | LoL Esports Watch Hub</title><meta name="robots" content="noindex">').replace('<!--SEARCH_BODY-->',`<main class="shell"><h1>Page not found</h1><p>This address does not exist.</p><a href="${BASE}en/worlds/2026/">Worlds 2026 →</a></main>`));
await rm('dist/english.html');
console.log(`Generated ${pages.length} English pages (${pages.filter(p=>p.indexable).length} indexable).`);
