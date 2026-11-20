// Retakes the four screenshots in screenshots/ with a headless Chromium
// (1280x800, JPEG quality 82) against the local server, with progress
// seeded at 13 of 55 earned — the same state the kit's reference renders
// use. Node standard library only; drives Chromium over CDP.
//
//   node serve.ts --port 8090   (in another shell, or set SERVE_URL)
//   node scripts/shots.mjs
//
// Expects the headless shell from the Playwright cache, or CHROME_BIN to
// point at a Chromium. Writes screenshots/<file> for every entry of
// shots.json. Deterministic: same seed, same files, same pixels.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const shots = JSON.parse(readFileSync(join(here, "shots.json"), "utf8"));
const outDir = join(here, "screenshots");
const base = process.env.SERVE_URL ?? "http://127.0.0.1:8090";
const port = Number(process.env.CDP_PORT ?? 9223);
const chrome =
  process.env.CHROME_BIN ??
  join(homedir(), ".cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell");

// 13 earned: the story run through Chapter 4 plus two early activities.
const EARNED = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 16, 21];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function cdp(ws, method, params = {}) {
  const id = ++cdp.next;
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
cdp.next = 0;

async function main() {
  mkdirSync(outDir, { recursive: true });
  const child = spawn(
    chrome,
    ["--headless", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, "--window-size=1280,800", "about:blank"],
    { stdio: "ignore" },
  );
  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try { targets = await json(`http://127.0.0.1:${port}/json/list`); break; }
      catch { await sleep(250); }
    }
    if (!targets) throw new Error("Chromium did not answer on the debugging port");
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", reject);
    });
    try {
      await cdp(ws, "Page.enable");
      await cdp(ws, "Runtime.enable");
      for (const shot of shots) {
        // shots.json paths are hash routes like "#/guide?open=17".
        const url = base + "/" + shot.path.replace(/^\/?#/, "#");
        // Load the origin, seed progress, then reload so the app boots
        // with the seeded state, and finally go to the shot's route.
        await cdp(ws, "Page.navigate", { url: base + "/" });
        await sleep(400);
        const seed = {
          earned: Object.fromEntries(EARNED.map((id) => [id, true])),
          notes: {},
          spoilers: shot.file === "4-next-up.jpg",
        };
        await cdp(ws, "Runtime.evaluate", {
          expression: `localStorage.setItem("sunset-platinum-v2", ${JSON.stringify(JSON.stringify(seed))}); "seeded"`,
          awaitPromise: false,
        });
        await cdp(ws, "Page.reload", { ignoreCache: true });
        await sleep(900);
        await cdp(ws, "Page.navigate", { url });
        await sleep(1200);
        const { data } = await cdp(ws, "Page.captureScreenshot", { format: "jpeg", quality: 82 });
        const file = join(outDir, shot.file);
        writeFileSync(file, Buffer.from(data, "base64"));
        console.log(`wrote ${shot.file}`);
      }
    } finally {
      ws.close();
    }
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
