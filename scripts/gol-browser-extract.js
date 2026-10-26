// Run in the visible GoL game document; only published DOM/chart data are read.
export function extractGameDocument() {
 const compact=e=>e?.textContent?.replace(/\s+/g,' ').trim()||'';
 const side=colour=>{const heading=document.querySelector('div.'+colour+'-line-header');if(!heading)throw Error('Missing '+colour+' side');const box=heading.parentElement.parentElement;const champions=[...box.querySelectorAll('img[src*="champions_icon"]')].map(e=>e.alt);if(champions.length!==10)throw Error('Unexpected draft size');return {name:compact(heading.querySelector('a')),winner:/- WIN/.test(compact(heading)),bans:champions.slice(0,5),picks:champions.slice(5),scores:Object.fromEntries([...box.querySelectorAll('.score-box')].map(e=>[e.querySelector('img')?.alt,compact(e)]))};};
 const rows=[...document.querySelectorAll('table.playersInfosLine')].flatMap((table,side)=>[...table.querySelectorAll(':scope > tbody > tr')].map(tr=>{const cells=[...tr.cells],a=cells[0]?.querySelector('a[href*="/players/"]'),champion=cells[0]?.querySelector('img')?.alt;if(!a)throw Error('Missing player identity');return {id:'gol:'+a.href.match(/player-stats\/(\d+)/)[1],name:compact(a),champion,side:side===0?'blue':'red',kda:compact(cells.at(-2)),cs:Number(compact(cells.at(-1))),sourcePlayerUrl:a.href};}));
 if(rows.length!==10)throw Error('Expected ten player rows');
 const body=document.body.textContent,version=[...document.images].map(i=>i.src).join(' ').match(/\/cdn\/(\d+\.\d+\.\d+)\//)?.[1],duration=[...document.querySelectorAll('h1')].map(compact).find(s=>/^\d+:\d{2}$/.test(s));
 const statsUrl=[...document.querySelectorAll('a')].find(a=>a.href.includes('/page-fullstats/'))?.href;
 return {sourceUrl:location.href,title:document.title,date:body.match(/2026-\d{2}-\d{2}/)?.[0],number:Number(document.title.match(/game (\d+)/i)?.[1]),patch:version,duration,blue:side('blue'),red:side('red'),rows,statsUrl};
}
export function extractStatsDocument() {
 const table=document.querySelector('table.completestats');if(!table)throw Error('Full stats table absent');
 const result={};for(const row of table.rows){const cells=[...row.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim());if(cells[0])result[cells[0]]=cells.slice(1);}return result;
}
