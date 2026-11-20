// Sunset Platinum — a tiny static server for trying the guide locally.
// Serves app/ at the root on http://localhost:8080 (or $PORT). Nothing else:
// no proxying, no rewriting, and every request is logged so you can see the
// guide loads only its own files.
//
//   node serve.ts
//   open http://localhost:8080

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('app', import.meta.url)));
const port = Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const joined = normalize(join(root, decoded === '/' ? 'index.html' : decoded));
  return joined === root || joined.startsWith(root + sep) ? joined : null;
}

const server = createServer(async (req, res) => {
  const file = safePath(req.url || '/');
  if (!file) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    res.end('bad path');
    return;
  }
  try {
    const body = await readFile(file);
    console.log(`${req.method} ${req.url} -> ${file.slice(root.length) || '/'}`);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    const code = err && err.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code, { 'content-type': 'text/plain' });
    res.end(code === 404 ? 'not found' : 'server error');
  }
});

server.listen(port, () => {
  console.log(`Sunset Platinum serving app/ at http://localhost:${port}`);
});
