import {createHash} from 'node:crypto';
import {BASE,ORIGIN} from '../src/search-routes.js';
import {esc} from './search-pages.mjs';
export function sharePath(p){return BASE+'share/'+p.type+'-'+createHash('sha256').update(p.path).digest('hex').slice(0,16)+'.png'}
export function verificationTag(config){return config.searchConsoleVerification?`<meta name="google-site-verification" content="${esc(config.searchConsoleVerification)}">`:''}
export function metadata(p,config,image){
 const fields={'description':p.description,'twitter:card':'summary_large_image','twitter:title':p.title,'twitter:description':p.description,'twitter:image':ORIGIN+image};
 const og={'og:type':'website','og:locale':'en_US','og:site_name':'LoL Esports Watch Hub','og:title':p.title,'og:description':p.description,'og:url':ORIGIN+p.path,'og:image':ORIGIN+image,'og:image:width':'1200','og:image:height':'630','og:image:alt':p.shareTitle||p.title};
 return `<title>${esc(p.title)}</title><link rel="canonical" href="${ORIGIN+p.path}">`+Object.entries(fields).map(([k,v])=>`<meta name="${k}" content="${esc(v)}">`).join('')+Object.entries(og).map(([k,v])=>`<meta property="${k}" content="${esc(v)}">`).join('')+(p.indexable?'':'<meta name="robots" content="noindex,follow">')+verificationTag(config);
}
export function sitemap(manifest){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+manifest.filter(p=>p.indexable).map(p=>`<url><loc>${esc(ORIGIN+p.path)}</loc><lastmod>${p.lastmod}</lastmod></url>`).join('\n')+'\n</urlset>\n'}
