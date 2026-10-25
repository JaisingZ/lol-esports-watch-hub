// This public search result is a discovery source only. It never creates videos.json records.
export const BILIBILI_SEARCH_URL = 'https://search.bilibili.com/all?keyword=2026%E5%85%A8%E7%90%83%E6%80%BB%E5%86%B3%E8%B5%9B';
const decodeEntities = text => text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function parseBilibiliCandidates(html, stamp) {
  const result = new Map();
  for (const start of html.matchAll(/<div\b[^>]*class="[^"]*\bb-user-video-card\b[^"]*"[^>]*>/g)) {
    let depth = 1, end = -1;
    const tags = /<\/?div\b[^>]*>/g;
    tags.lastIndex = start.index + start[0].length;
    for (let match; (match = tags.exec(html));) {
      depth += match[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = tags.lastIndex; break; }
    }
    if (end < 0) continue;
    const card = html.slice(start.index,end);
    // Only the explicit official-account card; never unrelated search results.
    if (!/space\.bilibili\.com\/(?:zh-Hans\/)?50329118(?:[/?"])/.test(card)) continue;
    for (const entry of card.matchAll(/<a\b[^>]*href="(?:https?:)?\/\/www\.bilibili\.com\/(?:zh-Hans\/)?video\/(BV[\w]+)\/?[^"\s]*"[^>]*>\s*<h3\b[^>]*title="([^"]+)"/g)) {
      const title = decodeEntities(entry[2]);
      if (!/2026全球总决赛|S16/.test(title)) continue;
      result.set(entry[1],{id:'bilibili-candidate-' + entry[1],sourceId:'bilibili-zh-CN',language:'zh-CN',videoId:entry[1],url:`https://www.bilibili.com/video/${entry[1]}/`,title,
        evidenceUrl:BILIBILI_SEARCH_URL,verifiedAt:stamp,status:'awaitingReview',pageStatus:'unverified',playbackStatus:'unverified',
        reason:'Listed under official account 50329118 in public search. Video page, episode structure, exact match and video type still require verification; not published as a playable match resource.'});
    }
  }
  if (!result.size) throw new Error('Official Bilibili account candidate block was empty or changed.');
  return [...result.values()];
}
