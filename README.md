[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/putri43/gta6-trophy-guide-01-v2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/putri43/gta6-trophy-guide-01-v2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Sunset Platinum — GTA VI trophy guide

An offline guide and tracker for all 55 official GTA VI PlayStation 5 trophies: a checklist with search, grade and type filters, a spoiler-safe mode that masks story trophies until you earn them, per-trophy notes, progress export and import, a five-stage roadmap to the platinum, a watch-out list for the six missable-flavoured trophies, and a Next Up planner that picks the cheapest trophies left.

Every guide is written for this page in our own words. Trophy names and official descriptions are the game's own text; sources for the list are Exophase and PSNProfiles.

## Run it

```sh
node serve.ts            # serves app/ on http://127.0.0.1:8080
```

No build step, no network: the app is plain files under `app/` and loads nothing from outside itself.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the guide data (55 trophies, one guide each, grade counts 1 platinum / 2 gold / 6 silver / 46 bronze), copies `app/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored make.fun library.

## Shots

```sh
node serve.ts --port 8090 &
node scripts/shots.mjs --port 8090   # writes screenshots/
```

Four JPEGs, 1280×800: the guide, the roadmap, the missables page, and the Next Up planner.

## Layout

- `app/index.html` — the guide page (Guide / Roadmap / Missables / Next Up tabs)
- `app/css/guide.css` — the sunset theme
- `app/js/guide.js` — the whole app: filters, ticks, notes, export/import, planner
- `app/data/trophies.json` — all 55 trophies with own-words guides
- `app/data/roadmap.json` — the five stages
- `main.ts` — the hand-in program
- `serve.ts` — the local server
- `scripts/shots.mjs` — the screenshot driver (Node standard library, CDP)
- `vendor/makefun-frontend.ts` — the kit's library, unchanged
