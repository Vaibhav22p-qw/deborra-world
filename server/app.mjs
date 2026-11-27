import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { configFrom, publicRoot } from './config.mjs';
import { openDatabase } from './database.mjs';
import { createStore } from './store.mjs';
import { createNewsletter, emailPage } from './newsletter.mjs';
import { clientAddress, HttpError, limiter, readBody, readJson, reply, secureHeaders, writeOrigin } from './security.mjs';

const html = 'text/html; charset=utf-8';
const types = {
  '.html': html,
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function inside(root, target) {
  const path = relative(root, target);
  return !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep);
}

function httpMethod(request, response, ...allowed) {
  if (allowed.includes(request.method)) return;
  response.setHeader('Allow', allowed.join(', '));
  throw new HttpError(405, 'This request method is unavailable.');
}

export async function createApp(config = configFrom(), fetcher = fetch) {
  const root = await realpath(publicRoot);
  const database = openDatabase(config.dbPath);
  const rate = limiter();
  const store = createStore(config, database, fetcher);
  const newsletter = createNewsletter(config, database, fetcher);
  const host = new URL(config.origin).host.toLowerCase();

  async function serveFile(request, response, url) {
    httpMethod(request, response, 'GET', 'HEAD');
    let name;
    try { name = decodeURIComponent(url.pathname); } catch { throw new HttpError(400, 'Invalid address.'); }
    if (name.includes('\\') || name.includes('\0') || name.split('/').some((part) => part.startsWith('.'))) {
      throw new HttpError(404, 'This page could not be found.');
    }
    let file = resolve(root, '.' + name);
    try {
      if (!inside(root, file) || !inside(root, await realpath(file))) throw new Error('Outside the site');
      if ((await stat(file)).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          response.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
          return;
        }
        file = join(file, 'index.html');
      }
      file = await realpath(file);
      if (!inside(root, file) || !types[extname(file)] || !(await stat(file)).isFile()) throw new Error('Invalid file');
    } catch {
      throw new HttpError(404, 'This page could not be found.');
    }
    const extension = extname(file);
    let content = await readFile(file);
    if (extension === '.html') {
      if (config.store.enabled && request.method === 'GET') store.session(request, response);
      content = content.toString('utf8').replace('<html ', '<html data-server-mode="true" ');
    } else {
      response.setHeader('Cache-Control', 'public, max-age=300');
    }
    reply(request, response, 200, content, types[extension]);
  }

  async function handle(request, response) {
    secureHeaders(response, config.secure);
    try {
      if (request.headers.host?.toLowerCase() !== host || !request.url?.startsWith('/') || request.url.startsWith('//')) {
        throw new HttpError(400, 'Invalid request address.');
      }
      const url = new URL(request.url, config.origin);
      const path = url.pathname;
      const address = clientAddress(request, config);
      if (path === '/api/health') {
        httpMethod(request, response, 'GET', 'HEAD');
        reply(request, response, 200, { ok: true });
      } else if (path === '/api/config') {
        httpMethod(request, response, 'GET', 'HEAD');
        const { enabled, domain, categoryHandles, featuredCollection, accountUrl } = config.store;
        reply(request, response, 200, {
          store: { enabled, domain, categoryHandles, featuredCollection, accountUrl },
          newsletter: config.newsletter.enabled
        });
      } else if (path.startsWith('/api/store/')) {
        httpMethod(request, response, 'GET', 'HEAD');
        if (!config.store.enabled) throw new HttpError(404, 'The shop is in pre-launch.');
        rate('catalogue:' + address, 120, 60);
        const result = await store.catalogue(path.slice('/api/store/'.length), url.searchParams, address);
        reply(request, response, 200, result);
      } else if (path === '/api/cart') {
        httpMethod(request, response, 'GET', 'POST');
        if (!config.store.enabled) throw new HttpError(404, 'The shop is in pre-launch.');
        if (request.method === 'POST') writeOrigin(request, config);
        rate('cart:' + address, 65, 60);
        const command = request.method === 'POST' ? await readJson(request) : { action: 'read' };
        const session = store.session(request, response);
        const result = await store.cart(session, command, address);
        reply(request, response, 200, result);
      } else if (path === '/api/newsletter') {
        httpMethod(request, response, 'POST');
        if (!config.newsletter.enabled) throw new HttpError(404, 'Signups are currently closed.');
        writeOrigin(request, config);
        rate('signup:' + address, 12, 3600);
        const input = await readJson(request);
        await newsletter.subscribe(input);
        reply(request, response, 202, { accepted: true });
      } else if (path === '/newsletter/confirm' || path === '/newsletter/unsubscribe') {
        httpMethod(request, response, 'GET', 'HEAD', 'POST');
        if (config.newsletter.secret.length < 32) throw new HttpError(404, 'This page could not be found.');
        // Keep the form's Origin header and avoid passing its token in a referrer URL.
        response.setHeader('Referrer-Policy', 'strict-origin');
        const action = path.slice('/newsletter/'.length);
        if (request.method === 'POST') {
          writeOrigin(request, config);
          rate('email-action:' + address, 30, 60);
          const form = new URLSearchParams(await readBody(request, 'application/x-www-form-urlencoded'));
          const result = newsletter.change(action, form.get('token') || '');
          reply(request, response, result ? 200 : 400, emailPage(action, '', result), html);
        } else {
          reply(request, response, 200, emailPage(action, url.searchParams.get('t') || ''), html);
        }
      } else {
        await serveFile(request, response, url);
      }
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const expected = error instanceof HttpError;
      if (!expected) console.error('DEBORRA request failed unexpectedly.');
      reply(request, response, expected ? error.status : 500, {
        error: expected ? error.message : 'The website is temporarily unavailable.'
      });
    }
  }

  const server = createServer({
    maxHeaderSize: 8192,
    headersTimeout: 10000,
    requestTimeout: 15000,
    keepAliveTimeout: 5000
  }, handle);
  server.maxRequestsPerSocket = 100;
  server.on('close', () => database.close());
  return server;
}
