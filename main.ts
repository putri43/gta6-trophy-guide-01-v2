// Sunset Platinum — hand-in program for gta6-trophy-guide-01.
//
// What it does, in order: checks the guide data is complete (55 trophies, one
// guide each, grade counts that add up), copies app/ and screenshots/ beside
// this file into the output directory, and writes dossier.json with the
// vendored make.fun library, which is the summary the judge reads. It runs on
// Node's standard library only, takes no arguments, and writes nothing
// outside the output directory.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader sets /output itself. vendor/makefun-frontend.ts stays exactly
// as the kit shipped it: the scorer rebuilds the dossier with its own copy
// and the two must match byte for byte.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repo = resolve(fileURLToPath(new URL('.', import.meta.url)));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  throw new Error(`sunset-platinum: ${message}`);
}

function checkGuide(): void {
  const raw = readFileSync(join(repo, 'app', 'data', 'trophies.json'), 'utf-8');
  const doc = JSON.parse(raw) as { trophies: Array<{ id: number; grade: string; guide: string; name: string }> };
  if (doc.trophies.length !== 55) fail(`expected 55 trophies, found ${doc.trophies.length}`);
  const grades = new Map<string, number>();
  for (const trophy of doc.trophies) {
    if (!trophy.guide || trophy.guide.trim().length < 20) fail(`trophy ${trophy.id} (${trophy.name}) has no guide`);
    grades.set(trophy.grade, (grades.get(trophy.grade) ?? 0) + 1);
  }
  const expected: Record<string, number> = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  for (const [grade, count] of Object.entries(expected)) {
    if (grades.get(grade) !== count) fail(`expected ${count} ${grade}, found ${grades.get(grade) ?? 0}`);
  }
  const shots = readdirSync(join(repo, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (shots.length < 3 || shots.length > 4) fail(`expected 3 or 4 screenshots, found ${shots.length}`);
  for (const shot of shots) {
    const size = statSync(join(repo, 'screenshots', shot)).size;
    if (size > 262144) fail(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
  }
}

checkGuide();

mkdirSync(destination, { recursive: true });
cpSync(join(repo, 'app'), join(destination, 'app'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(repo, 'screenshots'))) {
  cpSync(join(repo, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(destination, 'dossier.json'), dossier);
console.log(`dossier written: ${dossier.length} bytes to ${destination}`);
