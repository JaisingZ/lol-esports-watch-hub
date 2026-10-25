export const languageMeta = [
  ['zh-Hans','简体中文'],['zh-Hant','繁體中文'],['en','English'],['ko','한국어'],
  ['ja','日本語'],['vi','Tiếng Việt'],['th','ไทย'],['pt-BR','Português (Brasil)'],
];
export const videoTypes = ['fullMatch', 'singleGame', 'highlights'];
export function matchLocale(code) {
  const value = String(code || '').toLowerCase();
  if (value.startsWith('zh')) return /hant|tw|hk|mo/.test(value) ? 'zh-Hant' : 'zh-Hans';
  if (value.startsWith('pt')) return 'pt-BR';
  return languageMeta.find(([language]) => language.toLowerCase() === value || value.startsWith(`${language.toLowerCase()}-`))?.[0] || null;
}
export function filterMatches(matches, filters) {
  const query = filters.search.trim().normalize('NFKC').toLocaleLowerCase();
  return matches.filter(match =>
    (!query || match.teams.join(' ').normalize('NFKC').toLocaleLowerCase().includes(query)) &&
    (filters.stage === 'all' || match.stage === filters.stage) &&
    (filters.tournament === 'all' || match.tournamentId === filters.tournament) &&
    (filters.season === 'all' || String(match.season) === filters.season) &&
    // Keep requested languages discoverable as pending instead of hiding the match.
    (filters.type === 'all' || match.videos.some(video => video.type === filters.type && (filters.commentary === 'all' || video.language === filters.commentary)))
  );
}
