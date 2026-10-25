// Synthetic published-data shape: no fixture URL or team is production content.
import { TOURNAMENT_ID } from '../official-parser.mjs';
export const stamp = '2026-10-25T00:00:00Z';
export const source = {id:'test-en',name:'Fixture channel',language:'en',platform:'YouTube',url:'https://www.youtube.com/@fixture',liveUrl:'https://lolesports.com/en-US/live/worlds/fixture',officialVodLanguage:'en-US',evidenceUrl:'https://lolesports.com/en-US/',verifiedAt:stamp,pageStatus:'unverified',playbackStatus:'unverified',coverage:{tournamentId:'worlds',season:2026}};
export const team = id => ({teamId:id,code:'T' + id,name:'Team ' + id,image:`https://static.lolesports.com/teams/test-${id}.png`,result:{gameWins:1,outcome:null}});
export function fixture({includeLive = true, shared = true} = {}) {
  const event = {__typename:'EventMatch',id:'fixture-1',blockName:'Swiss',startTime:'2026-10-25T00:00:00Z',state:'completed',tournament:{id:TOURNAMENT_ID},matchTeams:[team('1'),team('2')],match:{strategy:{type:'bestOf',count:1},games:[{number:1,vods:[{id:'vod-1',provider:'youtube',parameter:'abcdefghijk',startMillis:10000,endMillis:100000,mediaLocale:{locale:'en-US'}}]}]}};
  const second = {...event,id:'fixture-2',state:'unstarted',startTime:'2026-10-26T17:00:00Z',matchTeams:[{teamId:'0',code:'TBD',name:'TBD',result:null},{teamId:'0',code:'TBD',name:'TBD',result:null}],match:{strategy:{type:'bestOf',count:1},games:shared ? [{number:1,vods:[{id:'vod-2',provider:'youtube',parameter:'abcdefghijk',startMillis:200000,endMillis:300000,mediaLocale:{locale:'en-US'}}]}] : []}};
  const live = {__typename:'Match',id:'fixture-3',state:'inProgress',startTime:'2026-10-25T22:00:00Z',matchTeams:[team('1'),team('2')]};
  const matchList = [event,second,...(includeLive ? [live] : [])];
  const stage = {__typename:'Stage',id:'115660540725570706',sections:[{matches:matchList.map(m=>({__typename:'Match',id:m.id,state:m.state}))}]};
  const cell = {__typename:'Cell',name:'Round 3',matches:matchList.map(m=>({...m,__typename:'Match'}))};
  const flight = '<script>self.__next_f.push(' + JSON.stringify([1,JSON.stringify(stage) + '\n' + JSON.stringify(cell)]) + ')</script>';
  return {homeHtml:JSON.stringify(event) + '\n' + JSON.stringify(second),bracketHtml:flight};
}
