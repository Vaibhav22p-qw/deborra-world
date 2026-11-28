import { storeMeta } from './catalog-data.js';
import { settings } from './site-config.js';

const BAG_KEY = 'deborra_bag_v1';
const ORDERS_KEY = 'deborra_orders_v1';
const root = new URL(document.documentElement.dataset.siteRoot || './', location.href);
const backendPage = document.documentElement.dataset.serverMode === 'true';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatInr = (value) => inr.format(Math.round(Number(value) || 0));

const internalUrl = (path, query = {}) => {
  const url = new URL(path, root);
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== null && val !== '') url.searchParams.set(key, String(val));
  }
  return url.href;
};

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function trackEvent(eventName, props = {}) {
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props });
    }
  } catch {
    // Analytics failure never interrupts shopping flows.
  }
}

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Continue in memory if storage quota or privacy mode blocks localStorage.
  }
}

const productBySlug = new Map();
const variantBySku = new Map();

function indexCatalog(productsList) {
  productBySlug.clear();
  variantBySku.clear();
  for (const product of productsList) {
    productBySlug.set(product.slug, product);
    for (const variant of product.variants) {
      variantBySku.set(variant.id, { ...variant, product });
    }
  }
}

indexCatalog(storeMeta.products);

function normalizeBag(raw) {
  const items = [];
  if (Array.isArray(raw?.items)) {
    for (const entry of raw.items) {
      const variant = variantBySku.get(entry?.sku);
      const qty = Number(entry?.quantity);
      if (variant && variant.product.status === 'in-stock' && Number.isInteger(qty) && qty >= 1) {
        items.push({ sku: variant.id, quantity: Math.min(qty, Math.max(1, variant.stock || 99)) });
      }
    }
  }
  const code = typeof raw?.discountCode === 'string' ? raw.discountCode.trim().toUpperCase() : '';
  return { items, discountCode: code };
}

function getBag() {
  return normalizeBag(readJsonStorage(BAG_KEY, { items: [], discountCode: '' }));
}

function saveBag(bag) {
  const clean = normalizeBag(bag);
  writeJsonStorage(BAG_KEY, clean);
  updateBagBadges(clean);
  return clean;
}

function calculateBagTotals(bag) {
  const lines = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const entry of bag.items) {
    const variant = variantBySku.get(entry.sku);
    if (!variant) continue;
    const lineTotal = variant.price * entry.quantity;
    subtotal += lineTotal;
    itemCount += entry.quantity;
    lines.push({
      sku: variant.id,
      slug: variant.product.slug,
      name: variant.product.name,
      variantLabel: variant.label,
      image: variant.product.image,
      unitPrice: variant.price,
      stock: variant.stock,
      quantity: entry.quantity,
      lineTotal
    });
  }

  const enteredCode = (bag.discountCode || '').trim().toUpperCase();
  const discountRule = storeMeta.discountCodes.find((d) => d.code === enteredCode);
  let discountAmount = 0;
  let discountNote = '';
  let freeShippingFromCode = false;

  if (enteredCode) {
    if (!discountRule) {
      discountNote = 'Code not recognised. Try DEBORRA10, WELCOME15 or FREESHIP.';
    } else if (subtotal < discountRule.minSubtotal) {
      discountNote = `${discountRule.code} applies on orders of ${formatInr(discountRule.minSubtotal)} or more.`;
    } else if (discountRule.type === 'percent') {
      discountAmount = Math.round((subtotal * discountRule.value) / 100);
      discountNote = `${discountRule.code} applied (${discountRule.label}).`;
    } else if (discountRule.type === 'shipping') {
      freeShippingFromCode = true;
      discountNote = `${discountRule.code} applied (${discountRule.label}).`;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const threshold = storeMeta.brand.freeShippingThreshold;
  const qualifiesFreeShipping = afterDiscount >= threshold || freeShippingFromCode;
  const shipping = subtotal === 0 ? 0 : qualifiesFreeShipping ? 0 : storeMeta.brand.standardShippingFee;
  const total = afterDiscount + shipping;
  const freeShippingRemaining = Math.max(0, threshold - afterDiscount);

  return {
    lines,
    itemCount,
    subtotal,
    discountCode: discountRule && subtotal >= discountRule.minSubtotal ? discountRule.code : enteredCode,
    discountApplied: discountAmount > 0 || freeShippingFromCode,
    discountAmount,
    discountNote,
    shipping,
    total,
    freeShippingThreshold: threshold,
    freeShippingRemaining
  };
}

function updateBagBadges(bag = getBag()) {
  const count = bag.items.reduce((sum, item) => sum + item.quantity, 0);
  for (const badge of document.querySelectorAll('[data-bag-count]')) {
    badge.textContent = String(count);
    badge.classList.toggle('is-nonzero', count > 0);
  }
}

function addItemToBag(sku, quantity = 1) {
  const variant = variantBySku.get(sku);
  if (!variant || variant.product.status !== 'in-stock' || variant.stock <= 0) {
    throw new Error('This pack is currently unavailable.');
  }
  const bag = getBag();
  const existing = bag.items.find((item) => item.sku === sku);
  const nextQty = (existing ? existing.quantity : 0) + quantity;
  if (nextQty > variant.stock) {
    throw new Error(`Only ${variant.stock} units currently in stock for this pack.`);
  }
  if (existing) existing.quantity = nextQty;
  else bag.items.push({ sku, quantity });

  saveBag(bag);
  trackEvent('add_to_bag', { sku, product: variant.product.name, quantity });
  return bag;
}

function setItemQuantity(sku, quantity) {
  const bag = getBag();
  if (quantity <= 0) {
    bag.items = bag.items.filter((item) => item.sku !== sku);
  } else {
    const variant = variantBySku.get(sku);
    const clamped = variant ? Math.min(quantity, Math.max(1, variant.stock)) : quantity;
    const item = bag.items.find((entry) => entry.sku === sku);
    if (item) item.quantity = clamped;
  }
  return saveBag(bag);
}

function applyDiscountCode(code) {
  const bag = getBag();
  bag.discountCode = (code || '').trim().toUpperCase();
  return saveBag(bag);
}

function clearBag() {
  return saveBag({ items: [], discountCode: '' });
}

function saveLocalOrder(order) {
  const existing = readJsonStorage(ORDERS_KEY, []);
  const filtered = Array.isArray(existing) ? existing.filter((o) => o.orderId !== order.orderId) : [];
  filtered.unshift(order);
  writeJsonStorage(ORDERS_KEY, filtered.slice(0, 25));
}

function findLocalOrder(orderId, contact = '') {
  const target = (orderId || '').trim().toUpperCase();
  if (target === 'DEB-DEMO-2026') {
    return {
      orderId: 'DEB-DEMO-2026',
      createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      status: 'Dispatched',
      paymentMethod: 'Razorpay (UPI)',
      paymentStatus: 'Paid',
      customerName: 'Sample Customer',
      email: 'sample@deborra.in',
      phone: '9800000000',
      address: {
        addressLine1: '14 Botanical Terrace, Pali Hill',
        addressLine2: 'Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050'
      },
      items: [
        { sku: 'DEB-RHO-100', name: 'Rosemary Hair Oil', variantLabel: '100 ml · Amber Glass Bottle', quantity: 1, unitPrice: 649, lineTotal: 649 },
        { sku: 'DEB-HSS-030', name: 'Hair & Scalp Serum', variantLabel: '30 ml · Glass Dropper', quantity: 1, unitPrice: 799, lineTotal: 799 }
      ],
      discountCode: 'DEBORRA10',
      subtotal: 1448,
      discountAmount: 145,
      shipping: 0,
      total: 1303,
      carrierNote: 'Sample tracking record for preview purposes · Bluedart / Delhivery Express'
    };
  }
  const orders = readJsonStorage(ORDERS_KEY, []);
  if (!Array.isArray(orders)) return null;
  const order = orders.find((o) => o.orderId?.toUpperCase() === target);
  if (!order) return null;
  if (contact) {
    const cleanContact = contact.trim().toLowerCase();
    const digits = cleanContact.replace(/\D/g, '').slice(-10);
    const orderDigits = String(order.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanContact !== String(order.email || '').toLowerCase() && (!digits || digits !== orderDigits)) {
      return null;
    }
  }
  return order;
}

function createBagDrawer() {
  const dialog = el('dialog', 'server-cart bag-drawer');
  dialog.id = 'deborra-bag-dialog';
  dialog.setAttribute('aria-labelledby', 'bag-drawer-title');

  const header = el('header', 'server-cart__header');
  const title = el('h2', '', 'Your bag.');
  title.id = 'bag-drawer-title';
  const closeBtn = el('button', 'site-dialog__close', 'Close');
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => dialog.close());
  header.append(title, closeBtn);

  const shippingBar = el('div', 'bag-shipping-bar');
  const status = el('p', 'server-cart__status');
  status.setAttribute('role', 'status');
  const body = el('div', 'bag-drawer__body');

  dialog.append(header, shippingBar, status, body);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.append(dialog);

  function render(notice = '') {
    const summary = calculateBagTotals(getBag());
    status.textContent = notice;

    if (!summary.lines.length) {
      shippingBar.replaceChildren();
      const empty = el('div', 'bag-empty');
      empty.append(el('p', '', 'Your shopping bag is currently empty.'));
      const shopLink = el('a', 'button button--primary', 'Explore the shop');
      shopLink.href = internalUrl('shop/');
      empty.append(shopLink);
      body.replaceChildren(empty);
      return;
    }

    if (summary.freeShippingRemaining > 0) {
      shippingBar.textContent = `Add ${formatInr(summary.freeShippingRemaining)} more for free India delivery.`;
    } else {
      shippingBar.textContent = 'You have unlocked free standard India delivery.';
    }

    const list = el('ul', 'server-cart__lines');
    for (const line of summary.lines) {
      const li = el('li', 'server-cart__line');
      const img = el('img');
      img.src = internalUrl('assets/' + line.image);
      img.alt = '';
      img.width = 64;
      img.height = 64;

      const desc = el('div', 'server-cart__description');
      const itemTitle = el('h3', '', line.name);
      const itemMeta = el('p', '', `${line.variantLabel} · ${formatInr(line.unitPrice)}`);
      const removeBtn = el('button', 'text-link server-cart__remove', 'Remove');
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', () => {
        setItemQuantity(line.sku, 0);
        render(`${line.name} removed.`);
      });
      desc.append(itemTitle, itemMeta, removeBtn);

      const controls = el('div', 'server-cart__line-controls');
      controls.append(el('strong', '', formatInr(line.lineTotal)));
      const stepper = el('div', 'qty-stepper');
      const minus = el('button', 'qty-btn', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', `Decrease quantity for ${line.name}`);
      minus.addEventListener('click', () => {
        setItemQuantity(line.sku, line.quantity - 1);
        render();
      });
      const count = el('span', 'qty-val', String(line.quantity));
      const plus = el('button', 'qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', `Increase quantity for ${line.name}`);
      plus.disabled = line.quantity >= line.stock;
      plus.addEventListener('click', () => {
        setItemQuantity(line.sku, line.quantity + 1);
        render();
      });
      stepper.append(minus, count, plus);
      controls.append(stepper);

      li.append(img, desc, controls);
      list.append(li);
    }

    const discountForm = el('form', 'server-cart__discount');
    const codeLabel = el('label', '', 'Discount code (DEBORRA10 / WELCOME15 / FREESHIP)');
    codeLabel.htmlFor = 'bag-discount-code';
    const codeInput = el('input', 'store-select');
    codeInput.id = 'bag-discount-code';
    codeInput.maxLength = 32;
    codeInput.placeholder = 'DEBORRA10';
    codeInput.value = summary.discountCode;
    const applyBtn = el('button', 'button button--primary', 'Apply');
    applyBtn.type = 'submit';
    discountForm.append(codeLabel, codeInput, applyBtn);
    discountForm.addEventListener('submit', (event) => {
      event.preventDefault();
      applyDiscountCode(codeInput.value);
      const next = calculateBagTotals(getBag());
      render(next.discountNote || 'Discount updated.');
    });

    const totals = el('dl', 'bag-totals');
    const addRow = (label, val, strong = false) => {
      const row = el('div', strong ? 'bag-totals__row bag-totals__row--total' : 'bag-totals__row');
      row.append(el('dt', '', label), el('dd', '', val));
      totals.append(row);
    };
    addRow('Subtotal', formatInr(summary.subtotal));
    if (summary.discountAmount > 0) addRow(`Discount (${summary.discountCode})`, `−${formatInr(summary.discountAmount)}`);
    addRow('India Shipping', summary.shipping ? formatInr(summary.shipping) : 'Free');
    addRow('Total (incl. GST)', formatInr(summary.total), true);

    const checkoutBtn = el('a', 'button button--gold bag-checkout-btn', 'Proceed to checkout');
    checkoutBtn.href = internalUrl('checkout/');

    body.replaceChildren(list, discountForm, totals, checkoutBtn);
  }

  return {
    open(notice = '') {
      render(notice);
      if (!dialog.open) dialog.showModal();
    }
  };
}

let drawer;

function wireProductCards() {
  for (const card of document.querySelectorAll('[data-product-card]')) {
    const slug = card.dataset.productSlug;
    const product = productBySlug.get(slug);
    if (!product || product.status !== 'in-stock') continue;

    const select = card.querySelector('[data-variant-select]');
    const priceEl = card.querySelector('[data-card-price]');
    const mrpEl = card.querySelector('[data-card-mrp]');
    const addBtn = card.querySelector('[data-add-sku]');

    const syncCard = () => {
      const sku = select ? select.value : product.variants[0].id;
      const variant = variantBySku.get(sku) || product.variants[0];
      if (priceEl) priceEl.textContent = formatInr(variant.price);
      if (mrpEl) {
        mrpEl.textContent = variant.mrp > variant.price ? formatInr(variant.mrp) : '';
        mrpEl.hidden = !(variant.mrp > variant.price);
      }
      card.dataset.productPrice = String(variant.price);
      if (addBtn) {
        addBtn.dataset.addSku = variant.id;
        addBtn.disabled = variant.stock <= 0;
        addBtn.textContent = variant.stock > 0 ? 'Add to bag' : 'Sold out';
      }
    };

    if (select) {
      for (const option of select.options) {
        const v = variantBySku.get(option.value);
        if (v) option.dataset.stock = String(v.stock);
      }
      select.addEventListener('change', syncCard);
    }
    syncCard();

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        try {
          addItemToBag(addBtn.dataset.addSku, 1);
          drawer.open(`${product.name} added to your bag.`);
        } catch (err) {
          drawer.open(err.message);
        }
      });
    }
  }
}

function wireShopFiltering() {
  const filters = document.querySelector('.catalog-filters');
  const sortSelect = document.querySelector('[data-catalog-sort]');
  const grid = document.querySelector('[data-catalog-grid]');
  const countEl = document.querySelector('.catalog-count');
  if (!filters || !grid) return;

  const buttons = [...filters.querySelectorAll('[data-filter]')];
  let activeCategory = 'all';

  const refresh = () => {
    const cards = [...grid.querySelectorAll('[data-product-card]')];
    const mode = sortSelect?.value || 'featured';
    if (mode === 'price-asc' || mode === 'price-desc') {
      cards.sort((a, b) => {
        const diff = Number(a.dataset.productPrice) - Number(b.dataset.productPrice);
        return mode === 'price-asc' ? diff : -diff;
      });
      for (const card of cards) grid.append(card);
    }
    let visible = 0;
    for (const card of cards) {
      const matches = activeCategory === 'all' || card.dataset.productGroup === activeCategory;
      card.hidden = !matches;
      if (matches) visible += 1;
    }
    if (countEl) countEl.textContent = `${visible} ${visible === 1 ? 'product' : 'products'}`;
  };

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.filter || 'all';
      for (const b of buttons) b.setAttribute('aria-pressed', String(b === btn));
      refresh();
    });
  }
  sortSelect?.addEventListener('change', refresh);
}

function wireProductGallery() {
  const mainImg = document.querySelector('[data-detail-main-img]');
  const caption = document.querySelector('[data-detail-caption]');
  const thumbs = [...document.querySelectorAll('[data-detail-thumb]')];
  if (!mainImg || !thumbs.length) return;

  for (const thumb of thumbs) {
    thumb.addEventListener('click', () => {
      mainImg.src = thumb.dataset.detailThumb;
      mainImg.alt = thumb.dataset.thumbAlt || mainImg.alt;
      if (caption && thumb.dataset.thumbCaption) caption.textContent = thumb.dataset.thumbCaption;
      for (const t of thumbs) t.classList.toggle('is-active', t === thumb);
    });
  }
}

function wireProductDetail() {
  wireProductGallery();
  const form = document.querySelector('[data-detail-purchase]');
  if (!form) return;

  const slug = form.dataset.productSlug;
  const product = productBySlug.get(slug);
  if (!product) return;

  const select = form.querySelector('[data-detail-variant]');
  const qtyInput = form.querySelector('[data-detail-quantity]');
  const priceEl = form.querySelector('[data-detail-price]');
  const mrpEl = form.querySelector('[data-detail-mrp]');
  const saveEl = form.querySelector('[data-detail-save]');
  const stockEl = form.querySelector('[data-detail-stock]');
  const addBtn = form.querySelector('[data-detail-add]');
  const buyNowBtn = form.querySelector('[data-detail-buy-now]');
  const statusEl = form.querySelector('[data-detail-status]');

  const sync = () => {
    const variant = variantBySku.get(select.value) || product.variants[0];
    priceEl.textContent = formatInr(variant.price);
    if (mrpEl) {
      mrpEl.textContent = variant.mrp > variant.price ? formatInr(variant.mrp) : '';
      mrpEl.hidden = !(variant.mrp > variant.price);
    }
    if (saveEl) {
      const pct = variant.mrp > variant.price ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100) : 0;
      saveEl.textContent = pct ? `Save ${pct}%` : '';
      saveEl.hidden = !pct;
    }
    const available = variant.stock > 0;
    stockEl.textContent = available
      ? variant.stock <= 5
        ? `Low stock · Only ${variant.stock} units left`
        : `In stock · ${variant.stock} units ready to dispatch`
      : 'Currently out of stock';
    qtyInput.max = String(Math.max(1, variant.stock));
    if (Number(qtyInput.value) > variant.stock && available) qtyInput.value = String(variant.stock);
    qtyInput.disabled = !available;
    addBtn.disabled = !available;
    buyNowBtn.disabled = !available;
  };

  select.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    statusEl.textContent = '';
    const qty = Number(qtyInput.value);
    if (!Number.isInteger(qty) || qty < 1) {
      statusEl.textContent = 'Enter a valid quantity.';
      return;
    }
    try {
      addItemToBag(select.value, qty);
      drawer.open(`${product.name} added to your bag.`);
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  buyNowBtn.addEventListener('click', () => {
    statusEl.textContent = '';
    const qty = Number(qtyInput.value);
    if (!Number.isInteger(qty) || qty < 1) {
      statusEl.textContent = 'Enter a valid quantity.';
      return;
    }
    try {
      addItemToBag(select.value, qty);
      trackEvent('begin_checkout', { source: 'buy_now', sku: select.value });
      location.assign(internalUrl('checkout/'));
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
}

function wireWaitlistForms(useServerApi) {
  for (const form of document.querySelectorAll('[data-waitlist-form]')) {
    const status = form.querySelector('.form-status');
    const emailInput = form.querySelector('input[type="email"]');
    const productSlug = form.dataset.waitlistProduct;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = emailInput.value.trim();
      if (!email) return;
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Saving alert request…';
      try {
        if (useServerApi) {
          const response = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, productSlug }),
            signal: AbortSignal.timeout(10000)
          });
          if (!response.ok) throw new Error('Unable to register waitlist request.');
        } else {
          const list = readJsonStorage('deborra_waitlist_v1', []);
          if (!list.some((item) => item.email === email && item.productSlug === productSlug)) {
            list.push({ email, productSlug, savedAt: new Date().toISOString() });
            writeJsonStorage('deborra_waitlist_v1', list);
          }
        }
        form.reset();
        status.textContent = 'Added! We will email you as soon as this Phase 2 release opens.';
      } catch (err) {
        status.textContent = err.message || 'Could not save your request right now.';
      } finally {
        btn.disabled = false;
      }
    });
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
}

function pinDeliveryEstimate(pin) {
  if (!/^[1-9]\d{5}$/.test(pin)) return 'Enter a 6-digit Indian PIN code for delivery timing.';
  const metroPrefixes = ['11', '40', '56', '50', '60', '70', '38', '41'];
  return metroPrefixes.includes(pin.slice(0, 2))
    ? 'Estimated metro delivery: 2–4 business days after dispatch.'
    : 'Estimated pan-India delivery: 4–6 business days after dispatch.';
}

function wireCheckout(runtimeConfig, useServerApi) {
  const rootEl = document.querySelector('[data-checkout-root]');
  if (!rootEl) return;

  const emptyEl = rootEl.querySelector('[data-checkout-empty]');
  const activeEl = rootEl.querySelector('[data-checkout-active]');
  const form = rootEl.querySelector('#checkout-form');
  const itemsList = rootEl.querySelector('[data-checkout-items]');
  const totalsEl = rootEl.querySelector('[data-checkout-totals]');
  const discountInput = rootEl.querySelector('[data-discount-input]');
  const applyDiscountBtn = rootEl.querySelector('[data-apply-discount]');
  const discountStatus = rootEl.querySelector('[data-discount-status]');
  const errorEl = rootEl.querySelector('[data-checkout-error]');
  const submitBtn = rootEl.querySelector('[data-checkout-submit]');
  const pinInput = form.querySelector('#co-pincode');
  const pinNote = form.querySelector('[data-pin-estimate]');
  const razorpayNote = form.querySelector('[data-razorpay-mode-note]');

  const razorpayKeyId = runtimeConfig?.razorpay?.keyId || settings.razorpay?.keyId || '';
  if (razorpayNote) {
    razorpayNote.textContent = razorpayKeyId
      ? 'Razorpay merchant checkout is active.'
      : 'Razorpay merchant keys not connected yet — orders placed online record as Preview Payment, or choose Cash on Delivery.';
  }

  pinInput?.addEventListener('input', () => {
    if (pinNote) pinNote.textContent = pinDeliveryEstimate(pinInput.value.trim());
  });

  function renderSummary() {
    const summary = calculateBagTotals(getBag());
    const hasItems = summary.lines.length > 0;
    emptyEl.hidden = hasItems;
    activeEl.hidden = !hasItems;
    if (!hasItems) return summary;

    itemsList.replaceChildren();
    for (const line of summary.lines) {
      const li = el('li', 'checkout-item');
      const left = el('div');
      left.append(el('strong', '', line.name), el('small', '', `${line.variantLabel} · Qty ${line.quantity}`));
      li.append(left, el('strong', '', formatInr(line.lineTotal)));
      itemsList.append(li);
    }

    if (discountInput && !discountInput.value && summary.discountCode) {
      discountInput.value = summary.discountCode;
    }
    if (discountStatus) discountStatus.textContent = summary.discountNote;

    totalsEl.replaceChildren();
    const row = (label, val, strong = false) => {
      const wrap = el('div', strong ? 'summary-totals__total' : '');
      wrap.append(el('dt', '', label), el('dd', '', val));
      totalsEl.append(wrap);
    };
    row('Subtotal', formatInr(summary.subtotal));
    if (summary.discountAmount > 0) row(`Discount (${summary.discountCode})`, `−${formatInr(summary.discountAmount)}`);
    row('Shipping', summary.shipping ? formatInr(summary.shipping) : 'Free');
    row('Total (incl. GST)', formatInr(summary.total), true);
    return summary;
  }

  applyDiscountBtn?.addEventListener('click', () => {
    applyDiscountCode(discountInput.value);
    renderSummary();
  });

  renderSummary();
  trackEvent('begin_checkout', { source: 'checkout_page' });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const summary = calculateBagTotals(getBag());
    if (!summary.lines.length) {
      renderSummary();
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const rawPhone = String(fd.get('phone') || '').replace(/\D/g, '');
    const phone = rawPhone.length > 10 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;
    const addressLine1 = String(fd.get('addressLine1') || '').trim();
    const addressLine2 = String(fd.get('addressLine2') || '').trim();
    const city = String(fd.get('city') || '').trim();
    const state = String(fd.get('state') || '').trim();
    const pincode = String(fd.get('pincode') || '').trim();
    const paymentMethod = String(fd.get('paymentMethod') || 'cod');

    if (name.length < 2) {
      errorEl.textContent = 'Please enter your full name.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      errorEl.textContent = 'Please enter a valid 10-digit Indian mobile number.';
      return;
    }
    if (addressLine1.length < 5 || city.length < 2 || !state || !/^[1-9]\d{5}$/.test(pincode)) {
      errorEl.textContent = 'Please complete your delivery address, state and 6-digit Indian PIN code.';
      return;
    }

    const payload = {
      customerName: name,
      email,
      phone,
      address: { addressLine1, addressLine2, city, state, pincode },
      items: summary.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
      discountCode: summary.discountCode,
      paymentMethod
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing order…';

    try {
      if (useServerApi) {
        const res = await fetch('/api/shop/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create your order.');

        if (paymentMethod === 'razorpay' && data.razorpayOrderId && razorpayKeyId) {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            await fetch('/api/shop/razorpay/cancel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.order.orderId, razorpayOrderId: data.razorpayOrderId }),
              keepalive: true
            }).catch(() => {});
            throw new Error('Unable to load Razorpay payment window. Please choose COD or disable adblockers.');
          }

          await new Promise((resolve, reject) => {
            const rzp = new window.Razorpay({
              key: razorpayKeyId,
              amount: data.amountPaise,
              currency: 'INR',
              name: 'DEBORRA',
              description: `Order ${data.order.orderId}`,
              order_id: data.razorpayOrderId,
              prefill: { name, email, contact: `+91${phone}` },
              theme: { color: '#061610' },
              modal: {
                ondismiss: () => {
                  fetch('/api/shop/razorpay/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: data.order.orderId, razorpayOrderId: data.razorpayOrderId }),
                    keepalive: true
                  }).catch(() => {});
                  reject(new Error('Payment was cancelled before completion.'));
                }
              },
              handler: async (response) => {
                try {
                  const verifyRes = await fetch('/api/shop/razorpay/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      orderId: data.order.orderId,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature
                    }),
                    signal: AbortSignal.timeout(15000)
                  });
                  const verified = await verifyRes.json();
                  if (!verifyRes.ok) throw new Error(verified.error || 'Payment signature verification failed.');
                  saveLocalOrder(verified.order);
                  clearBag();
                  trackEvent('purchase', { orderId: verified.order.orderId, total: verified.order.total });
                  resolve();
                } catch (verifyErr) {
                  reject(verifyErr);
                }
              }
            });
            rzp.open();
          });
          location.assign(internalUrl('order-confirmation/', { id: data.order.orderId }));
          return;
        }

        saveLocalOrder(data.order);
        clearBag();
        trackEvent('purchase', { orderId: data.order.orderId, total: data.order.total });
        location.assign(internalUrl('order-confirmation/', { id: data.order.orderId }));
        return;
      }

      // Static direct-publish mode (Vercel static / GitHub Pages)
      const orderId = 'DEB-' + new Date().getFullYear() + '-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      if (paymentMethod === 'razorpay' && razorpayKeyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Unable to load Razorpay payment window. Please try COD or retry.');
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: razorpayKeyId,
            amount: summary.total * 100,
            currency: 'INR',
            name: 'DEBORRA',
            description: `Order ${orderId}`,
            prefill: { name, email, contact: `+91${phone}` },
            theme: { color: '#061610' },
            modal: { ondismiss: () => reject(new Error('Payment was cancelled before completion.')) },
            handler: (response) => {
              const orderRecord = {
                orderId,
                createdAt: new Date().toISOString(),
                status: 'Confirmed',
                paymentMethod: 'Razorpay (Online)',
                paymentStatus: `Paid (${response.razorpay_payment_id})`,
                customerName: name,
                email,
                phone,
                address: payload.address,
                items: summary.lines,
                discountCode: summary.discountApplied ? summary.discountCode : '',
                subtotal: summary.subtotal,
                discountAmount: summary.discountAmount,
                shipping: summary.shipping,
                total: summary.total
              };
              saveLocalOrder(orderRecord);
              clearBag();
              trackEvent('purchase', { orderId, total: summary.total });
              resolve();
            }
          });
          rzp.open();
        });
        location.assign(internalUrl('order-confirmation/', { id: orderId }));
        return;
      }

      const orderRecord = {
        orderId,
        createdAt: new Date().toISOString(),
        status: 'Confirmed',
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Preview (Configure Key ID for live capture)',
        paymentStatus: paymentMethod === 'cod' ? 'Pay on Delivery' : 'Preview Recorded',
        customerName: name,
        email,
        phone,
        address: payload.address,
        items: summary.lines,
        discountCode: summary.discountApplied ? summary.discountCode : '',
        subtotal: summary.subtotal,
        discountAmount: summary.discountAmount,
        shipping: summary.shipping,
        total: summary.total
      };
      saveLocalOrder(orderRecord);
      clearBag();
      trackEvent('purchase', { orderId, total: summary.total });
      location.assign(internalUrl('order-confirmation/', { id: orderId }));
    } catch (err) {
      errorEl.textContent = err.message || 'We could not complete your order. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete order';
    }
  });
}

function renderOrderReceipt(container, order) {
  container.replaceChildren();
  const grid = el('div', 'confirmation-grid');

  const card = el('div', 'checkout-panel');
  card.append(
    el('p', 'kicker', 'Order confirmed'),
    el('h2', '', `Order ${order.orderId}`),
    el('p', 'confirmation-meta', `Placed on ${new Date(order.createdAt).toLocaleString('en-IN')} · Status: ${order.status}`),
    el('p', '', `Payment: ${order.paymentMethod} (${order.paymentStatus})`)
  );

  const addrHeading = el('h3', 'confirmation-subheading', 'Delivery address');
  const addr = el('address', 'confirmation-address');
  addr.append(
    el('div', '', order.customerName),
    el('div', '', order.address.addressLine1),
    ...(order.address.addressLine2 ? [el('div', '', order.address.addressLine2)] : []),
    el('div', '', `${order.address.city}, ${order.address.state} ${order.address.pincode}`),
    el('div', '', `Phone: +91 ${order.phone} · ${order.email}`)
  );
  card.append(addrHeading, addr);

  const actions = el('div', 'button-row');
  const trackLink = el('a', 'button button--primary', 'Track order status');
  trackLink.href = internalUrl('track-order/', { id: order.orderId, contact: order.phone });
  const printBtn = el('button', 'button button--outline-dark', 'Print receipt');
  printBtn.type = 'button';
  printBtn.addEventListener('click', () => window.print());
  const shopLink = el('a', 'text-link', 'Continue shopping');
  shopLink.href = internalUrl('shop/');
  actions.append(trackLink, printBtn, shopLink);
  card.append(actions);

  const summary = el('aside', 'checkout-summary');
  summary.append(el('h2', '', 'Items & receipt'));
  const items = el('ul', 'checkout-items');
  for (const item of order.items) {
    const li = el('li', 'checkout-item');
    const left = el('div');
    left.append(el('strong', '', item.name), el('small', '', `${item.variantLabel} · Qty ${item.quantity}`));
    li.append(left, el('strong', '', formatInr(item.lineTotal)));
    items.append(li);
  }
  const totals = el('dl', 'summary-totals');
  const addRow = (k, v, bold = false) => {
    const row = el('div', bold ? 'summary-totals__total' : '');
    row.append(el('dt', '', k), el('dd', '', v));
    totals.append(row);
  };
  addRow('Subtotal', formatInr(order.subtotal));
  if (order.discountAmount > 0) addRow(`Discount (${order.discountCode || 'Applied'})`, `−${formatInr(order.discountAmount)}`);
  addRow('Shipping', order.shipping ? formatInr(order.shipping) : 'Free');
  addRow('Total paid / due', formatInr(order.total), true);
  summary.append(items, totals);

  grid.append(card, summary);
  container.append(grid);
}

function wireConfirmation() {
  const rootEl = document.querySelector('[data-confirmation-root]');
  if (!rootEl) return;
  const orderId = new URLSearchParams(location.search).get('id');
  const order = orderId ? findLocalOrder(orderId) : null;
  if (!order) {
    rootEl.replaceChildren(
      el('h2', '', 'No recent order found in this browser.'),
      el('p', '', 'Use the Track Order page with your Order ID and phone/email to look up an existing order.')
    );
    const link = el('a', 'button button--primary', 'Go to Track Order');
    link.href = internalUrl('track-order/');
    rootEl.append(link);
    return;
  }
  renderOrderReceipt(rootEl, order);
}

function renderTrackingTimeline(resultEl, order) {
  resultEl.replaceChildren();
  resultEl.append(
    el('p', 'kicker', `Order ${order.orderId}`),
    el('h2', '', `Current status: ${order.status}`),
    el('p', '', `Payment: ${order.paymentMethod} · ${order.paymentStatus}`),
    el('p', '', `Destination: ${order.address.city}, ${order.address.state} ${order.address.pincode}`)
  );
  if (order.carrierNote) resultEl.append(el('p', 'image-note', order.carrierNote));

  const stages = ['Confirmed', 'Packed', 'Dispatched', 'Out for Delivery', 'Delivered'];
  const currentIdx = Math.max(0, stages.findIndex((s) => s.toLowerCase() === String(order.status || '').toLowerCase()));
  const list = el('ol', 'tracking-timeline');
  stages.forEach((stage, index) => {
    const li = el('li', index <= currentIdx ? 'is-complete' : '');
    li.append(el('strong', '', stage), el('span', '', index === currentIdx ? 'Current stage' : index < currentIdx ? 'Completed' : 'Pending'));
    list.append(li);
  });
  resultEl.append(list);
}

function wireOrderTracking(useServerApi) {
  const form = document.querySelector('[data-track-form]');
  const resultEl = document.querySelector('[data-track-result]');
  const statusEl = document.querySelector('[data-track-status]');
  const demoBtn = document.querySelector('[data-track-demo]');
  if (!form || !resultEl) return;

  async function lookup(orderId, contact) {
    statusEl.textContent = 'Checking order status…';
    try {
      let found = null;
      if (useServerApi && orderId.toUpperCase() !== 'DEB-DEMO-2026') {
        const res = await fetch(
          `/api/shop/orders/track?id=${encodeURIComponent(orderId)}&contact=${encodeURIComponent(contact)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (res.ok) {
          const data = await res.json();
          found = data.order;
        }
      }
      if (!found) found = findLocalOrder(orderId, contact);
      if (!found) {
        statusEl.textContent = 'No matching order found. Verify your Order ID and phone/email.';
        return;
      }
      statusEl.textContent = '';
      renderTrackingTimeline(resultEl, found);
    } catch {
      statusEl.textContent = 'Unable to check order status right now. Call +91 77150 38107 for help.';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const orderId = form.elements.orderId.value.trim();
    const contact = form.elements.contact.value.trim();
    if (!orderId || !contact) return;
    lookup(orderId, contact);
  });

  demoBtn?.addEventListener('click', () => {
    form.elements.orderId.value = 'DEB-DEMO-2026';
    form.elements.contact.value = '9800000000';
    lookup('DEB-DEMO-2026', '9800000000');
  });

  const params = new URLSearchParams(location.search);
  if (params.get('id') && params.get('contact')) {
    form.elements.orderId.value = params.get('id');
    form.elements.contact.value = params.get('contact');
    lookup(params.get('id'), params.get('contact'));
  }
}

export async function activateNativeStore(runtimeConfig = null) {
  const useServerApi = Boolean(backendPage && runtimeConfig?.nativeStore);
  if (useServerApi) {
    try {
      const res = await fetch('/api/shop/catalog', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.products)) indexCatalog(payload.products);
      }
    } catch {
      // Fall back smoothly to embedded catalog metadata.
    }
  }

  drawer = createBagDrawer();
  updateBagBadges();
  window.addEventListener('storage', (event) => {
    if (event.key === BAG_KEY) updateBagBadges();
  });

  for (const btn of document.querySelectorAll('[data-open-cart]')) {
    btn.hidden = false;
    btn.addEventListener('click', () => drawer.open());
  }

  wireProductCards();
  wireShopFiltering();
  wireProductDetail();
  wireWaitlistForms(useServerApi);
  wireCheckout(runtimeConfig, useServerApi);
  wireConfirmation();
  wireOrderTracking(useServerApi);
}
