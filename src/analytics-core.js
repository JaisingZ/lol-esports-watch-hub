const allowed={page_view:[],watch_click:['match_id','video_id','platform','commentary_language','video_type','entry_position'],commentary_change:['from_language','to_language'],match_view_change:['match_id','target_view'],share_click:['entity_id','share_method']};
export function createAnalytics({id,load=()=>{},emit=()=>{},now=()=>Date.now()}={}){
 let choice='unknown',loaded=false,page=null,lastSent=null,entered=now(),watched=false;
 const enabled=()=>choice==='granted'&&/^G-[A-Z0-9]{6,}$/.test(id||'');
 function send(name,params){try{emit(name,params)}catch{/* Analytics never blocks navigation. */}}
 function pageview(){if(!enabled()||!page)return;const key=page.path+'|'+page.lang;if(lastSent===key)return;lastSent=key;send('page_view',{page_type:page.type,canonical_path:page.path,interface_language:page.lang})}
 return {
  consent(value){choice=value;if(enabled()&&!loaded){try{load();loaded=true}catch{}}pageview()},
  page(value){if(!value)return;const key=value.path+'|'+value.lang;if(!page||key!==page.path+'|'+page.lang){entered=now();watched=false}page=value;pageview()},
  track(name,input={}){
   if(!enabled()||!page||!Object.hasOwn(allowed,name)||name==='page_view')return;
   const params={page_type:page.type,canonical_path:page.path,interface_language:page.lang};
   for(const key of allowed[name])if(typeof input[key]==='string'||typeof input[key]==='number')params[key]=String(input[key]).slice(0,100);
   if(name==='watch_click'&&!watched){params.first_watch_seconds=Math.max(0,(now()-entered)/1000);watched=true}
   send(name,params);
  }
 };
}
