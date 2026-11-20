// Sunset Platinum — the hand-in program (Node 22, standard library only).
//
// What it does, in three steps:
//   1. Takes the guide in app/ and the screenshots in screenshots/ beside this file.
//   2. Copies both trees into the output directory the grader reads
//      (/output, or $MAKEFUN_OUTPUT_DIR when you run it yourself).
//   3. Writes /output/dossier.json with the vendored make.fun library, so the
//      judge reads the same summary the scorer rebuilds and compares byte for byte.
//
// The guide itself is plain static files — no build step, no network at run time.
// vendor/makefun-frontend.ts stays exactly as the kit shipped it: the scorer
// requires the dossier to match what its own copy of that library writes.
//
// Run it yourself with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shotDir = join(repoRoot, 'screenshots');

function clearOutput() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
}

function copyGuide() {
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(shotDir)) {
    cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });
  }
}

function writeDossier() {
  // The gate's own caps, from the kit: dossier text at most 163,840 bytes,
  // at most 4 screenshots of at most 256 KiB, app/ at most 993 files and 48 MiB.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

clearOutput();
copyGuide();
writeDossier();
