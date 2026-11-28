import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { configFrom, publicRoot } from './config.mjs';
import { openDatabase } from './database.mjs';
import { createStore } from './store.mjs';
import { createNativeStore } from './native-store.mjs';
import { createNewsletter, emailPage } from './newsletter.mjs';
import { clientAddress, hostedLimiter, HttpError, limiter, readBody, readJson, reply, secureHeaders, writeOrigin } from './security.mjs';

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

export async function createRequestHandler(config, fetcher = fetch, options = {}) {
  const root = options.staticFiles === false ? null : await realpath(publicRoot);
  const database = Object.hasOwn(options, 'database') ? options.database : openDatabase(config.dbPath);
  const rate = database?.remote ? hostedLimiter(database) : limiter();
  const store = config.store.enabled ? createStore(config, database, fetcher) : null;
  const nativeStore = config.nativeStore && database ? createNativeStore(config, database, fetcher) : null;
  const newsletter = config.newsletter.manageEnabled && database ? createNewsletter(config, database, fetcher) : null;
  const host = new URL(config.origin).host.toLowerCase();

  async function serveFile(request, response, url) {
    httpMethod(request, response, 'GET', 'HEAD');
    if (!root) throw new HttpError(404, 'This page could not be found.');
    let name;
    try {
      name = decodeURIComponent(url.pathname);
    } catch {
      throw new HttpError(400, 'Invalid address.');
    }
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
      content = content.toString('utf8');
      if (!content.includes('data-server-mode="true"')) content = content.replace('<html ', '<html data-server-mode="true" ');
    } else {
      response.setHeader('Cache-Control', 'public, max-age=300');
    }
    reply(request, response, 200, content, types[extension]);
  }

  async function handle(request, response) {
    secureHeaders(response, config.secure, config.razorpay.enabled);
    try {
      if (request.headers.host?.toLowerCase() !== host || !request.url?.startsWith('/') || request.url.startsWith('//')) {
        throw new HttpError(400, 'Invalid request address.');
      }
      const url = new URL(request.url, config.origin);
      const path = url.pathname;
      const address = clientAddress(request, config);

      if (!nativeStore && (path.startsWith('/api/shop/') || path === '/api/contact' || path === '/api/waitlist')) {
        throw new HttpError(404, 'This endpoint is inactive.');
      }

      if (path === '/api/health') {
        httpMethod(request, response, 'GET', 'HEAD');
        reply(request, response, 200, { ok: true });
      } else if (path === '/api/config') {
        httpMethod(request, response, 'GET', 'HEAD');
        const { enabled, domain, categoryHandles, featuredCollection, accountUrl } = config.store;
        if (store && request.method === 'GET') store.session(request, response);
        reply(request, response, 200, {
          store: { enabled, domain, categoryHandles, featuredCollection, accountUrl },
          nativeStore: Boolean(nativeStore),
          razorpay: { enabled: config.razorpay.enabled, keyId: config.razorpay.enabled ? config.razorpay.keyId : '' },
          supportEmail: config.supportEmail,
          newsletter: {
            resendEnabled: config.newsletter.enabled,
            localEnabled: Boolean(newsletter && config.newsletter.localEnabled)
          }
        });
      } else if (path === '/api/shop/catalog') {
        httpMethod(request, response, 'GET', 'HEAD');
        await rate('native-catalog:' + address, 120, 60);
        reply(request, response, 200, await nativeStore.getCatalog());
      } else if (path === '/api/shop/checkout') {
        httpMethod(request, response, 'POST');
        writeOrigin(request, config);
        await rate('native-checkout:' + address, 30, 300);
        const input = await readJson(request);
        const result = await nativeStore.createOrder(input);
        reply(request, response, 201, result);
      } else if (path === '/api/shop/razorpay/verify') {
        httpMethod(request, response, 'POST');
        writeOrigin(request, config);
        await rate('native-verify:' + address, 30, 300);
        const input = await readJson(request);
        const result = await nativeStore.verifyRazorpayPayment(input);
        reply(request, response, 200, result);
      } else if (path === '/api/shop/razorpay/cancel') {
        httpMethod(request, response, 'POST');
        writeOrigin(request, config);
        await rate('native-cancel:' + address, 30, 300);
        const input = await readJson(request);
        const result = await nativeStore.cancelRazorpayOrder(input);
        reply(request, response, 200, result);
      } else if (path === '/api/shop/orders/track') {
        httpMethod(request, response, 'GET', 'HEAD');
        await rate('native-track:' + address, 15, 300);
        const result = await nativeStore.trackOrder(url.searchParams.get('id'), url.searchParams.get('contact'));
        reply(request, response, 200, result);
      } else if (path === '/api/contact') {
        httpMethod(request, response, 'POST');
        writeOrigin(request, config);
        await rate('contact:' + address, 20, 3600);
        const input = await readJson(request);
        const result = await nativeStore.createSupportTicket(input);
        reply(request, response, 201, result);
      } else if (path === '/api/waitlist') {
        httpMethod(request, response, 'POST');
        writeOrigin(request, config);
        await rate('waitlist:' + address, 30, 3600);
        const input = await readJson(request);
        const result = await nativeStore.joinWaitlist(input);
        reply(request, response, 201, result);
      } else if (path.startsWith('/api/store/')) {
        httpMethod(request, response, 'GET', 'HEAD');
        if (!config.store.enabled) throw new HttpError(404, 'Shopify Storefront integration is disabled.');
        await rate('catalogue:' + address, 120, 60);
        const result = await store.catalogue(path.slice('/api/store/'.length), url.searchParams, address);
        reply(request, response, 200, result);
      } else if (path === '/api/cart') {
        httpMethod(request, response, 'GET', 'POST');
        if (!config.store.enabled) throw new HttpError(404, 'Shopify Storefront cart is disabled.');
        if (request.method === 'POST') writeOrigin(request, config);
        await rate('cart:' + address, 65, 60);
        const command = request.method === 'POST' ? await readJson(request) : { action: 'read' };
        const session = store.session(request, response);
        const result = await store.cart(session, command, address);
        reply(request, response, 200, result);
      } else if (path === '/api/newsletter') {
        httpMethod(request, response, 'POST');
        if (!newsletter || (!config.newsletter.enabled && !config.newsletter.localEnabled)) {
          throw new HttpError(404, 'Signups are currently closed.');
        }
        writeOrigin(request, config);
        await rate('signup:' + address, 12, 3600);
        const input = await readJson(request);
        if (config.newsletter.enabled) {
          await newsletter.subscribe(input);
          reply(request, response, 202, { accepted: true, mode: 'resend' });
        } else {
          const result = await newsletter.subscribeLocal(input);
          reply(request, response, 201, result);
        }
      } else if (path === '/newsletter/confirm' || path === '/newsletter/unsubscribe') {
        httpMethod(request, response, 'GET', 'HEAD', 'POST');
        if (!newsletter) throw new HttpError(404, 'This page could not be found.');
        response.setHeader('Referrer-Policy', 'strict-origin');
        const action = path.slice('/newsletter/'.length);
        if (request.method === 'POST') {
          writeOrigin(request, config);
          await rate('email-action:' + address, 30, 60);
          const form = new URLSearchParams(await readBody(request, 'application/x-www-form-urlencoded'));
          const result = await newsletter.change(action, form.get('token') || '');
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

  return { handle, database };
}

export async function createApp(config = configFrom(), fetcher = fetch) {
  const { handle, database } = await createRequestHandler(config, fetcher);
  const server = createServer(
    {
      maxHeaderSize: 8192,
      headersTimeout: 10000,
      requestTimeout: 15000,
      keepAliveTimeout: 5000
    },
    handle
  );
  server.maxRequestsPerSocket = 100;
  server.on('close', () => database.close());
  return server;
}
