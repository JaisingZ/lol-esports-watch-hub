import messages from './locales.json';
import { filterMatches, matchLocale, languageMeta, videoTypes } from './model.js';
import './styles.css';

const $ = selector => document.querySelector(selector);
const storageKey = 'lol-esports-watch-hub.ui-language';
const readPreference = () => { try { return localStorage.getItem(storageKey); } catch { return null; } };
const stored = readPreference();
const state = {
  lang: Object.hasOwn(messages, stored) ? stored : (navigator.languages || [navigator.language]).map(matchLocale).find(Boolean) || 'en',
  search: '', commentary: 'all', stage: 'all', tournament: 'all', season: 'all', type: 'all', expanded: false,
};
let sources = [], matches = [], status = 'loading';
const translate = (key, values = {}) => {
  let text = messages[state.lang][key] || messages.en[key] || key;
  for (const [name, value] of Object.entries(values)) text = text.replaceAll('{' + name + '}', String(value));
  return text;
};
const textNode = (tag, className, text) => {
  const node = document.createElement(tag);
  node.className = className; node.textContent = text;
  return node;
};
const link = (url, text, className = '') => {
  const node = textNode('a', className, text);
  node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
};
const option = (value, text) => { const node = textNode('option', '', text); node.value = value; return node; };
const languageName = code => languageMeta.find(item => item[0] === code)?.[1] || new Intl.DisplayNames([state.lang], { type: 'language' }).of(code);
const verifiedDate = date => new Intl.DateTimeFormat(state.lang, {dateStyle: 'medium'}).format(new Date(date));
function populateFilters() {
  const fill = (id, entries, value) => { $(id).replaceChildren(...entries.map(([key, text]) => option(key, text))); $(id).value = value; };
  const commentary = [...new Set([...languageMeta.map(item => item[0]), ...matches.flatMap(item => item.videos.map(video => video.language))])];
  fill('#commentary', [['all', translate('allLanguages')], ...commentary.map(code => [code, languageName(code)])], state.commentary);
  fill('#stage', [['all', translate('allStages')], ...[...new Set(matches.map(item => item.stage))].map(stage => [stage, translate(stage)])], state.stage);
  fill('#tournament', [['all', translate('allTournaments')], ...[...new Map(matches.map(item => [item.tournamentId, item.tournamentName])).entries()]], state.tournament);
  fill('#season', [['all', translate('allSeasons')], ...[...new Set(matches.map(item => item.season))].sort((a,b) => b-a).map(year => [String(year), String(year)])], state.season);
  fill('#video-type', [['all', translate('allTypes')], ...videoTypes.map(type => [type, translate(type)])], state.type);
}

function renderChannels() {
  const grid = $('#channel-grid'); grid.replaceChildren();
  for (const source of sources) {
    const node = link(source.url, '', 'channel');
    node.setAttribute('aria-label', translate('channelAccessible', {name: source.name}));
    const copy = textNode('span', 'channel-copy', '');
    copy.append(textNode('span', 'channel-name', source.name), textNode('span', 'channel-detail', source.platform + ' · ' + languageName(source.language)));
    node.append(textNode('span', 'channel-code', source.language.split('-')[0].toUpperCase()), copy, textNode('span', 'external', '↗'));
    grid.append(node);
  }
  if (sources.length > 2) {
    const button = textNode('button', 'show-channels', translate(state.expanded ? 'hideChannels' : 'showChannels'));
    button.type = 'button'; button.setAttribute('aria-expanded', String(state.expanded)); button.setAttribute('aria-controls', 'channel-grid');
    button.addEventListener('click', () => { state.expanded = !state.expanded; $('#channel-strip').classList.toggle('expanded', state.expanded); renderChannels(); });
    grid.append(button);
  }
  $('#channel-strip').hidden = sources.length === 0;
}

function createMatch(match) {
  const card = textNode('article', 'match-card', ''); card.dataset.matchId = match.id;
  card.append(textNode('div', 'match-top', match.tournamentName + ' ' + match.season + ' · ' + translate(match.stage) + (match.format ? ' · ' + match.format : '')));
  const teams = textNode('div', 'teams', '');
  match.teams.forEach((name, index) => {
    if (index) teams.append(textNode('span', 'versus', 'VS'));
    const team = textNode('div', 'team', '');
    const crest = textNode('span', 'team-crest', name.slice(0, 3)); crest.setAttribute('aria-hidden', 'true');
    team.append(crest, textNode('div', 'team-name', name)); teams.append(team);
  });
  card.append(teams);
  let time = translate('unknownTime');
  if (match.startAt) time = new Intl.DateTimeFormat(state.lang, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(match.startAt));
  const timeNode = textNode('div', 'match-time', time);
  if (match.startAt) { const dateNode = textNode('time', '', time); dateNode.dateTime = match.startAt; timeNode.replaceChildren(dateNode); }
  card.append(timeNode);
  const videos = textNode('div', 'video-options', '');
  const shown = match.videos.filter(video => (state.commentary === 'all' || video.language === state.commentary) && (state.type === 'all' || video.type === state.type));
  for (const video of shown) {
    const row = textNode('div', 'video-option', '');
    row.append(textNode('span', 'video-lang', languageName(video.language)), textNode('span', 'source-meta', video.platform + ' · ' + translate(video.type) + (video.gameNumber ? ' · #' + video.gameNumber : '')));
    if (video.playbackStatus !== 'unavailable') row.append(link(video.url, translate('watchVideo') + ' ↗'));
    // A readable page is not evidence of actual playback.
    const playbackKey = {verified:'playbackVerified',unavailable:'playbackUnavailable',unverified:'playbackUnverified'}[video.playbackStatus];
    row.append(textNode('span', 'source-meta', (video.pageStatus === 'verified' ? translate('pageVerified') + ' · ' : '') + translate(playbackKey)));
    row.append(textNode('span', 'source-meta', translate('updated', {date: verifiedDate(video.verifiedAt)}))); videos.append(row);
  }
  if (!shown.length) videos.append(textNode('div', 'video-option pending', (state.commentary === 'all' ? '' : languageName(state.commentary) + ' · ') + translate('pendingDescription')));
  card.append(videos);
  const source = textNode('div', 'source-meta', '');
  source.append(link(match.scheduleSource, translate('matchSource')), textNode('span', '', ' · ' + translate('updated', {date: verifiedDate(match.verifiedAt)})));
  card.append(source);
  return card;
}

function renderMatches() {
  const found = filterMatches(matches, state);
  $('#match-list').replaceChildren(...found.map(createMatch));
  $('#match-list').hidden = status !== 'ready' || found.length === 0;
  $('#empty').hidden = status === 'ready' && found.length > 0;
  $('#empty-title').textContent = translate(status === 'loading' ? 'loading' : status === 'error' ? 'loadError' : matches.length ? 'emptyTitle' : 'noMatchesTitle');
  $('#empty-description').textContent = status === 'ready' ? translate(matches.length ? 'emptyDescription' : 'noMatchesDescription') : '';
  $('#reset-empty').hidden = status !== 'ready' || !matches.length;
  $('#retry').hidden = status !== 'error';
  $('#result-count').textContent = status === 'loading' ? translate('loading') : translate('results', {count: found.length});
  $('#timezone').textContent = translate('timezone', {zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'});
  const dates = [...sources, ...matches, ...matches.flatMap(match => match.videos)].map(item => item.verifiedAt).filter(Boolean).sort();
  $('#updated').textContent = dates.length ? translate('updated', {date: verifiedDate(dates.at(-1))}) : '';
}

function renderLanguage() {
  document.documentElement.lang = state.lang; $('#ui-language').value = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = translate(node.dataset.i18n); });
  if (state.lang.startsWith('zh')) $('#hero-title').replaceChildren(...translate('heroTitle').split(/(?<=，)/u).map(text => textNode('span', 'phrase', text)));
  $('#search').placeholder = translate('searchPlaceholder');
  $('#reset').title = translate('clear'); $('#reset').setAttribute('aria-label', translate('clear'));
  populateFilters(); renderChannels(); renderMatches();
}
function resetFilters() {
  Object.assign(state, {search:'', commentary:'all', stage:'all', tournament:'all', season:'all', type:'all'});
  $('#search').value = ''; populateFilters(); renderMatches(); $('#search').focus();
}
let loading = false;
async function loadContent() {
  if (loading) return;
  loading = true; status = 'loading'; renderMatches();
  try {
    const data = await Promise.all(['sources', 'matches'].map(async name => {
      const response = await fetch(import.meta.env.BASE_URL + 'data/' + name + '.json', {signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('Content unavailable: ' + response.status);
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error('Invalid content');
      return records;
    }));
    [sources, matches] = data; status = 'ready';
  } catch {
    sources = []; matches = []; status = 'error';
  } finally {
    loading = false; renderLanguage();
  }
}
$('#ui-language').replaceChildren(...languageMeta.map(([code, name]) => option(code, name)));
$('#ui-language').addEventListener('change', event => {
  state.lang = event.target.value;
  try { localStorage.setItem(storageKey, state.lang); } catch { /* Display language still works without storage. */ }
  renderLanguage();
});
$('#search').addEventListener('input', event => { state.search = event.target.value; renderMatches(); });
for (const [id, key] of [['commentary','commentary'],['stage','stage'],['tournament','tournament'],['season','season'],['video-type','type']]) {
  $('#' + id).addEventListener('change', event => { state[key] = event.target.value; renderMatches(); });
}
$('#filters').addEventListener('submit', event => event.preventDefault());
$('#reset').addEventListener('click', resetFilters); $('#reset-empty').addEventListener('click', resetFilters);
$('#retry').addEventListener('click', loadContent);
renderLanguage(); loadContent();
