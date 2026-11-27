import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import test from 'node:test';
import { createApp } from '../server/app.mjs';
import { configFrom } from '../server/config.mjs';

async function openTestServer(env, provider) {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const config = configFrom({ PORT: String(port), ...env });
  config.dbPath = ':memory:';
  const app = await createApp(config, provider);
  app.listen(port, '127.0.0.1');
  await once(app, 'listening');
  return { origin: config.origin, close: () => new Promise((resolve) => app.close(resolve)) };
}

const money = (amount) => ({ amount: String(amount), currencyCode: 'INR' });
const fakeToken = 'test-private-shop-token';
const cartSecret = 'fixture-cart-key';
const cartId = 'gid://shopify/Cart/fixture?key=' + cartSecret;
const lineId = 'gid://shopify/CartLine/fixture?cart=' + cartSecret;
const variantId = 'gid://shopify/ProductVariant/123';
const domain = 'deborra-fixture.myshopify.com';

test('the pre-launch server serves only public files and emits browser security headers', async () => {
  const fixture = await openTestServer({}, () => { throw new Error('Unexpected provider request'); });
  try {
    const page = await fetch(fixture.origin);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
    assert.match(await page.text(), /data-server-mode="true"/);
    assert.equal((await fetch(fixture.origin + '/server/app.mjs')).status, 404);
    assert.equal((await fetch(fixture.origin + '/.env.example')).status, 404);
    assert.equal((await fetch(fixture.origin + '/api/store/products')).status, 404);
    assert.equal((await fetch(fixture.origin + '/api/cart')).status, 404);
    assert.equal((await fetch(fixture.origin + '/api/config')).headers.get('cache-control'), 'no-store');
    assert.throws(() => configFrom({ APP_ORIGIN: 'http://public.example' }), /HTTPS/);
    assert.throws(() => configFrom({ DATABASE_PATH: 'docs/site.sqlite' }), /outside/);
  } finally {
    await fixture.close();
  }
});

test('cart changes are same-origin, private to each session and validated by Shopify', async () => {
  let current = null;
  let checkout = `https://${domain}/checkouts/c/fixture`;
  let calls = 0;
  const fixture = await openTestServer({
    SHOPIFY_ENABLED: 'true', SHOPIFY_DOMAIN: domain, SHOPIFY_STOREFRONT_PRIVATE_TOKEN: fakeToken
  }, async (url, request) => {
    calls += 1;
    assert.equal(url, `https://${domain}/api/2026-10/graphql.json`);
    assert.equal(request.headers['Shopify-Storefront-Private-Token'], fakeToken);
    const { query, variables } = JSON.parse(request.body);
    if (query.includes('DeborraCartCreate')) {
      assert.equal(variables.input.lines[0].merchandiseId, variantId);
      const quantity = variables.input.lines[0].quantity;
      current = {
        id: cartId, totalQuantity: quantity, discountCodes: [],
        cost: { subtotalAmount: money(quantity * 649), totalAmount: money(quantity * 649) },
        lines: { nodes: [{
          id: lineId, quantity, cost: { totalAmount: money(quantity * 649) },
          merchandise: { title: '100 ml', product: { title: 'Rosemary Hair Oil' }, image: null }
        }] }
      };
      return Response.json({ data: { cartCreate: { cart: current, userErrors: [], warnings: [] } } });
    }
    if (query.includes('DeborraCartDiscount')) {
      assert.equal(variables.cartId, cartId);
      current.discountCodes = variables.discountCodes.map((code) => ({ code, applicable: code === 'EXAMPLE10' }));
      return Response.json({ data: { cartDiscountCodesUpdate: { cart: current, userErrors: [], warnings: [] } } });
    }
    if (query.includes('DeborraCartUpdate')) {
      assert.equal(variables.lines[0].id, lineId);
      current.totalQuantity = variables.lines[0].quantity;
      current.lines.nodes[0].quantity = current.totalQuantity;
      return Response.json({ data: { cartLinesUpdate: { cart: current, userErrors: [], warnings: [] } } });
    }
    if (query.includes('DeborraCartRemove')) {
      assert.equal(variables.lineIds[0], lineId);
      current.totalQuantity = 0;
      current.lines.nodes = [];
      return Response.json({ data: { cartLinesRemove: { cart: current, userErrors: [], warnings: [] } } });
    }
    if (query.includes('DeborraCheckout')) return Response.json({ data: { cart: { checkoutUrl: checkout } } });
    assert.match(query, /DeborraCart/);
    assert.equal(variables.id, cartId);
    return Response.json({ data: { cart: current } });
  });
  const { origin } = fixture;
  const addCommand = { action: 'add', variantId, quantity: 2, operationId: randomUUID() };
  let cookie = '';
  const send = (command, from = origin, useCookie = true) => fetch(origin + '/api/cart', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: from, ...(useCookie && cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(command)
  });
  try {
    const publicConfig = await (await fetch(origin + '/api/config')).text();
    assert.ok(!publicConfig.includes(fakeToken));
    const rejected = await send({ action: 'add', variantId, quantity: 1 }, 'https://other.example');
    assert.equal(rejected.status, 403);
    assert.equal(calls, 0);
    const added = await send(addCommand);
    assert.equal(added.status, 200);
    const session = added.headers.get('set-cookie');
    assert.match(session, /HttpOnly; SameSite=Lax/);
    cookie = session.split(';')[0];
    assert.ok(!session.includes(cartSecret));
    const output = await added.text();
    assert.ok(!output.includes(cartSecret) && !output.includes('gid://shopify/Cart'));
    const line = JSON.parse(output).lines[0];
    assert.equal(line.quantity, 2);
    assert.equal((await (await send(addCommand)).json()).count, 2);
    assert.equal((await send({ ...addCommand, quantity: 4 })).status, 409);
    assert.equal((await (await fetch(origin + '/api/cart')).json()).count, 0);
    assert.equal((await send({ action: 'update', key: line.key, quantity: 3 }, origin, false)).status, 409);
    assert.equal((await send({ action: 'update', key: line.key, quantity: 0 })).status, 400);
    assert.equal((await (await send({ action: 'update', key: line.key, quantity: 3 })).json()).count, 3);
    const discount = await (await send({ action: 'discount', code: 'EXAMPLE10' })).json();
    assert.equal(discount.discounts[0].applicable, true);
    assert.equal((await (await send({ action: 'checkout' })).json()).url, checkout);
    checkout = 'https://other.example/checkout';
    assert.equal((await send({ action: 'checkout' })).status, 502);
    assert.equal((await (await send({ action: 'remove', key: line.key })).json()).count, 0);
  } finally {
    await fixture.close();
  }
});

test('newsletter requires consent, confirms once, and accepts a signed unsubscribe link', async () => {
  const outbound = [];
  const fixture = await openTestServer({
    NEWSLETTER_ENABLED: 'true', NEWSLETTER_FROM: 'DEBORRA <mail@example.com>',
    RESEND_API_KEY: 'example-test-key', NEWSLETTER_SECRET: 'test-fixture-only-secret-with-more-than-32-characters'
  }, async (url, request) => {
    assert.equal(url, 'https://api.resend.com/emails');
    outbound.push(JSON.parse(request.body));
    return Response.json({ id: 'fake-delivery-id' });
  });
  const { origin } = fixture;
  const signup = (consent) => fetch(origin + '/api/newsletter', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'visitor@example.com', consent })
  });
  const action = (path, token) => fetch(origin + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token })
  });
  try {
    assert.equal((await signup(false)).status, 400);
    assert.equal(outbound.length, 0);
    assert.equal((await signup(true)).status, 202);
    assert.equal((await signup(true)).status, 202);
    assert.equal(outbound.length, 1);
    const text = outbound[0].text;
    const confirmation = new URL(text.match(/https?:\/\/[^\s]+\/newsletter\/confirm\?t=[A-Za-z0-9_-]+/)[0]);
    const unsubscribe = new URL(text.match(/https?:\/\/[^\s]+\/newsletter\/unsubscribe\?t=[A-Za-z0-9_.-]+/)[0].replace(/\.$/, ''));
    const form = await fetch(confirmation);
    assert.equal(form.headers.get('referrer-policy'), 'strict-origin');
    assert.match(await form.text(), /Confirm subscription/);
    assert.equal((await action(confirmation.pathname, confirmation.searchParams.get('t'))).status, 200);
    assert.equal((await action(confirmation.pathname, confirmation.searchParams.get('t'))).status, 400);
    assert.equal((await action(unsubscribe.pathname, 'invalid')).status, 400);
    assert.equal((await action(unsubscribe.pathname, unsubscribe.searchParams.get('t'))).status, 200);
  } finally {
    await fixture.close();
  }
});
