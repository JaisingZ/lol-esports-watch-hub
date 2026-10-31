import {ORIGIN,entityPath,viewQuery} from './search-routes.js';
export function shareAddress(type,id,query=''){return ORIGIN+entityPath(type,id)+(type==='match'?viewQuery(query):'')}
export async function shareMatch(button,{type='match',id,query='',copied='Link copied',failed='Copy this link',onShare=()=>{}}){
 const url=shareAddress(type,id,query);
 if(navigator.share){try{await navigator.share({title:document.title,url});onShare('system');return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(url);button.textContent=copied;onShare('copy')}
 catch{const field=document.createElement('input');field.readOnly=true;field.value=url;field.setAttribute('aria-label',failed);button.after(field);field.focus();field.select()}
}
