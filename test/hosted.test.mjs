import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import gateway from '../api/gateway.mjs';
import { createRequestHandler } from '../server/app.mjs';
import { configFrom } from '../server/config.mjs';
import { openDatabase } from '../server/database.mjs';
import { hostedLimiter } from '../server/security.mjs';

async function listen(handler) {
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function asynchronousDatabase(sqlite) {
  return {
    remote: true,
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {
        async get(...args) { return statement.get(...args); },
        async run(...args) { return statement.run(...args); }
      };
    }
  };
}

test('Vercel gateway resolves its deployment URL and routes without opening a local database', async () => {
  const settingNames = ['VERCEL_URL', 'SHOPIFY_ENABLED', 'NEWSLETTER_ENABLED', 'NEWSLETTER_SECRET'];
  const original = Object.fromEntries(settingNames.map((name) => [name, process.env[name]]));
  for (const name of settingNames) delete process.env[name];
  process.env.VERCEL_URL = 'deborra-test.vercel.app';
  const server = await listen(gateway);
  function get(path, host = process.env.VERCEL_URL) {
    return new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: server.port, path, headers: { Host: host } }, async (res) => {
        const chunks = [];
        for await (const chunk of res) chunks.push(chunk);
        resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) });
      });
      req.on('error', reject);
      req.end();
    });
  }
  try {
    const health = await get('/api/gateway?_route=api%2Fhealth');
    assert.deepEqual(health, { status: 200, data: { ok: true } });
    const config = await get('/api/config');
    assert.equal(config.status, 200);
    assert.equal(config.data.store.enabled, false);
    assert.equal(config.data.newsletter.resendEnabled, false);
    assert.equal((await get('/api/gateway?_route=api/shop/checkout')).status, 404);
    assert.equal((await get('/api/health', 'unrecognised.example')).status, 400);
  } finally {
    await server.close();
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('two hosted workers share cart locks and rate limits', async () => {
  const sqlite = openDatabase(':memory:');
  const db = asynchronousDatabase(sqlite);
  let handlers;
  const server = await listen((req, res) => handlers[req.headers['x-fixture-worker'] === 'two' ? 1 : 0](req, res));
  const origin = `http://127.0.0.1:${server.port}`;
  const config = configFrom({
    APP_ORIGIN: origin, SHOPIFY_ENABLED: 'true', SHOPIFY_DOMAIN: 'deborra-test.myshopify.com',
    SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'fixture-only'
  });
  let release;
  let started;
  const waiting = new Promise((resolve) => { release = resolve; });
  const providerStarted = new Promise((resolve) => { started = resolve; });
  let creates = 0;
  const cart = {
    id: 'gid://shopify/Cart/fixture?key=fixture',
    totalQuantity: 1,
    lines: { nodes: [] },
    discountCodes: [],
    cost: { subtotalAmount: { amount: '649', currencyCode: 'INR' }, totalAmount: { amount: '649', currencyCode: 'INR' } }
  };
  async function provider(_url, requestOptions) {
    const query = JSON.parse(requestOptions.body).query;
    if (query.includes('DeborraCartCreate')) {
      creates++;
      started();
      await waiting;
      return Response.json({ data: { cartCreate: { cart, userErrors: [], warnings: [] } } });
    }
    return Response.json({ data: { cart } });
  }
  try {
    handlers = await Promise.all([1, 2].map(async () =>
      (await createRequestHandler(config, provider, { database: db, staticFiles: false })).handle));
    const initial = await fetch(origin + '/api/config');
    const cookie = initial.headers.get('set-cookie').split(';')[0];
    const command = {
      action: 'add', variantId: 'gid://shopify/ProductVariant/123', quantity: 1, operationId: randomUUID()
    };
    function add(worker) {
      return fetch(origin + '/api/cart', {
        method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-Fixture-Worker': worker },
        body: JSON.stringify(command)
      });
    }
    const first = add('one');
    await providerStarted;
    try {
      assert.equal((await add('two')).status, 409);
    } finally {
      release();
    }
    assert.equal((await first).status, 200);
    assert.equal((await add('two')).status, 200);
    assert.equal(creates, 1);

    const firstLimiter = hostedLimiter(db);
    const secondLimiter = hostedLimiter(db);
    await firstLimiter('fixture:identity', 1, 60);
    await assert.rejects(secondLimiter('fixture:identity', 1, 60), { status: 429 });
  } finally {
    release();
    await server.close();
    sqlite.close();
  }
});
