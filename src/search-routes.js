export const BASE='/lol-esports-watch-hub/';
export const EN=BASE+'en/worlds/2026/';
export const ORIGIN='https://jaisingz.github.io';
export function entityPath(type,id=''){
 if(type==='home')return EN;
 if(type==='schedule')return EN+'schedule/';
 const folder={match:'matches',team:'teams',player:'players'}[type];
 if(!folder)throw Error('Unknown entity type');
 const encoded=[...new TextEncoder().encode(id)].map(b=>b.toString(16).padStart(2,'0')).join('');
 return EN+folder+'/id-'+encoded+'/';
}
export function viewQuery(search=''){
 const input=new URLSearchParams(search),out=new URLSearchParams();
 for(const key of ['view','game','number']){const value=input.get(key);if(value&&(key!=='view'||['vod','analysis'].includes(value)))out.set(key,value)}
 return out.size?'?'+out.toString():'';
}
export function legacyTarget(hash,lang,manifest){
 if(lang!=='en')return null;
 const [route,query='']=hash.replace(/^#/,'').split('?'),[kind,encoded='']=route.split('/');
 const type=['','watch','main'].includes(kind)?'home':kind;
 let id;try{id=decodeURIComponent(encoded)}catch{return null}
 const page=manifest.find(p=>p.type===type&&(type==='home'||type==='schedule'||p.id===id));
 return page?page.path+(type==='match'?viewQuery(query):''):null;
}
export function legacyPath(type,id='',query=''){
 const route=type==='home'?'watch':type==='team'?'watch':type;
 return BASE+'#'+route+(id&&type!=='team'?'/'+encodeURIComponent(id):'')+(type==='match'?viewQuery(query):'');
}
