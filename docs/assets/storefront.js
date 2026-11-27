import { httpsUrl, settings } from './site-config.js';

const { domain, categoryHandles, featuredCollection, accountUrl } = settings.store;
const root = new URL(document.documentElement.dataset.siteRoot, location.href);
const categoryKeys = [...new Set(categoryHandles.filter(validHandle))];
const policyLabels = {
  shippingPolicy: 'Shipping and delivery policy',
  refundPolicy: 'Returns and refunds policy',
  privacyPolicy: 'Privacy policy',
  termsOfService: 'Terms & conditions'
};

function validHandle(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/.test(value);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function internal(path, query = {}) {
  const url = new URL(path, root);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.href;
}

function link(label, href, className = 'text-link') {
  const node = element('a', className, label);
  node.href = href;
  return node;
}

function headingLabel(label) {
  const node = element('p', 'eyebrow');
  const line = element('span');
  line.setAttribute('aria-hidden', 'true');
  node.append(line, label);
  return node;
}

function price(money) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: money.currencyCode })
    .format(Number(money.amount));
}

async function query(operation, values = {}) {
  const url = new URL('/api/store/' + operation, location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, value);
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Storefront request failed');
  return response.json();
}

function productImage(data, alt = '', eager = false) {
  const imageUrl = httpsUrl(data?.url);
  if (!imageUrl) return element('div', 'store-image-placeholder', 'Image coming soon');
  const image = element('img');
  image.src = imageUrl.href;
  image.alt = data.altText || alt;
  image.width = 800;
  image.height = 800;
  image.loading = eager ? 'eager' : 'lazy';
  image.decoding = 'async';
  return image;
}

function productCard(product, headingTag) {
  const card = element('article', 'product-card');
  const productLink = link('', internal('shop/product/', { handle: product.handle }), 'product-card__link');
  const media = element('div', 'product-card__image');
  media.append(productImage(product.featuredImage, product.title));
  if (!product.availableForSale) media.append(element('span', 'product-card__stage', 'Sold out'));
  const copy = element('div', 'product-card__body');
  if (product.productType) copy.append(element('p', 'kicker', product.productType));
  const { minVariantPrice, maxVariantPrice } = product.priceRange;
  const from = minVariantPrice.amount !== maxVariantPrice.amount ? 'From ' : '';
  copy.append(
    element(headingTag, 'store-card-title', product.title),
    element('p', 'store-price', from + price(minVariantPrice)),
    element('span', 'card-link', 'View product')
  );
  productLink.append(media, copy);
  card.append(productLink);
  return card;
}

async function getProducts(category, size, after = null) {
  if (category) {
    const data = await query('collection', { handle: category, size, after });
    return data.collection;
  }
  const data = await query('products', { size, after });
  return { title: 'Shop all products.', description: 'Discover the DEBORRA collection.', products: data.products };
}

async function getCategories() {
  if (!categoryKeys.length) return [];
  const data = await query('categories');
  return Object.values(data).filter((category) => category?.products.nodes.length);
}

function retry(target, label, onRetry) {
  const message = element('p', '', label);
  message.setAttribute('role', 'status');
  const button = element('button', 'button button--primary', 'Try again');
  button.type = 'button';
  button.addEventListener('click', onRetry, { once: true });
  target.replaceChildren(message, button);
}

function shopIntro(title, description) {
  const section = element('section', 'page-intro');
  const container = element('div', 'container');
  container.append(headingLabel('The collection'), element('h1', '', title),
    element('p', 'page-intro__lead', description));
  section.append(container);
  return section;
}

async function renderCatalog(target) {
  const featured = target.dataset.liveCatalog === 'featured';
  const requested = new URLSearchParams(location.search).get('category');
  const category = featured
    ? (validHandle(featuredCollection) ? featuredCollection : '')
    : (categoryKeys.includes(requested) ? requested : '');
  const size = featured ? 3 : 12;
  const container = element('div', featured ? 'container' : 'container section shop-content');
  const status = element('p', 'store-status', 'Loading products…');
  status.setAttribute('role', 'status');
  container.append(status);
  target.replaceChildren(...(featured ? [] : [shopIntro('Shop all products.', 'Discover the DEBORRA collection.')]), container);
  target.hidden = false;

  try {
    const [selection, categories] = await Promise.all([
      getProducts(category, size),
      featured ? [] : getCategories().catch(() => [])
    ]);
    const collection = featured && !selection ? await getProducts('', size) : selection;
    if (!featured) {
      const title = collection?.title || 'Collection unavailable.';
      target.firstElementChild.replaceWith(shopIntro(title, collection?.description || 'Discover the DEBORRA collection.'));
      if (category && collection) document.title = `${title} | DEBORRA`;
    }

    const grid = element('div', 'product-grid');
    const children = [];
    if (featured) {
      const top = element('div', 'section-heading section-heading--compact');
      const label = element('div');
      label.append(headingLabel('The collection'), element('h2', '', 'Shop the collection.'));
      top.append(label, link('View all products', internal('shop/')));
      children.push(top);
    } else if (categories.length) {
      const nav = element('nav', 'catalog-filters store-categories');
      nav.setAttribute('aria-label', 'Product categories');
      const all = { handle: '', title: 'All products' };
      for (const item of [all, ...categories]) {
        const tab = link(item.title, internal('shop/', item.handle ? { category: item.handle } : {}), 'filter');
        if (item.handle === category) tab.setAttribute('aria-current', 'page');
        nav.append(tab);
      }
      children.push(nav);
    }

    const nodes = collection?.products.nodes || [];
    container.replaceChildren(...children, status, grid);
    status.textContent = nodes.length ? '' : 'There are no products to display in this collection yet.';
    grid.append(...nodes.map((product) => productCard(product, featured ? 'h3' : 'h2')));
    if (!featured && collection?.products.pageInfo.hasNextPage) {
      let { endCursor } = collection.products.pageInfo;
      const more = element('button', 'button button--primary store-more', 'Load more products');
      more.type = 'button';
      container.append(more);
      more.addEventListener('click', async () => {
        more.disabled = true;
        status.textContent = 'Loading more products…';
        try {
          const page = (await getProducts(category, size, endCursor)).products;
          grid.append(...page.nodes.map((product) => productCard(product, 'h2')));
          endCursor = page.pageInfo.endCursor;
          status.textContent = `${grid.childElementCount} products displayed.`;
          more.hidden = !page.pageInfo.hasNextPage;
          if (more.hidden) grid.lastElementChild?.querySelector('a')?.focus();
        } catch {
          status.textContent = 'More products couldn’t be loaded. Try again.';
        } finally {
          more.disabled = false;
        }
      });
    }
  } catch {
    retry(container, 'Products couldn’t be loaded right now.', () => renderCatalog(target));
  }
}

let cartLoading;

function getCart() {
  cartLoading ||= import('./server-cart.js').then(({ makeCart }) => makeCart()).catch((error) => {
    cartLoading = undefined;
    throw error;
  });
  return cartLoading;
}

function productFields(product) {
  const fields = element('div', 'detail-accordions');
  for (const [key, title] of [
    ['ingredients', 'Ingredients'], ['directions', 'Usage & directions'],
    ['warnings', 'Warnings & suitability'], ['faq', 'Product FAQ']
  ]) {
    const value = product[key]?.value?.trim();
    if (!value) continue;
    const details = element('details', 'accordion');
    details.append(element('summary', '', title), element('p', 'accordion__body store-product-text', value));
    fields.append(details);
  }
  return fields;
}

function purchaseForm(product, imagePanel) {
  const variants = product.variants.nodes;
  const form = element('form', 'store-purchase');
  const formStatus = element('p', 'store-status');
  formStatus.setAttribute('role', 'status');
  const variant = element('select', 'store-select');
  variant.id = 'store-variant';
  for (const item of variants) {
    const option = element('option', '', item.title === 'Default Title' ? 'Standard' : item.title);
    option.value = item.id;
    if (!item.availableForSale) option.textContent += ' · Sold out';
    variant.append(option);
  }
  variant.value = (variants.find((item) => item.availableForSale) || variants[0])?.id || '';
  const variantLabel = element('label', '', 'Variant');
  variantLabel.htmlFor = variant.id;
  const quantity = element('input', 'store-select');
  Object.assign(quantity, { type: 'number', min: '1', step: '1', required: true, value: '1', id: 'store-quantity' });
  const quantityLabel = element('label', '', 'Quantity');
  quantityLabel.htmlFor = quantity.id;
  const actions = element('div', 'store-purchase__actions');
  const button = element('button', 'button button--primary', 'Add to bag');
  button.type = 'submit';
  actions.append(quantityLabel, quantity, button);
  const line = element('div', 'store-variant-meta');
  const cost = element('p', 'store-price');
  const inventory = element('p', 'detail-stage');
  inventory.setAttribute('aria-live', 'polite');
  line.append(cost, inventory);
  form.append(variantLabel, variant, line, actions, formStatus);
  variantLabel.hidden = variant.hidden = variants.length < 2;

  function update() {
    const selected = variants.find((item) => item.id === variant.value);
    const hasStockLimit = selected?.quantityAvailable > 0 && !selected.currentlyNotInStock;
    const available = selected?.availableForSale === true;
    cost.textContent = selected ? price(selected.price) : '';
    inventory.textContent = available ? (selected.currentlyNotInStock ? 'Available to order' : 'In stock') : 'Sold out';
    button.disabled = quantity.disabled = !available;
    button.textContent = available ? 'Add to bag' : 'Sold out';
    if (hasStockLimit) {
      quantity.max = String(Math.min(selected.quantityAvailable, 999));
      if (+quantity.value > +quantity.max) quantity.value = quantity.max;
    } else quantity.max = '999';
    imagePanel.replaceChildren(productImage(selected?.image || product.featuredImage, product.title, true));
  }

  variant.addEventListener('change', update);
  update();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = variants.find((item) => item.id === variant.value);
    const count = Number(quantity.value);
    if (!selected?.availableForSale || !Number.isSafeInteger(count) || count < 1 || !form.checkValidity()) return;
    button.disabled = true;
    variant.disabled = true;
    formStatus.textContent = 'Opening your bag…';
    try {
      const cart = await getCart();
      await cart.addLine({ variantId: selected.id, quantity: count });
      await cart.showModal();
      formStatus.textContent = '';
    } catch (error) {
      formStatus.textContent = error.message || 'Your bag couldn’t be updated. Please try again.';
    } finally {
      button.disabled = false;
      variant.disabled = false;
    }
  });
  return form;
}

async function renderProduct(target) {
  const handle = new URLSearchParams(location.search).get('handle');
  const status = element('p', 'store-status', validHandle(handle) ? 'Loading product…' : 'Choose a product from the collection.');
  status.setAttribute('role', 'status');
  const browse = link('Browse the shop', internal('shop/'));
  target.replaceChildren(element('h1', 'store-product-heading', 'DEBORRA products'), status, browse);
  if (!validHandle(handle)) return;

  try {
    const { product } = await query('product', { handle });
    if (!product) {
      status.textContent = 'This product is unavailable.';
      return;
    }
    document.title = `${product.title} | DEBORRA`;
    document.querySelector('meta[name="robots"]')?.remove();
    const nav = element('nav', 'breadcrumbs breadcrumbs--light');
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.append(link('Home', internal('')), '/', link('Shop', internal('shop/')), '/', element('span', '', product.title));
    const layout = element('div', 'detail-grid');
    const imagePanel = element('figure', 'detail-image');
    const detail = element('div', 'detail-copy');
    detail.append(headingLabel(product.productType || 'The collection'), element('h1', '', product.title),
      element('p', 'detail-lead store-product-text', product.description),
      purchaseForm(product, imagePanel), productFields(product));
    layout.append(imagePanel, detail);
    target.replaceChildren(nav, layout);
  } catch {
    retry(target, 'This product couldn’t be loaded right now.', () => renderProduct(target));
    target.append(browse);
  }
}

async function renderPolicies(target) {
  const policies = target.dataset.storePolicies.split(' ');
  const scope = target.closest('dialog, main');
  const intro = scope.querySelector('[data-policy-intro], .page-intro__lead');
  intro.textContent = 'Read the current DEBORRA policies for this website and your orders.';
  const fallback = target.closest('[data-prose-sections]').querySelector('[data-policy-fallback]');
  fallback.hidden = true;
  target.hidden = false;
  target.replaceChildren(element('p', 'store-status', 'Loading the current policies…'));
  try {
    const customPrivacy = httpsUrl(settings.privacyUrl);
    const needsApi = policies.some((key) => key !== 'privacyPolicy' || !customPrivacy);
    const { shop } = needsApi ? await query('policies') : { shop: {} };
    target.replaceChildren(...policies.map((key) => {
      const url = key === 'privacyPolicy' && customPrivacy ? customPrivacy : httpsUrl(shop[key]?.url);
      const section = element('section');
      section.append(element(scope.matches('dialog') ? 'h3' : 'h2', '', policyLabels[key]));
      section.append(url ? link('Read the policy', url.href) : element('p', '', 'Contact DEBORRA customer support for details.'));
      return section;
    }));
  } catch {
    retry(target, 'The policies couldn’t be loaded right now.', () => renderPolicies(target));
  }
}

export function activateStorefront() {
  for (const item of document.querySelectorAll('[data-store-copy]')) item.textContent = item.dataset.storeCopy;
  for (const item of document.querySelectorAll('[data-prelaunch-only], [data-launch-cta]')) item.hidden = true;

  const account = httpsUrl(accountUrl)?.href || `https://${domain}/account`;
  for (const node of document.querySelectorAll('[data-account-link]')) {
    node.href = account;
    node.hidden = false;
  }

  const cartButton = document.querySelector('[data-open-cart]');
  const cartStatus = element('p', 'store-cart-status');
  cartStatus.setAttribute('role', 'status');
  document.body.append(cartStatus);
  cartButton.hidden = false;
  cartButton.addEventListener('click', async () => {
    cartButton.disabled = true;
    cartButton.textContent = 'Opening bag…';
    cartStatus.textContent = '';
    try {
      await (await getCart()).showModal();
    } catch {
      cartStatus.textContent = 'Your bag couldn’t be opened. Please try again.';
    } finally {
      cartButton.disabled = false;
      cartButton.textContent = 'Bag';
    }
  });

  const catalog = document.querySelector('[data-live-catalog]');
  if (catalog) renderCatalog(catalog);
  const product = document.querySelector('[data-live-product]');
  if (product) renderProduct(product);
  const policies = document.querySelector('main [data-store-policies]');
  if (policies) renderPolicies(policies);

  for (const faq of document.querySelectorAll('[data-store-faq]')) faq.hidden = false;
  if (document.querySelector('main [data-store-faq]')) {
    document.querySelector('.page-intro__lead').textContent = 'Find answers about orders, product information and customer support.';
  }

  function openPolicyDialog(dialog) {
    const panel = dialog.querySelector('[data-store-policies]');
    if (panel?.hidden) renderPolicies(panel);
  }
  document.addEventListener('deborra:dialog-open', (event) => openPolicyDialog(event.target));
  for (const dialog of document.querySelectorAll('.site-dialog[open]')) openPolicyDialog(dialog);
}
