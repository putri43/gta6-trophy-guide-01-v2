# gta6-trophy-guide-01

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/putri43/gta6-trophy-guide-01-v2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/putri43/gta6-trophy-guide-01-v2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Sunset Platinum — a free, open-source, offline guide and tracker for all 55 GTA VI trophies on PlayStation 5: the official names, descriptions and grades, a checklist saved in the browser with export and import, filters by kind and grade, a spoiler setting that hides story trophies until earned, a 5-stage roadmap to the platinum, the six setup-dependent missables flagged, and a guide for every trophy in our own words that cites its sources. The look is original (a Vice City sunset theme drawn in CSS) — no Rockstar logo or official artwork.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or open `app/index.html` from any static server. It works with the network off: every file it loads lives under `app/`, and progress never leaves the browser except when you export it.

## Screenshots

`scripts/shots.mjs` retakes the four screenshots in `screenshots/` with a headless Chromium (1280×800, JPEG quality 82) against the local server, with progress seeded at 13 of 55 earned. Run it after `node serve.ts --port 8090`:

```sh
node scripts/shots.mjs
```

---

Entered on [make.fun](https://make.fun/?ref=amber-kestrel-87&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards
