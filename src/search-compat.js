import {BASE,legacyTarget} from './search-routes.js';
export function installSearchCompatibility(getLanguage){
 let manifestPromise;
 async function redirect(){
  if(getLanguage()!=='en'||!/^#?(?:match\/|player\/|schedule(?:\?|$)|watch$|main$|$)/.test(location.hash))return;
  const before=location.hash;
  try{
   manifestPromise||=fetch(BASE+'search-manifest.json',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json()});
   const target=legacyTarget(before,getLanguage(),await manifestPromise);
   if(target&&before===location.hash&&getLanguage()==='en')location.replace(target);
  }catch{/* The existing eight-language app remains usable if generation is unavailable. */}
 }
 window.addEventListener('hashchange',redirect);window.addEventListener('hub:render',redirect);redirect();
}
