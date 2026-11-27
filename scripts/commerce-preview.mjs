import { products } from './content.mjs';

export const commercePath = '/commerce-preview/';

const samples = [
  {
    slug: 'rosemary-hair-oil',
    variants: [
      { id: 'rosemary-100', label: '100 ml', price: 649, stock: 5 },
      { id: 'rosemary-duo', label: 'Duo · 2 × 100 ml', price: 1199, stock: 3 }
    ]
  },
  {
    slug: 'amla-hair-oil',
    variants: [{ id: 'amla-100', label: '100 ml', price: 549, stock: 5 }]
  },
  {
    slug: 'hair-scalp-serum',
    variants: [{ id: 'serum-30', label: '30 ml', price: 799, stock: 0 }]
  }
].map(({ slug, variants }) => ({ ...products.find((product) => product.slug === slug), variants }));

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function sampleCard(product) {
  const first = product.variants[0];
  return `<article class="product-card preview-card">
    <div class="product-card__image">
      <img src="../assets/${product.image}" alt="${escape(product.alt)}" width="800" height="800">
      <span class="product-card__stage">Sample product</span>
    </div>
    <div class="product-card__body">
      <p class="kicker">${escape(product.format)}</p>
      <h2>${escape(product.name)}</h2>
      <form class="preview-product-form" data-product="${product.slug}">
        <label for="variant-${product.slug}">Size</label>
        <select id="variant-${product.slug}" name="variant">
          ${product.variants.map(({ id, label }) => `<option value="${id}">${escape(label)}</option>`).join('')}
        </select>
        <div class="preview-product-meta"><strong data-price>${money.format(first.price)}</strong><span data-stock>${first.stock ? 'In stock' : 'Sold out'}</span></div>
        <button class="button button--primary" type="submit" disabled>${first.stock ? 'Add to bag' : 'Sold out'}</button>
      </form>
    </div>
  </article>`;
}

export function renderCommercePreview() {
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Store Preview | DEBORRA</title>
  <link rel="icon" type="image/png" href="../assets/favicon.png">
  <link rel="stylesheet" href="../assets/site.css">
  <link rel="stylesheet" href="./commerce.css">
  <script type="application/json" id="preview-products">${JSON.stringify(samples).replaceAll('<', '\\u003c')}</script>
  <script type="module" src="./commerce.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement"><span class="diamond" aria-hidden="true"></span><span>Store preview <span aria-hidden="true">·</span> Sample prices and orders</span><span class="diamond" aria-hidden="true"></span></div>
  <header class="site-header">
    <div class="container preview-header">
      <a class="brand-mark" href="../" aria-label="DEBORRA home"><img src="../assets/deborra-logo.png" alt="DEBORRA" width="78" height="52"></a>
      <nav aria-label="Store preview"><a href="#collection" data-preview-nav="collection">Collection</a><a href="#bag" data-preview-nav="bag">Bag <span id="bag-count">0</span></a></nav>
      <a class="button button--header" href="../">Pre-launch site</a>
    </div>
  </header>
  <main id="main" tabindex="-1">
    <noscript><p class="container preview-noscript">Enable JavaScript to try the sample bag and checkout.</p></noscript>
    <section data-view="collection" aria-labelledby="collection-heading">
      <div class="preview-hero">
        <div class="container">
          <p class="eyebrow"><span aria-hidden="true"></span>Store preview</p>
          <h1 id="collection-heading" tabindex="-1">The first <em>collection.</em></h1>
          <p>Try the shopping experience with sample prices and availability. Orders and payments are simulated.</p>
        </div>
      </div>
      <div class="container preview-catalog">
        <div class="product-grid">${samples.map(sampleCard).join('')}</div>
        <p class="image-note">Illustrative imagery. Actual products and launch details are in development.</p>
      </div>
    </section>
    <section class="container preview-step" data-view="bag" aria-labelledby="bag-heading" hidden>
      <p class="eyebrow"><span aria-hidden="true"></span>Store preview</p>
      <h1 id="bag-heading" tabindex="-1">Your bag.</h1>
      <div class="preview-empty" id="empty-bag" hidden>
        <p>Your bag is empty.</p>
        <a class="button button--primary" href="#collection">Explore the collection</a>
      </div>
      <div class="preview-columns" id="filled-bag" hidden>
        <div>
          <ul id="bag-items" class="bag-items" aria-label="Items in your bag"></ul>
          <a class="text-link" href="#collection">Continue shopping</a>
        </div>
        <aside class="preview-summary" aria-labelledby="bag-summary-heading">
          <h2 id="bag-summary-heading">Order summary</h2>
          <form class="discount-form" id="discount-form">
            <label for="discount-code">Discount code</label>
            <div><input id="discount-code" name="discount" maxlength="24" placeholder="DEBORRA10" aria-describedby="discount-hint"><button type="submit">Apply</button></div>
            <p id="discount-hint">Try the sample code DEBORRA10.</p>
            <p class="discount-status" id="discount-status" role="status"></p>
          </form>
          <div id="bag-totals"></div>
          <a class="button button--primary" href="#checkout">Continue to checkout</a>
        </aside>
      </div>
    </section>
    <section class="container preview-step" data-view="checkout" aria-labelledby="checkout-heading" hidden>
      <p class="eyebrow"><span aria-hidden="true"></span>Store preview</p>
      <h1 id="checkout-heading" tabindex="-1">Checkout.</h1>
      <div class="preview-columns">
        <form id="checkout-form" class="checkout-form">
          <section class="checkout-panel" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading">Delivery details</h2>
            <p>Sample recipient</p>
            <address>24 Sample Lane<br>Mumbai, Maharashtra 400001<br>India</address>
            <p class="preview-help">This preview uses a sample address.</p>
          </section>
          <fieldset class="checkout-panel">
            <legend>Payment method</legend>
            <p class="preview-help">Select a sample method. No payment details are collected.</p>
            ${['UPI', 'Card', 'Net banking', 'Wallet'].map((method, index) => `<label class="preview-radio"><input type="radio" name="payment" value="${method}" ${index === 0 ? 'checked' : ''} required> ${method}</label>`).join('')}
          </fieldset>
          <a class="text-link" href="#bag">Back to bag</a>
        </form>
        <aside class="preview-summary" aria-labelledby="checkout-summary-heading">
          <h2 id="checkout-summary-heading">Order summary</h2>
          <ul class="checkout-items" id="checkout-items"></ul>
          <div id="checkout-totals"></div>
          <button class="button button--gold" type="submit" form="checkout-form">Place sample order</button>
        </aside>
      </div>
    </section>
    <section class="container preview-step" data-view="confirmation" aria-labelledby="confirmation-heading" hidden>
      <p class="eyebrow"><span aria-hidden="true"></span>Store preview</p>
      <h1 id="confirmation-heading" tabindex="-1">Sample order confirmed.</h1>
      <p class="confirmation-lead">You’ve reached the confirmation screen. No payment was taken and no order will ship.</p>
      <div class="preview-columns">
        <section class="confirmation-card" aria-labelledby="tracking-heading">
          <h2 id="tracking-heading">Sample tracking</h2>
          <ol class="tracking-list">
            <li class="tracking-list__current"><strong>Order confirmed</strong><span>Preview complete</span></li>
            <li><strong>Packed</strong></li>
            <li><strong>Shipped</strong></li>
            <li><strong>Delivered</strong></li>
          </ol>
        </section>
        <aside class="preview-summary" id="confirmation-summary" aria-label="Sample receipt"></aside>
      </div>
      <a class="button button--primary" href="#collection">Back to collection</a>
    </section>
  </main>
  <p class="preview-status" id="preview-status" role="status" aria-live="polite"></p>
  <footer class="site-footer"><div class="container footer-bottom"><small>© DEBORRA World · Local store preview</small><a href="../">Pre-launch site</a></div></footer>
</body>
</html>`;
}
