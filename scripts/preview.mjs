import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commercePath, renderCommercePreview } from './commerce-preview.mjs';

const root = fileURLToPath(new URL('../docs', import.meta.url));
const port = Number(process.env.PORT || 4173);
const previewAssets = new Map(['commerce.css', 'commerce.js'].map((name) => [
  commercePath + name, fileURLToPath(new URL('../preview/' + name, import.meta.url))
]));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function send(request, response, contents, type) {
  response.writeHead(200, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(contents),
    'X-Content-Type-Options': 'nosniff'
  }).end(request.method === 'HEAD' ? undefined : contents);
}

createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === commercePath.slice(0, -1)) {
      response.writeHead(308, { Location: commercePath + url.search }).end();
      return;
    }
    if (url.pathname === commercePath) {
      send(request, response, renderCommercePreview(), types['.html']);
      return;
    }
    const previewAsset = previewAssets.get(url.pathname);
    if (previewAsset) {
      send(request, response, await readFile(previewAsset), types[extname(previewAsset)]);
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    let path = resolve(root, '.' + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        response.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
        return;
      }
      path = join(path, 'index.html');
    }

    send(request, response, await readFile(path), types[extname(path)] ?? 'application/octet-stream');
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page not found.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Local: http://127.0.0.1:${port}/`);
  console.log(`Store preview: http://127.0.0.1:${port}${commercePath}`);
});
