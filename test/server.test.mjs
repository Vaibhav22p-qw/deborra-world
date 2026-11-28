import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
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

test('server serves only public files, emits browser security headers, and exposes config safely', async () => {
  const fixture = await openTestServer({}, () => {
    throw new Error('Unexpected provider request');
  });
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
    const configRes = await fetch(fixture.origin + '/api/config');
    assert.equal(configRes.headers.get('cache-control'), 'no-store');
    const configJson = await configRes.json();
    assert.equal(configJson.nativeStore, true);
    assert.throws(() => configFrom({ APP_ORIGIN: 'http://public.example' }), /HTTPS/);
    assert.throws(() => configFrom({ DATABASE_PATH: 'docs/site.sqlite' }), /outside/);
    assert.throws(() => configFrom({ RAZORPAY_KEY_ID: 'bad_key', RAZORPAY_KEY_SECRET: 'sec' }), /Razorpay/);
  } finally {
    await fixture.close();
  }
});

test('native D2C checkout enforces prices, stock, discounts, COD orders, and secure tracking', async () => {
  const fixture = await openTestServer({}, () => {
    throw new Error('Unexpected outbound request for COD');
  });
  const { origin } = fixture;
  try {
    const catalogRes = await fetch(origin + '/api/shop/catalog');
    assert.equal(catalogRes.status, 200);
    const catalog = await catalogRes.json();
    const rosemary = catalog.products.find((p) => p.slug === 'rosemary-hair-oil');
    assert.ok(rosemary);
    const initialStock = rosemary.variants[0].stock;

    // Cross-origin checkout must be blocked
    const crossOrigin = await fetch(origin + '/api/shop/checkout', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(crossOrigin.status, 403);

    // Invalid PIN code & invalid payment method rejected
    const badPin = await fetch(origin + '/api/shop/checkout', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aarav Mehta',
        email: 'aarav@example.com',
        phone: '9820123456',
        address: { addressLine1: '12 Palm Grove', city: 'Mumbai', state: 'Maharashtra', pincode: '000123' },
        items: [{ sku: 'DEB-RHO-100', quantity: 1 }],
        paymentMethod: 'cod'
      })
    });
    assert.equal(badPin.status, 400);

    // Valid COD order with DEBORRA10 (649 * 2 = 1298 -> 10% off = 130 -> 1168 >= 999 -> free shipping)
    const orderRes = await fetch(origin + '/api/shop/checkout', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aarav Mehta',
        email: 'aarav@example.com',
        phone: '9820123456',
        address: { addressLine1: '12 Palm Grove', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
        items: [{ sku: 'DEB-RHO-100', quantity: 2 }],
        discountCode: 'DEBORRA10',
        paymentMethod: 'cod'
      })
    });
    assert.equal(orderRes.status, 201);
    const { order } = await orderRes.json();
    assert.match(order.orderId, /^DEB-\d{4}-[A-F0-9]{6}$/);
    assert.equal(order.subtotal, 1298);
    assert.equal(order.discountAmount, 130);
    assert.equal(order.shipping, 0);
    assert.equal(order.total, 1168);
    assert.equal(order.status, 'Confirmed');

    // Stock decremented in SQLite
    const updatedCatalog = await (await fetch(origin + '/api/shop/catalog')).json();
    const updatedStock = updatedCatalog.products.find((p) => p.slug === 'rosemary-hair-oil').variants[0].stock;
    assert.equal(updatedStock, initialStock - 2);

    // Order tracking rejects wrong contact, succeeds with right phone or email
    assert.equal(
      (await fetch(origin + `/api/shop/orders/track?id=${order.orderId}&contact=9999999999`)).status,
      404
    );
    const tracked = await fetch(origin + `/api/shop/orders/track?id=${order.orderId}&contact=9820123456`);
    assert.equal(tracked.status, 200);
    assert.equal((await tracked.json()).order.orderId, order.orderId);

    // Overselling remaining stock fails with 409
    const oversell = await fetch(origin + '/api/shop/checkout', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aarav Mehta',
        email: 'aarav@example.com',
        phone: '9820123456',
        address: { addressLine1: '12 Palm Grove', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
        items: [{ sku: 'DEB-RHO-100', quantity: 40 }],
        paymentMethod: 'cod'
      })
    });
    assert.equal(oversell.status, 409);
  } finally {
    await fixture.close();
  }
});

test('Razorpay order creation, HMAC-SHA256 verification, and cancellation stock restore work securely', async () => {
  const keyId = 'rzp_live_deborra123';
  const keySecret = 'secret_test_key_for_hmac_verification';
  let seq = 0;

  const fixture = await openTestServer(
    { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret },
    async (url, request) => {
      assert.equal(url, 'https://api.razorpay.com/v1/orders');
      const body = JSON.parse(request.body);
      assert.equal(body.currency, 'INR');
      assert.equal(body.amount, 70900); // 649 + 60 shipping = 709 INR = 70900 paise
      seq += 1;
      return Response.json({ id: `order_RazorpayFixture${seq}`, amount: body.amount, currency: 'INR' });
    }
  );
  const { origin } = fixture;
  try {
    const configRes = await (await fetch(origin + '/api/config')).json();
    assert.equal(configRes.razorpay.enabled, true);
    assert.equal(configRes.razorpay.keyId, keyId);

    const pageRes = await fetch(origin);
    assert.match(pageRes.headers.get('content-security-policy'), /checkout\.razorpay\.com/);

    const payload = {
      customerName: 'Neha Kulkarni',
      email: 'neha@example.com',
      phone: '9811122233',
      address: { addressLine1: '501 Marine View', city: 'Mumbai', state: 'Maharashtra', pincode: '400020' },
      items: [{ sku: 'DEB-RHO-100', quantity: 1 }],
      paymentMethod: 'razorpay'
    };

    // 1. Create and verify order
    const checkoutRes = await fetch(origin + '/api/shop/checkout', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(checkoutRes.status, 201);
    const created = await checkoutRes.json();
    const rzpOrderId = created.razorpayOrderId;
    const rzpPaymentId = 'pay_RazorpayFixture99';
    assert.equal(created.amountPaise, 70900);
    assert.equal(created.order.status, 'Pending Payment');

    // Invalid signature rejected
    const badVerify = await fetch(origin + '/api/shop/razorpay/verify', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: created.order.orderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: '0'.repeat(64)
      })
    });
    assert.equal(badVerify.status, 400);

    // Valid HMAC-SHA256 signature accepted
    const validSignature = createHmac('sha256', keySecret)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');
    const goodVerify = await fetch(origin + '/api/shop/razorpay/verify', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: created.order.orderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: validSignature
      })
    });
    assert.equal(goodVerify.status, 200);
    const verified = await goodVerify.json();
    assert.equal(verified.order.status, 'Confirmed');
    assert.match(verified.order.paymentStatus, /^Paid /);

    // 2. Cancelled Razorpay modal restores stock
    const stockBeforeCancel = (await (await fetch(origin + '/api/shop/catalog')).json()).products
      .find((p) => p.slug === 'rosemary-hair-oil').variants[0].stock;

    const secondCheckout = await (
      await fetch(origin + '/api/shop/checkout', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    ).json();

    const cancelRes = await fetch(origin + '/api/shop/razorpay/cancel', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: secondCheckout.order.orderId,
        razorpayOrderId: secondCheckout.razorpayOrderId
      })
    });
    assert.equal(cancelRes.status, 200);
    assert.equal((await cancelRes.json()).cancelled, true);

    const stockAfterCancel = (await (await fetch(origin + '/api/shop/catalog')).json()).products
      .find((p) => p.slug === 'rosemary-hair-oil').variants[0].stock;
    assert.equal(stockAfterCancel, stockBeforeCancel);
  } finally {
    await fixture.close();
  }
});

test('contact support, Phase 2 waitlist, and local newsletter consent work with validation', async () => {
  const fixture = await openTestServer({}, () => {
    throw new Error('Unexpected external call');
  });
  const { origin } = fixture;
  try {
    const contactRes = await fetch(origin + '/api/contact', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Riya Verma',
        email: 'riya@example.com',
        phone: '+91 9876543210',
        topic: 'Product & Ingredients',
        message: 'Is Rosemary Hair Oil safe for dry scalp?'
      })
    });
    assert.equal(contactRes.status, 201);
    assert.match((await contactRes.json()).ticketId, /^SUP-[A-F0-9]{6}$/);

    const waitlistRes = await fetch(origin + '/api/waitlist', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'riya@example.com', productSlug: 'botanical-gummies' })
    });
    assert.equal(waitlistRes.status, 201);

    const newsRes = await fetch(origin + '/api/newsletter', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'riya@example.com', consent: true })
    });
    assert.equal(newsRes.status, 201);
    const newsJson = await newsRes.json();
    assert.equal(newsJson.mode, 'local');
    assert.ok(newsJson.unsubscribeUrl.includes('/newsletter/unsubscribe?t='));
  } finally {
    await fixture.close();
  }
});

test('cart changes are same-origin, private to each session and validated by Shopify', async () => {
  let current = null;
  let checkout = `https://${domain}/checkouts/c/fixture`;
  let calls = 0;
  const fixture = await openTestServer(
    {
      SHOPIFY_ENABLED: 'true',
      SHOPIFY_DOMAIN: domain,
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: fakeToken
    },
    async (url, request) => {
      calls += 1;
      assert.equal(url, `https://${domain}/api/2026-10/graphql.json`);
      assert.equal(request.headers['Shopify-Storefront-Private-Token'], fakeToken);
      const { query, variables } = JSON.parse(request.body);
      if (query.includes('DeborraCartCreate')) {
        assert.equal(variables.input.lines[0].merchandiseId, variantId);
        const quantity = variables.input.lines[0].quantity;
        current = {
          id: cartId,
          totalQuantity: quantity,
          discountCodes: [],
          cost: { subtotalAmount: money(quantity * 649), totalAmount: money(quantity * 649) },
          lines: {
            nodes: [
              {
                id: lineId,
                quantity,
                cost: { totalAmount: money(quantity * 649) },
                merchandise: { title: '100 ml', product: { title: 'Rosemary Hair Oil' }, image: null }
              }
            ]
          }
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
    }
  );
  const { origin } = fixture;
  const addCommand = { action: 'add', variantId, quantity: 2, operationId: randomUUID() };
  let cookie = '';
  const send = (command, from = origin, useCookie = true) =>
    fetch(origin + '/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: from,
        ...(useCookie && cookie ? { Cookie: cookie } : {})
      },
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
  const fixture = await openTestServer(
    {
      NEWSLETTER_ENABLED: 'true',
      NEWSLETTER_FROM: 'DEBORRA <mail@example.com>',
      RESEND_API_KEY: 'example-test-key',
      NEWSLETTER_SECRET: 'test-fixture-only-secret-with-more-than-32-characters'
    },
    async (url, request) => {
      assert.equal(url, 'https://api.resend.com/emails');
      outbound.push(JSON.parse(request.body));
      return Response.json({ id: 'fake-delivery-id' });
    }
  );
  const { origin } = fixture;
  const signup = (consent) =>
    fetch(origin + '/api/newsletter', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'visitor@example.com', consent })
    });
  const action = (path, token) =>
    fetch(origin + path, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
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
