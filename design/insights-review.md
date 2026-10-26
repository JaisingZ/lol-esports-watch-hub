# Insights review — implementation and coverage

The user approved continuation after reviewing the prototype on 2026-10-26. This branch prepares the approved layout for release; production data gaps below remain explicit. Open `review.html` in Vite, or run `npm run build:review`. The review fixture is imported only by the review entry point; production imports no demo records.

## Coverage at 2026-10-26

- Existing schedule: 46 matches, 19 teams, 319 video associations / 103 original recordings (existing collection, not playback certification).
- Region: user explicitly left it unconfirmed. No region is certified; production `regions.json` remains empty.
- Published playback passes: 0. The new UI hides every unverified, failed or expired watch link and keeps the schedule/data views available.
- Production game/player/history/statistics/heat snapshots: 0. All figures in the design review are fictional and labelled. Watch buttons are disabled.

## Actual browser trials

YouTube `https://www.youtube.com/watch?v=gLw65-r-MSI`: official LoL Esports title was visible, but the player required login to confirm the viewer is not a bot. At 2026-10-26T01:17:51Z the video stayed at time 0, readyState 0, zero dimensions. Not playback verified; no restriction bypass attempted.

Twitch `https://www.twitch.tv/videos/2910526344`: the Riot Games channel linked this recording as HLE vs IG / Worlds 2026 / Swiss Day 3. At 2026-10-26T01:33:37Z, the media element advanced at 1280×720 at start (+12.64s), middle (+11.97s) and 98% (+12.33s). The last probe was 98%, not a completed end-of-file audit. Region remains unconfirmed; audio, individual game offsets, startup latency and long-term stability have not been certified. This is a pending candidate, not a published playable source. The channel itself was offline, so no live pass exists.

A location-service query was rejected by automatic approval review before execution; no alternative geolocation request was made. Region is manual, per user choice.

## Free statistics feasibility

Public sample pages were reachable:
- BO1: https://gol.gg/game/stats/83654/page-game/
- BO3: https://gol.gg/game/stats/83659/page-summary/
- Historical player: https://gol.gg/players/player-stats/48/season-ALL/split-ALL/tournament-Worlds%202025%20Main%20Event/champion-ALL/

These establish that sample fields exist, not permission for bulk redistribution. Automated reuse permission, full per-game coverage and stable identity reconciliation remain unconfirmed. No third-party statistics were copied into production. Rounded yearly averages cannot reconstruct exact lifetime counts; a BO3 summary cannot substitute for individual game rows. Oracle's Elixir was inaccessible (403) in this environment. No importer claims a completed free-data integration yet.

Champion thumbnails in the review use Riot Data Dragon 16.21.1, only as an explicitly fictional match patch. Source manifest: `design/champion-asset-sources.json`. Actual game imports must carry their actual patch. Reference: https://developer.riotgames.com/docs/lol#data-dragon

## Maintenance contract

- `games.json`: game and match IDs, actual patch, final BP (no invented pick order), outcome and team totals, source URL.
- `players.json`: stable player ID, aliases, current team/role, confirmed 2026 participant flag.
- `player-games.json`: one row per stable player/game; original season/team and nullable missing metrics. Missing years are not zero.
- `verification.json`: target (`platform:originalID` or live source ID), kind, region, regionConfirmed, checkedAt, status, browser/network, evidence, advancing samples; each segment requires its own position check.
- `regions.json`: only explicitly established test regions. Never infer from interface language.
- `video-metrics.json`: original key, exact views, observedAt, publishedAt. No rounded labels or live viewer counts.
- Latest failure revokes a prior pass. VOD validity is seven days, live one day. At least ten seconds of progress at each required sample position.
- Hot score: platform-local tie-midrank video percentile × .7 + channel percentile × .3. Channel totals include fresh, deduped collected originals; ranking candidates also require playback proof. Views older than 24 hours are excluded.
- Existing hourly schedule sync does not manufacture playback passes or statistics. These new tables remain independent of schedule collection.

## Remaining release conditions

The four layouts are approved. A confirmed viewing region and completed source trials are still required to publish playback availability. Confirm permitted statistics access and reconcile real samples before publishing real data. Review may proceed with empty production statistics; it must never substitute fictional records. No new production deployment was performed in this phase.
