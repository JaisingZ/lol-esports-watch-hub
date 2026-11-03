# International search: phase one

## Development and release

`npm ci`, `npm run check`, `npm run build`, then `npm run preview`.
Both Pages and hourly collection use the same build command. Build validates source data,
builds Vite assets, writes English HTML/PNG cards, and checks all internal paths and assets.
No API or application server is needed in production.

Review and merge in order: `feature/english-search-pages` → `feature/search-sharing` →
`feature/growth-analytics`. The latter PRs initially target the preceding feature branch.
After each merge, retarget the next PR to `main`; keep the feature branches until their
dependent PR has been retargeted. Do not squash away shared ancestry without updating the
following PR. Layout confirmation is required before merging or deploying.

## URLs and generated content

English pages live below `/lol-esports-watch-hub/en/worlds/2026/`.
Entity IDs use deterministic UTF-8 hexadecimal encoding (`id-…`) to avoid colon/slash
filename problems on Windows and server URL decoding. Names are never part of the ID.
`dist/search-manifest.json` maps original IDs to URLs.

`data-research/search-index.json` stores content hashes and last modification dates.
Keep it in Git. Unchanged rendered content retains `lastmod`, even if collection timestamps
change. The scheduled workflow already stages `data-research` after building changed data.
An empty or failed collection still obeys the existing retain-last-successful-data rules.

`dist/sitemap.xml` lists only indexable canonical pages. Both-opponents-unknown matches
remain accessible with `noindex,follow`. Missing videos do not delete fixtures. Empty
players/teams are not generated. `dist/404.html` is an actual GitHub Pages 404 document;
there is no fallback redirect to the home page. Vite uses multi-page mode for local previews.

Old English hash links map client-side to the generated URL and retain game/number/view.
This is not an HTTP 301. Other languages keep the existing application. English static
pages never translate automatically based on the browser locale. Switching language keeps
the match/player and selected game. UI and commentary preferences have separate keys.

## Google account configuration

Reuse the existing Search Console property and GA4 stream once confirmed with Alfred.
Do not create replacement properties or invent IDs. `config/site.json` contains public
site configuration only: `searchConsoleVerification` and `gaMeasurementId`.
Both are currently null. There are no Google account passwords, API keys, or tokens here.

1. Confirm URL-prefix property `https://jaisingz.github.io/lol-esports-watch-hub/`.
2. Put the existing HTML tag content value into `searchConsoleVerification`, build and deploy.
3. Complete ownership verification, then submit
   `https://jaisingz.github.io/lol-esports-watch-hub/sitemap.xml`.
4. Inspect home, one match, one team and one player URL. Record submission separately from
   actual indexing and search ranking. A sitemap is not an indexing guarantee.
5. Set the existing GA4 Measurement ID. In the GA4 web stream's Enhanced Measurement settings,
   **disable automatic page views, including history-change page views**, since the code sends
   these manually. Also disable automatic outbound-click/form/search capture; use only the
   explicit allowed events below. Check this account-side setting before enabling production.
6. Use a developer-traffic filter in Testing first and then Active to exclude DebugView traffic
   from the normal growth reports. Never claim this setting is done without account evidence.

The implementation does not modify a host-root robots file or other repositories, and does
not use `VideoObject` because videos are watched on external platforms.

## Analytics and consent

The tag is not loaded before consent, after rejection, with a missing ID, or on localhost
without explicit debug mode. An accepted choice is remembered. The footer can reopen
preferences. Withdrawal disables the property immediately and reloads without loading it.
Blocked storage/tag/network must never block navigation or watching.

On localhost, enable debug with `sessionStorage.setItem('worlds.analytics.debug','1')`,
then reload after a real Measurement ID is configured. Debug mode is a session setting,
not a public URL parameter, and sends `debug_mode: true`. Clear it after testing.

| Event | Parameters |
| --- | --- |
| `page_view` | `page_type`, `canonical_path`, `interface_language` |
| `watch_click` | above + `match_id`, `video_id`, `platform`, `commentary_language`, `video_type`, `entry_position`, first click only: `first_watch_seconds` |
| `commentary_change` | common + `from_language`, `to_language` |
| `match_view_change` | common + `match_id`, `target_view` |
| `share_click` | common + `entity_id`, `share_method` |

Register low-cardinality event parameters as custom dimensions, and `first_watch_seconds`
as a custom metric in seconds. Avoid registering every match/video ID as a report dimension
unless needed; high-cardinality reports can become less useful. Entity/query/hash parameters
are omitted from automatic page location; no free search text or complete external URLs are
sent. Referrer query strings are stripped. View/game changes are not extra page views.

## Seven-day baseline report

- Natural-search landing sessions: `Session default channel group = Organic Search`, by landing page.
- Watching sessions: session segment containing `watch_click`; this is intent, not playback success.
- Match-page watch click rate: distinct sessions with match-page `watch_click` / distinct sessions
  with match-page `page_view`, under the same date/filter. Do not divide raw event counts.
- First-watch delay: `first_watch_seconds` for first click on each entity visit; show median where
  the chosen exploration/export supports it, otherwise label the displayed average accurately.
- Seven-day return: retention cohort of consenting users who first visited during the baseline;
  wait the full follow-up window. A seven-day baseline alone cannot finish every cohort's return rate.
- Search Console separately: queries, impressions, clicks, CTR and indexing. Never try to join a
  search query to an individual GA4 user.

These measurements exclude rejected/blocked analytics. Account verification, sitemap submission,
DebugView delivery and public deployment remain pending until the external configuration and
layout approval are available.

## Validation evidence (2026-10-31)

- 163 generated English pages: 46 matches, 19 teams, 96 players, home and schedule.
- 156 indexable pages; 7 matches with neither opponent known are noindex.
- 60 Node tests passed after review fixes.
- Browser acceptance: 85 checks, five English page types at 1440/390/430px, original seven
  non-English languages at those widths, JS-disabled match/stat/video links, language and
  game preservation, consent rejection, commentary persistence, no runtime errors.
- An additional 10 edge checks cover per-game commentary fallback, storage denial, true 404,
  cross-timezone dates and default/hide scores. Google-account validation is not included in the local browser result.

References: [Google page views](https://developers.google.com/analytics/devguides/collection/ga4/views),
[Search Console ownership](https://support.google.com/webmasters/answer/9008080),
[Consent mode](https://developers.google.com/tag-platform/security/guides/consent).
