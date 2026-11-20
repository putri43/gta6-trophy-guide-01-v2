// Sunset Platinum — screenshot driver (Node standard library only).
// Drives the Playwright headless shell over CDP with the built-in WebSocket:
// for each scene in shots.json it opens the guide on the local server, waits
// for it to settle, and saves a JPEG. It also logs every network request so
// the offline check is evidence, not a claim.
//
//   node serve.ts --port 8090 &           # in another shell
//   node scripts/shots.mjs --port 8090    # writes screenshots/
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELL = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const DEBUG_PORT = 9223;

const args = process.argv.slice(2);
const get = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const appPort = get('--port', '8090');
const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scenes = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf-8'));
mkdirSync(join(repo, 'screenshots'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

let msgId = 0;
const pending = new Map();
let ws;
const seenUrls = [];

function send(method, params, sessionId) {
  const id = ++msgId;
  return new Promise((resolvePromise, reject) => {
    pending.set(id, { resolve: resolvePromise, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function main() {
  const shell = spawn(SHELL, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        version = await json(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!version?.webSocketDebuggerUrl) throw new Error('headless shell did not open its debug port');
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolvePromise, reject) => {
      ws.onopen = () => resolvePromise();
      ws.onerror = () => reject(new Error('CDP websocket failed to open'));
    });
    ws.onmessage = (event) => {
      const data = JSON.parse(String(event.data));
      if (data.id !== undefined) {
        const waiter = pending.get(data.id);
        if (!waiter) return;
        pending.delete(data.id);
        if (data.error) waiter.reject(new Error(data.error.message));
        else waiter.resolve(data.result ?? {});
      } else if (data.method === 'Network.requestWillBeSent') {
        const req = data.params?.request;
        if (req?.url) seenUrls.push(req.url);
      }
    };
    const target = await send('Target.createTarget', { url: 'about:blank' });
    const targetId = target.targetId;
    const attached = await send('Target.attachToTarget', { targetId, flatten: true });
    const session = attached.sessionId;
    await send('Page.enable', {}, session);
    await send('Runtime.enable', {}, session);
    await send('Network.enable', {}, session);

    for (const scene of scenes) {
      await send('Emulation.setDeviceMetricsOverride', { width: scene.viewport.width, height: scene.viewport.height, deviceScaleFactor: 1, mobile: false }, session);
      await send('Page.navigate', { url: `http://127.0.0.1:${appPort}${scene.path}` }, session);
      await sleep(2500);
      const ready = await send('Runtime.evaluate', { expression: `document.readyState + '|' + document.querySelectorAll('.card').length`, returnByValue: true }, session);
      const value = ready.result?.value ?? '?';
      console.log(`${scene.file}: ready=${value}`);
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, session);
      const bytes = Buffer.from(shot.data, 'base64');
      writeFileSync(join(repo, 'screenshots', scene.file), bytes);
      console.log(`${scene.file}: ${bytes.length} bytes`);
    }

    const outside = seenUrls.filter((u) => !u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && u !== 'about:blank');
    console.log(`requests seen: ${seenUrls.length}, outside local server: ${outside.length}`);
    for (const u of [...new Set(outside)]) console.log(`  EXTERNAL: ${u}`);
  } finally {
    try { ws?.close(); } catch { /* already closed */ }
    shell.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
