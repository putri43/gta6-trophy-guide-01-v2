# Sunset Platinum — GTA VI Trophy Guide & Tracker

[![Rank](https://make.fun/api/competitions/gta6-trophy-guide-01/badge/rank.svg?repo=putri43/gta6-trophy-guide-01-v2)](https://make.fun/bounty/gta6-trophy-guide-01)
[![Reward](https://make.fun/api/competitions/gta6-trophy-guide-01/badge/reward.svg?repo=putri43/gta6-trophy-guide-01-v2)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun](https://make.fun/api/competitions/gta6-trophy-guide-01/badge/entry.svg?repo=putri43/gta6-trophy-guide-01-v2)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline, open-source guide and tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI — built for the [gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01) bounty on make.fun.

## What it does

- **Checklist tracker** — every trophy with its official name, description and grade; tick them off as you earn them. Progress, notes and counters are saved in your browser (localStorage), with export and import.
- **Filters** — search, filter by kind (story, missions, strangers, activities, collectibles, combat, money, secrets) and by grade, plus a missable-only view.
- **Spoiler setting** — hidden story trophies stay masked (name, description and guide) until you earn them or turn spoilers off.
- **Roadmap to the platinum** — five stages in play order, each with its own progress bar and per-trophy links.
- **Missables flagged** — the six trophies built around one-time moments, with an honest note: no trophy is confirmed permanently missable yet.
- **Next Up planner** — the next trophies to chase, stage by stage, with grade counters.
- **Guides in our own words** — every trophy has a guide that cites its sources (the official list on Exophase for name, description and grade; PSNProfiles for PSN progress targets). Where a step is not pinned down by the official description, the guide says plainly it has not been checked in the game yet.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at run time — every file the app loads lives under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
