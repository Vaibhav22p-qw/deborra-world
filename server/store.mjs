import { storeDocument } from './store-queries.mjs';
import { handlePattern } from './config.mjs';
import { HttpError, opaquePattern, randomToken, sha256 } from './security.mjs';

const variantIdPattern = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,18}$/;
const operationIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const lineSelection = `
  id quantity
  merchandise { ... on ProductVariant { title product { title } image { url altText } } }
  cost { totalAmount { amount currencyCode } }
`;
const cartSelection = `
  id totalQuantity
  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
  discountCodes { code applicable }
  lines(first: 100) { nodes { ${lineSelection} } }
`;
const results = `cart { ${cartSelection} } userErrors { code } warnings { code }`;
const empty = { count: 0, lines: [], discounts: [], subtotal: null, total: null, notice: '' };

const mutations = {
  create: `mutation DeborraCartCreate($input: CartInput!) {
    cartCreate(input: $input) { ${results} }
  }`,
  add: `mutation DeborraCartAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) { ${results} }
  }`,
  update: `mutation DeborraCartUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) { ${results} }
  }`,
  remove: `mutation DeborraCartRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { ${results} }
  }`,
  discount: `mutation DeborraCartDiscount($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) { ${results} }
  }`
};
const resultFields = { create: 'cartCreate', add: 'cartLinesAdd', update: 'cartLinesUpdate', remove: 'cartLinesRemove', discount: 'cartDiscountCodesUpdate' };

function numberInRange(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function snapshot(cart, notice = '') {
  if (!cart) return { ...empty, notice };
  return {
    count: cart.totalQuantity,
    lines: cart.lines.nodes.map((line) => ({
      key: sha256(line.id),
      quantity: line.quantity,
      title: line.merchandise?.product?.title || 'Product',
      variant: line.merchandise?.title || '',
      image: line.merchandise?.image || null,
      total: line.cost.totalAmount
    })),
    discounts: cart.discountCodes,
    subtotal: cart.cost.subtotalAmount,
    total: cart.cost.totalAmount,
    notice
  };
}

export function createStore(config, db, fetcher = fetch) {
  const store = config.store;
  const cookieName = config.secure ? '__Host-deborra-session' : 'deborra-session';
  const maxAge = 7 * 24 * 60 * 60;
  const locks = new Map();
  const lookup = db.prepare('SELECT cart_id FROM cart_sessions WHERE session_hash = ? AND refreshed_at > ?');
  const upsert = db.prepare(`INSERT INTO cart_sessions VALUES (?, ?, ?)
    ON CONFLICT(session_hash) DO UPDATE SET cart_id = excluded.cart_id, refreshed_at = excluded.refreshed_at`);
  const touch = db.prepare('UPDATE cart_sessions SET refreshed_at = ? WHERE session_hash = ?');
  const purge = db.prepare('DELETE FROM cart_sessions WHERE refreshed_at < ?');
  const purgeAdds = db.prepare('DELETE FROM cart_adds WHERE created_at < ?');
  const findAdd = db.prepare('SELECT variant_id, quantity, completed FROM cart_adds WHERE session_hash = ? AND operation_id = ?');
  const reserveAdd = db.prepare('INSERT INTO cart_adds (session_hash, operation_id, variant_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)');
  const finishAdd = db.prepare('UPDATE cart_adds SET completed = 1 WHERE session_hash = ? AND operation_id = ?');
  const removeAdd = db.prepare('DELETE FROM cart_adds WHERE session_hash = ? AND operation_id = ?');
  const claim = db.prepare(`
    INSERT INTO cart_locks VALUES (?, ?, ?)
    ON CONFLICT(session_hash) DO UPDATE SET owner = excluded.owner, expires_at = excluded.expires_at
    WHERE expires_at <= ? RETURNING owner
  `);
  const release = db.prepare('DELETE FROM cart_locks WHERE session_hash = ? AND owner = ?');
  const purgeLocks = db.prepare('DELETE FROM cart_locks WHERE expires_at <= ?');
  let lastPurge = 0;

  async function call(document, variables, address) {
    const headers = { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': store.privateToken };
    if (address !== 'unknown') headers['Shopify-Storefront-Buyer-IP'] = address.replace(/^::ffff:/, '');
    try {
      const response = await fetcher(`https://${store.domain}/api/2026-10/graphql.json`, {
        method: 'POST', headers, body: JSON.stringify({ query: document, variables }),
        redirect: 'error', signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Provider rejected request');
      const payload = await response.json();
      if (payload.errors?.length || !payload.data) throw new Error('Provider returned no data');
      return payload.data;
    } catch {
      throw new HttpError(502, 'The shop service is temporarily unavailable. Please try again.');
    }
  }

  async function catalogue(operation, params, address) {
    if (!['products', 'collection', 'categories', 'product', 'policies'].includes(operation)) {
      throw new HttpError(404, 'This page could not be found.');
    }
    const handle = params.get('handle');
    const size = Number(params.get('size') || 12);
    const after = params.get('after');
    if (!numberInRange(size, 1, 24) || (after && after.length > 512) ||
        (['product', 'collection'].includes(operation) && !handlePattern.test(handle || '')) ||
        (operation === 'collection' && !store.categoryHandles.includes(handle) && handle !== store.featuredCollection)) {
      throw new HttpError(400, 'Invalid product request.');
    }
    if (operation === 'categories' && !store.categoryHandles.length) return {};
    const { document, variables } = storeDocument(operation, { handle, size, after, handles: store.categoryHandles });
    return call(document, variables, address);
  }

  function session(request, response) {
    const token = String(request.headers.cookie || '').split(';').map((part) => part.trim())
      .find((part) => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    const id = opaquePattern.test(token || '') ? token : randomToken();
    const secure = config.secure ? '; Secure' : '';
    response.setHeader('Set-Cookie', `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
    return sha256(id);
  }

  async function readCart(cartId, address) {
    if (!cartId) return null;
    const data = await call(`query DeborraCart($id: ID!) { cart(id: $id) { ${cartSelection} } }`, { id: cartId }, address);
    return data.cart;
  }

  async function operate(sessionHash, command, address) {
    const now = Date.now();
    const expiry = now - maxAge * 1000;
    if (now - lastPurge > 3600000) {
      lastPurge = now;
      await Promise.all([purge.run(expiry), purgeAdds.run(expiry), purgeLocks.run(now)]);
    }
    const savedCart = (await lookup.get(sessionHash, expiry))?.cart_id;
    const cart = await readCart(savedCart, address);
    if (cart) await touch.run(now, sessionHash);
    else if (savedCart) await upsert.run(sessionHash, null, now);
    if (command.action === 'read') return snapshot(cart);

    if (command.action === 'checkout') {
      if (!cart?.totalQuantity) throw new HttpError(409, 'Add a product before checking out.');
      const data = await call('query DeborraCheckout($id: ID!) { cart(id: $id) { checkoutUrl } }', { id: cart.id }, address);
      let url;
      try { url = new URL(data.cart?.checkoutUrl); } catch { throw new HttpError(502, 'Checkout is temporarily unavailable.'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !store.checkoutHosts.has(url.hostname)) {
        throw new HttpError(502, 'Checkout is temporarily unavailable.');
      }
      return { url: url.href };
    }

    let { action } = command;
    let variables = { cartId: cart?.id };
    if (action === 'add') {
      const lines = [{ merchandiseId: command.variantId, quantity: command.quantity }];
      if (cart) variables.lines = lines;
      else {
        action = 'create';
        variables = { input: { lines, buyerIdentity: { countryCode: 'IN' } } };
      }
    } else if (action === 'discount') {
      if (!cart?.totalQuantity) throw new HttpError(409, 'Add a product before using a discount.');
      if (typeof command.code !== 'string' || !/^[\w -]{0,64}$/.test(command.code)) throw new HttpError(400, 'Enter a valid discount code.');
      variables.discountCodes = command.code.trim() ? [command.code.trim()] : [];
    } else if (action === 'update' || action === 'remove') {
      const line = cart?.lines.nodes.find((item) => sha256(item.id) === command.key);
      if (!line) throw new HttpError(409, 'That product is no longer in your bag.');
      if (action === 'remove') variables.lineIds = [line.id];
      else {
        if (!numberInRange(command.quantity, 1, 999)) throw new HttpError(400, 'Enter an available quantity.');
        variables.lines = [{ id: line.id, quantity: command.quantity }];
      }
    } else throw new HttpError(400, 'Unknown cart action.');

    const outcome = (await call(mutations[action], variables, address))[resultFields[action]];
    if (outcome.cart?.id) await upsert.run(sessionHash, outcome.cart.id, Date.now());
    if (outcome.userErrors?.length) throw new HttpError(409, 'The bag change couldn’t be completed. Check the product or quantity and try again.');
    const notice = outcome.warnings?.length ? 'Your bag was adjusted to match current availability.' : '';
    return snapshot(outcome.cart || cart, notice);
  }

  async function execute(sessionHash, command, address) {
    if (command.action !== 'add') return operate(sessionHash, command, address);

    const { operationId, variantId, quantity } = command;
    if (typeof operationId !== 'string' || !operationIdPattern.test(operationId)
      || typeof variantId !== 'string' || !variantIdPattern.test(variantId) || !numberInRange(quantity, 1, 999)) {
      throw new HttpError(400, 'Choose an available product and quantity.');
    }

    const earlier = await findAdd.get(sessionHash, operationId);
    if (earlier) {
      if (earlier.variant_id !== variantId || earlier.quantity !== quantity) throw new HttpError(409, 'Start a new bag change.');
      if (!earlier.completed) throw new HttpError(409, 'Check your bag before adding this product again.');
      return operate(sessionHash, { action: 'read' }, address);
    }

    await reserveAdd.run(sessionHash, operationId, variantId, quantity, Date.now());
    try {
      const result = await operate(sessionHash, command, address);
      await finishAdd.run(sessionHash, operationId);
      return result;
    } catch (error) {
      if (error instanceof HttpError && error.status < 500) await removeAdd.run(sessionHash, operationId);
      throw error;
    }
  }

  function cart(sessionHash, command, address) {
    if (db.remote) return remoteCart(sessionHash, command, address);
    const previous = locks.get(sessionHash) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => execute(sessionHash, command, address));
    locks.set(sessionHash, current);
    return current.finally(() => {
      if (locks.get(sessionHash) === current) locks.delete(sessionHash);
    });
  }

  async function remoteCart(sessionHash, command, address) {
    const owner = randomToken();
    const now = Date.now();
    if (!(await claim.get(sessionHash, owner, now + 45000, now))) {
      throw new HttpError(409, 'Your bag is updating. Please try again shortly.');
    }
    try {
      return await execute(sessionHash, command, address);
    } finally {
      await release.run(sessionHash, owner).catch(() => {});
    }
  }

  return { catalogue, session, cart };
}
