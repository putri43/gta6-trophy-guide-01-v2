// Sunset Platinum — local static server for the guide (development only).
// Serves app/ on http://127.0.0.1:8080 so the screenshots can be taken and the
// guide previewed. Usage: `node serve.ts` or `node serve.ts --port 8090`.
// Node standard library only; it refuses every path outside app/.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const cli = process.argv.slice(2);
const portFlag = cli.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(cli[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function answer(response: import('node:http').ServerResponse, code: number, text: string): void {
  response.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(text);
}

createServer((request, response) => {
  let path: string;
  try {
    path = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    answer(response, 400, 'bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(appRoot, normalize(path)));
  if (file !== appRoot && !file.startsWith(appRoot + sep)) {
    answer(response, 403, 'forbidden');
    return;
  }
  let bytes: number;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    bytes = info.size;
  } catch {
    answer(response, 404, 'not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': bytes,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Sunset Platinum guide on http://127.0.0.1:${port}`);
});
