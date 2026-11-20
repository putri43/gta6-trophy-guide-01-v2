// Sunset Platinum — screenshot driver. Serves app/ with serve.ts, opens it in the
// Playwright headless shell over CDP (Node's built-in WebSocket, no libraries),
// seeds 13 of 55 trophies earned, and takes the 4 screenshots in shots.json.
//
//   node scripts/shots.mjs [--port 8080] [--out screenshots]
//
// It prints every request the page made, so you can check the guide loads only
// its own files, and the byte size of each screenshot (cap 256 KiB).

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..');
const shellBin = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const port = Number(args.get('--port') || 8080);
const outDir = args.get('--out') || join(repo, 'screenshots');
const debugPort = 9333;

const VIEWS = [
  { file: '1-cover.jpg', hash: '#/trophies?open=17' },
  { file: '2-roadmap.jpg', hash: '#/roadmap' },
  { file: '3-missables.jpg', hash: '#/missables' },
  { file: '4-next-up.jpg', hash: '#/next' },
];

// 13 earned, as the house guides seed them: story through Chapter 1, a few
// activities, one missable, and a head start on the money stage.
const SEED = {
  earned: { 2: true, 3: true, 8: true, 15: true, 16: true, 17: true, 20: true, 21: true, 28: true, 33: true, 42: true, 44: true, 52: true },
  notes: { 17: 'Gold each range — take it slow, learn the pattern first.' },
  counts: { 17: 12 },
  spoiler: true,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('serve.ts did not answer on port ' + port);
}

function startServer() {
  const child = spawn('node', ['serve.ts'], {
    cwd: repo,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  child.stderr.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  return child;
}

function startShell() {
  return spawn(shellBin, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

async function listTargets() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${debugPort}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('no CDP page target appeared');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.waiters = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.waiters.has(msg.id)) {
        const { resolve, reject } = this.waiters.get(msg.id);
        this.waiters.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiters.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result ? r.result.value : undefined;
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const server = startServer();
  const shell = startShell();
  const requests = [];
  try {
    await waitForServer();
    const target = await listTargets();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.method === 'Network.requestWillBeSent') {
        requests.push(msg.params.request.url);
      }
    });

    const base = `http://localhost:${port}/`;
    await cdp.send('Page.navigate', { url: base });
    await sleep(1200);
    await cdp.eval(`localStorage.setItem('sunset-platinum-v3', ${JSON.stringify(JSON.stringify(SEED))})`);
    // A hash-only navigation does not reload the document, so the app would
    // keep the blank state it booted with — reload so it boots on the seed.
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(1200);

    for (const shot of VIEWS) {
      await cdp.send('Page.navigate', { url: base + shot.hash });
      await sleep(1400);
      await cdp.eval('window.scrollTo(0, 0)');
      const shot64 = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
      const bytes = Buffer.from(shot64.data, 'base64');
      writeFileSync(join(outDir, shot.file), bytes);
      console.log(`${shot.file}: ${bytes.length} bytes`);
    }

    const outside = requests.filter((u) => !u.startsWith(`http://localhost:${port}`) && !u.startsWith('data:'));
    console.log(`requests: ${requests.length} total, ${outside.length} outside localhost`);
    for (const u of new Set(requests)) console.log('  ' + u);
    if (outside.length) console.log('OUTSIDE REQUESTS: ' + outside.join(', '));
    ws.close();
  } finally {
    shell.kill('SIGTERM');
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
