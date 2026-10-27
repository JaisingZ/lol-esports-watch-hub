// Link identity and match attribution are independent of regional playback checks.
const https=value=>{try{return new URL(value).protocol==='https:'}catch{return false}};
export function displayableVideo(video,source){
 if(!source||video.sourceId!==source.id||source.playbackStatus==='unavailable'||video.playbackStatus==='unavailable')return false;
 if(!https(video.url)||!https(video.evidenceUrl)||!https(source.evidenceUrl))return false;
 if(!video.officialVodId&&!(video.curated&&video.pageStatus==='verified'))return false;
 if(!['singleGame','fullMatch','highlights','dayReplay'].includes(video.type))return false;
 if(video.type==='dayReplay'?!video.broadcastId||Boolean(video.matchId):!video.matchId)return false;
 const u=new URL(video.url),host=u.hostname.replace(/^www\./,'');
 if(video.platform==='YouTube')return host==='youtube.com'&&u.pathname==='/watch'&&Boolean(u.searchParams.get('v'))||host==='youtu.be'&&u.pathname.length>1;
 if(video.platform==='Twitch')return host==='twitch.tv'&&/^\/videos\/\d+\/?$/.test(u.pathname);
 if(video.platform==='Bilibili')return host==='bilibili.com'&&/^\/video\/BV[\w]+\/?$/.test(u.pathname);
 return false;
}
export function liveAddress(source){
 if(!source||source.playbackStatus==='unavailable'||!https(source.evidenceUrl))return null;
 const address=source.liveUrl||(source.platform==='Twitch'?source.url:null);
 if(!https(address))return null;
 if(source.livePageStatus?source.livePageStatus!=='verified':source.pageStatus!=='verified')return null;
 return address;
}
