import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createPages,pageShell,esc,updateIndex} from './search-pages.mjs';
import {BASE,ORIGIN} from '../src/search-routes.js';
import {metadata,sitemap,sharePath,verificationTag} from './search-seo.mjs';
import {shareImage} from './share-images.mjs';
const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));
const data=Object.fromEntries(await Promise.all(['matches','teams','players','player-games','games','videos','sources','broadcasts'].map(async k=>[k,await readJSON(`public/data/${k}.json`)])));
const template=await readFile('dist/english.html','utf8');
const config=await readJSON('config/site.json');
const pages=createPages(data);
const previous=await readJSON('data-research/search-index.json').catch(()=>({}));
const index=updateIndex(pages,previous);
const manifest=[];
for(const p of pages){
 const relative=p.path.slice(BASE.length),folder=path.join('dist',relative);
 const head=metadata(p,config,sharePath(p));
 const html=template.replace('<!--SEARCH_HEAD-->',head).replace('<!--SEARCH_BODY-->',pageShell(p));
 await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'index.html'),html);
 await shareImage(p);
 manifest.push({type:p.type,id:p.id,path:p.path,indexable:p.indexable,lastmod:index[p.path].lastmod});
}
await writeFile('dist/search-manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/sitemap.xml',sitemap(manifest));
const app=await readFile('dist/index.html','utf8');await writeFile('dist/index.html',app.replace('</head>',verificationTag(config)+'</head>'));
await writeFile('data-research/search-index.json',JSON.stringify(index,null,2)+'\n');
await writeFile('dist/404.html',template.replace('<!--SEARCH_HEAD-->','<title>Page not found | LoL Esports Watch Hub</title><meta name="robots" content="noindex">').replace('<!--SEARCH_BODY-->',`<main class="shell"><h1>Page not found</h1><p>This address does not exist.</p><a href="${BASE}en/worlds/2026/">Worlds 2026 →</a></main>`));
await rm('dist/english.html');
console.log(`Generated ${pages.length} English pages (${pages.filter(p=>p.indexable).length} indexable).`);
