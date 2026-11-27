import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles, brand, categories, discountCodes, faqs, founder, products } from './content.mjs';

const output = fileURLToPath(new URL('../docs/', import.meta.url));
const brandDescription =
  'DEBORRA World offers thoughtfully formulated botanical hair care and everyday wellness across India—starting with Rosemary Hair Oil, Amla Hair Oil, Hair & Scalp Serum and Amla Powder.';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

const navigation = [
  ['Home', ''],
  ['Shop', 'shop/'],
  ['Hair Oils', 'shop/hair-oils/'],
  ['Serums', 'shop/serums/'],
  ['Wellness', 'shop/wellness/'],
  ['Our Story', 'about/'],
  ['Journal', 'journal/']
];

const footerLinks = [
  [
    'Shop',
    [
      ['All Products', 'shop/'],
      ['Hair Oils', 'shop/hair-oils/'],
      ['Serums', 'shop/serums/'],
      ['Wellness', 'shop/wellness/'],
      ['Hair Cream & Care', 'shop/hair-care/']
    ]
  ],
  [
    'Brand & Learn',
    [
      ['Our Story', 'about/'],
      ['Our Approach', 'quality/'],
      ['Journal', 'journal/'],
      ['Newsletter', '#launch-list']
    ]
  ],
  [
    'Support & Policies',
    [
      ['Track an Order', 'track-order/'],
      ['FAQs', 'faq/'],
      ['Contact & Support', 'contact/'],
      ['Shipping & Returns', 'shipping-returns/'],
      ['Privacy Policy', 'privacy/'],
      ['Terms & Conditions', 'terms/']
    ]
  ]
];

const dialogsByDestination = {
  '#launch-list': 'launch-dialog',
  'faq/': 'faq-dialog',
  'shipping-returns/': 'shipping-dialog'
};

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const formatInr = (amount) => moneyFormatter.format(amount);

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]
  );

function paths(route) {
  const prefix = '../'.repeat(route.split('/').filter(Boolean).length) || './';
  return (target = '') => prefix + target;
}

function eyebrow(text) {
  return `<p class="eyebrow"><span aria-hidden="true"></span>${escapeHtml(text)}</p>`;
}

function dialogAttribute(destination) {
  const dialog = dialogsByDestination[destination];
  return dialog ? ` data-dialog-open="${dialog}"` : '';
}

function button(label, url, style = 'primary', destination = '') {
  return `<a class="button button--${style}" href="${url}"${dialogAttribute(destination)}>${escapeHtml(label)}</a>`;
}

function textLink(label, url, destination = '') {
  return `<a class="text-link" href="${url}"${dialogAttribute(destination)}>${escapeHtml(label)}</a>`;
}

function image(link, filename, alt, extra = '') {
  return `<img src="${link('assets/' + filename)}" alt="${escapeHtml(alt)}" ${extra}>`;
}

function details(title, body, open = false) {
  return `<details class="accordion"${open ? ' open' : ''}><summary>${escapeHtml(title)}</summary><div class="accordion__body">${body}</div></details>`;
}

function header(link, route) {
  const isProductRoute = route.startsWith('products/');
  const activeNavRoute = isProductRoute ? 'shop/' : route;
  return `<a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement"><span class="diamond" aria-hidden="true"></span><span>Free India shipping on orders ${formatInr(brand.freeShippingThreshold)}+ <span aria-hidden="true">·</span> Use code DEBORRA10 for 10% off</span><span class="diamond" aria-hidden="true"></span></div>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand-mark" href="${link()}" aria-label="DEBORRA home">
        ${image(link, 'deborra-logo.png', 'DEBORRA', 'width="78" height="52"')}
      </a>
      <button class="menu-toggle" type="button" aria-controls="primary-navigation" aria-expanded="false" hidden><span aria-hidden="true"></span> Menu</button>
      <nav class="primary-nav" id="primary-navigation" aria-label="Primary">
        ${navigation
          .map(([label, target]) => {
            const active =
              activeNavRoute === target ||
              (target === 'journal/' && activeNavRoute.startsWith(target)) ||
              (target === 'shop/' && activeNavRoute === 'shop/hair-care/');
            const current = route === target ? ' aria-current="page"' : '';
            return `<a href="${link(target)}"${current}${active ? ' class="active"' : ''}>${escapeHtml(label)}</a>`;
          })
          .join('')}
      </nav>
      <div class="header-actions">
        <a class="header-track-link" href="${link('track-order/')}">Track order</a>
        <button class="button button--header" type="button" data-open-cart>Bag <span class="bag-badge" data-bag-count>0</span></button>
      </div>
    </div>
  </header>`;
}

function footer(link) {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-main">
        <div class="footer-brand">
          <a class="brand-mark" href="${link()}" aria-label="DEBORRA home">${image(link, 'deborra-logo.png', 'DEBORRA', 'loading="lazy" width="93" height="62"')}</a>
          <p>Botanical hair care and everyday wellness by ${escapeHtml(brand.umbrellaName)}. Thoughtful formulations, transparent labels and reliable care across India.</p>
          <p class="footer-meta">Instagram: <span data-instagram-text>${escapeHtml(brand.instagramHandle)}</span><a data-instagram-link hidden>${escapeHtml(brand.instagramHandle)}</a></p>
        </div>
        ${footerLinks
          .map(
            ([heading, links]) => `<nav class="footer-nav" aria-label="${escapeHtml(heading)}">
          <h2>${escapeHtml(heading)}</h2>
          ${links
            .map(([label, target]) => {
              const href = target === '#launch-list' ? link('#launch-list') : link(target);
              return `<a href="${href}"${dialogAttribute(target)}>${escapeHtml(label)}</a>`;
            })
            .join('')}
          ${heading === 'Brand & Learn' ? `<a href="${escapeHtml(founder.linkedInUrl)}" target="_blank" rel="noopener noreferrer">Founder on LinkedIn</a>` : ''}
        </nav>`
          )
          .join('')}
      </div>
      <div class="footer-bottom">
        <small>© ${new Date().getFullYear()} ${escapeHtml(brand.umbrellaName)} · Founded by ${escapeHtml(founder.name)}</small>
        <div class="footer-bottom__links">
          <a href="${brand.phoneHref}">${escapeHtml(brand.phone)}</a>
          <a href="${link('contact/')}">Customer Support</a>
        </div>
      </div>
    </div>
  </footer>`;
}

function layout(route, { title, description = brandDescription, body, hero = false, noindex = false }) {
  const link = paths(route);
  return `<!doctype html>
<html lang="en-IN" data-site-root="${link()}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b211a">
  <meta name="description" content="${escapeHtml(description)}">
  ${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" href="${link('assets/favicon.png')}">
  ${hero ? `<link rel="preload" as="font" type="font/woff2" href="${link('assets/fonts/cormorant.woff2')}" crossorigin>` : ''}
  <link rel="stylesheet" href="${link('assets/site.css')}">
  <script type="module" src="${link('assets/site.js')}"></script>
</head>
<body>
  ${header(link, route)}
  <main id="main" tabindex="-1">${body(link)}</main>
  ${footer(link)}
  ${siteDialogs(link)}
</body>
</html>
`;
}

function productCard(link, product, headingTag = 'h3') {
  const firstVariant = product.variants[0];
  const isAvailable = product.status === 'in-stock';
  const categoryObj = categories.find((c) => c.slug === product.category);
  const accent = categoryObj?.accent || 'oils';
  return `<article class="product-card" data-product-card data-product-slug="${escapeHtml(product.slug)}" data-product-group="${escapeHtml(product.category)}" data-product-price="${firstVariant.price}" data-category-accent="${escapeHtml(accent)}">
    <a class="product-card__media-link" href="${link(`products/${product.slug}/`)}">
      <div class="product-card__image">
        ${image(link, product.image, product.alt, 'loading="lazy" decoding="async" width="720" height="720"')}
        <span class="product-card__stage product-card__stage--${isAvailable ? 'live' : 'soon'}">${escapeHtml(product.stage)}</span>
      </div>
    </a>
    <div class="product-card__body">
      <p class="kicker kicker--${escapeHtml(accent)}">${escapeHtml(product.group)} · ${escapeHtml(product.format.split(' · ')[0])}</p>
      <${headingTag}><a class="product-card__title-link" href="${link(`products/${product.slug}/`)}">${escapeHtml(product.name)}</a></${headingTag}>
      <p class="product-card__summary">${escapeHtml(product.summary)}</p>
      ${
        isAvailable
          ? `<div class="card-commerce" data-card-commerce>
              ${
                product.variants.length > 1
                  ? `<label class="visually-hidden" for="card-variant-${product.slug}">Select size for ${escapeHtml(product.name)}</label>
                     <select id="card-variant-${product.slug}" class="store-select card-variant-select" data-variant-select>
                       ${product.variants
                         .map(
                           (v) =>
                             `<option value="${escapeHtml(v.id)}" data-price="${v.price}" data-mrp="${v.mrp}" data-stock="${v.stock}">${escapeHtml(v.label)}</option>`
                         )
                         .join('')}
                     </select>`
                  : `<p class="card-single-variant">${escapeHtml(firstVariant.label)}</p>`
              }
              <div class="card-price-row">
                <span class="store-price" data-card-price>${formatInr(firstVariant.price)}</span>
                ${firstVariant.mrp > firstVariant.price ? `<span class="store-mrp" data-card-mrp>${formatInr(firstVariant.mrp)}</span>` : ''}
              </div>
              <div class="card-actions">
                <button type="button" class="button button--primary card-add-btn" data-add-sku="${escapeHtml(firstVariant.id)}">Add to bag</button>
                <a class="card-link" href="${link(`products/${product.slug}/`)}">Details</a>
              </div>
            </div>`
          : `<div class="card-commerce card-commerce--soon">
              <p class="card-single-variant">${escapeHtml(firstVariant.label)} · Est. ${formatInr(firstVariant.price)}</p>
              <div class="card-actions">
                <a class="button button--outline-dark" href="${link(`products/${product.slug}/#waitlist`)}">Notify me</a>
                <a class="card-link" href="${link(`products/${product.slug}/`)}">Details</a>
              </div>
            </div>`
      }
    </div>
  </article>`;
}

function articleCard(link, article) {
  return `<article class="journal-card">
    <a href="${link(`journal/${article.slug}/`)}">
      <div class="journal-card__image">${image(link, article.image, article.alt, 'loading="lazy" decoding="async" width="720" height="540"')}</div>
      <div class="journal-card__body">
        <p class="kicker">${escapeHtml(article.category)}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <span class="card-link">Read article</span>
      </div>
    </a>
  </article>`;
}

const launchDescription =
  'Receive DEBORRA Phase 2 release alerts, hair-care guides and subscriber-only offers. Opt in with consent; unsubscribe anytime.';

function newsletterForm(link, emailId) {
  return `<div class="launch-signup">
      <form class="launch-form" data-launch-form>
        <label for="${emailId}">Email address</label>
        <div class="launch-form__row">
          <input type="email" id="${emailId}" name="email" placeholder="you@example.com" autocomplete="email" maxlength="254" required>
          <button type="submit" class="button button--gold">Subscribe</button>
        </div>
        <label class="check-label"><input type="checkbox" name="consent" required><span>I agree to receive DEBORRA product updates, guides and offers. Unsubscribe anytime. <a href="${link('privacy/')}">Privacy policy</a></span></label>
        <p class="form-note" data-form-note>Use code <strong>DEBORRA10</strong> at checkout for 10% off your first order.</p>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
      <div data-hosted-signup hidden>
        <a class="button button--gold" data-signup-link>Subscribe to updates</a>
        <p class="form-note">Confirm your signup by email. You can unsubscribe at any time.</p>
      </div>
    </div>`;
}

function newsletter(link) {
  return `<section class="launch" id="launch-list" aria-labelledby="launch-title">
    <div class="container launch__inner">
      <div>
        ${eyebrow('DEBORRA Newsletter')}
        <h2 id="launch-title">Thoughtful care, <em>delivered.</em></h2>
        <p>${launchDescription}</p>
      </div>
      ${newsletterForm(link, 'launch-email')}
    </div>
  </section>`;
}

function categoryGrid(link) {
  return `<section class="section category-strip" aria-labelledby="categories-title">
    <div class="container">
      <div class="section-heading section-heading--compact">
        <div>${eyebrow('Browse by category')}<h2 id="categories-title">Focused <em>ranges.</em></h2></div>
        ${textLink('View all products', link('shop/'))}
      </div>
      <div class="category-grid">
        ${categories
          .map((cat) => {
            const count = products.filter((p) => p.category === cat.slug).length;
            return `<a class="category-tile" href="${link(`shop/${cat.slug}/`)}" data-category-accent="${escapeHtml(cat.accent)}">
              <p class="kicker kicker--${escapeHtml(cat.accent)}">${escapeHtml(cat.eyebrow)}</p>
              <h3>${escapeHtml(cat.name)}</h3>
              <p>${escapeHtml(cat.description)}</p>
              <span class="card-link">${count} ${count === 1 ? 'product' : 'products'} →</span>
            </a>`;
          })
          .join('')}
      </div>
    </div>
  </section>`;
}

function home(link) {
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero__visual">
      <picture>
        <source media="(max-width: 650px)" srcset="${link('assets/hero-mobile.webp')}">
        ${image(link, 'hero.webp', 'Rosemary branches and amber glass bottle on dark stone', 'fetchpriority="high" width="1536" height="1024"')}
      </picture>
    </div>
    <div class="container hero__inner">
      <div class="hero__copy">
        ${eyebrow('Botanical hair care & wellness · India')}
        <h1 id="hero-title">Elevate<br><em>everyday care.</em></h1>
        <p>Thoughtfully formulated botanical hair oils, weightless scalp serums and pure amla wellness—crafted for daily Indian routines in UV-protective amber glass.</p>
        <div class="button-row">
          <a class="button button--gold" href="${link('shop/')}">Shop the collection</a>
          ${button('Our story', link('about/'), 'outline')}
        </div>
      </div>
      <p class="hero__caption"><span aria-hidden="true"></span> Rosemary Hair Oil · 100 ml Amber Glass</p>
    </div>
  </section>
  <div class="principles">
    <div class="container principles__inner">
      <p><i class="principle-icon principle-icon--botanical" aria-hidden="true"></i> Mineral-oil &amp; silicone free</p>
      <p><i class="principle-icon principle-icon--formulation" aria-hidden="true"></i> UPI, Cards &amp; COD across India</p>
      <p><i class="principle-icon principle-icon--information" aria-hidden="true"></i> Full ingredient &amp; label clarity</p>
    </div>
  </div>
  <section class="section section--cream" aria-labelledby="collection-title">
    <div class="container">
      <div class="section-heading">
        <div>${eyebrow('Phase 1 · Now available')}<h2 id="collection-title">Care, <em>ready for daily use.</em></h2></div>
        <div class="section-heading__description"><p>Start with our flagship 100 ml Rosemary Hair Oil, Amla Hair Oil and lightweight Hair &amp; Scalp Serum.</p>${textLink('Shop all products', link('shop/'))}</div>
      </div>
      <div class="product-grid">${products.filter((product) => product.featured).map((product) => productCard(link, product)).join('')}</div>
      <p class="image-note">All prices inclusive of GST. Free standard India delivery on orders ${formatInr(brand.freeShippingThreshold)}+.</p>
    </div>
  </section>
  <section class="section section--cream" data-live-catalog="featured" aria-label="Featured products" hidden></section>
  ${categoryGrid(link)}
  <section class="story-panel" aria-labelledby="story-title">
    <figure class="story-panel__image">${image(link, 'ritual.webp', 'An Indian woman with long, dark wavy hair beside a sunlit stone arch', 'loading="lazy" decoding="async" width="820" height="1024"')}<figcaption>DEBORRA · Everyday Indian care</figcaption></figure>
    <div class="story-panel__copy">
      ${eyebrow('Our story & leadership')}
      <h2 id="story-title">Designed with <em>purpose.</em></h2>
      <p>DEBORRA is built to bridge generic mass-market formulas and overpriced luxury—pairing honest botanical ingredients, distinctive amber-glass packaging and credible claims at accessible Indian pricing.</p>
      <div class="story-founder">
        <span class="kicker">Founder · DEBORRA World</span>
        <a href="${link('about/#founder')}">${escapeHtml(founder.name)}</a>
        <p class="story-founder__bio">15+ years leading GTM &amp; enterprise growth across India, SAARC &amp; Asia (Founder of ACCELETECH; VP Sales at SecHard).</p>
        <a class="story-founder__linkedin" href="${escapeHtml(founder.linkedInUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn profile →</a>
      </div>
      <div class="button-row">
        ${button('Read our story', link('about/'), 'outline')}
        ${button('Quality approach', link('quality/'), 'outline')}
      </div>
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="journal-title">
    <div class="container">
      <div class="section-heading section-heading--compact">
        <div>${eyebrow('The journal')}<h2 id="journal-title">Ingredient &amp; routine <em>notes.</em></h2></div>
        ${textLink('Read all 4 guides', link('journal/'))}
      </div>
      <div class="journal-grid">${articles.slice(0, 2).map((article) => articleCard(link, article)).join('')}</div>
    </div>
  </section>
  ${newsletter(link)}`;
}

function pageIntro(link, label, title, copy, extra = '', accent = '') {
  return `<section class="page-intro"${accent ? ` data-category-accent="${escapeHtml(accent)}"` : ''}>
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${link()}">Home</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(label)}</span></nav>
      ${eyebrow(label)}
      <h1>${title}</h1>
      <p class="page-intro__lead">${copy}</p>
      ${extra}
    </div>
  </section>`;
}

function shop(link) {
  const liveCount = products.filter((p) => p.status === 'in-stock').length;
  return `<div data-prelaunch-only>
  ${pageIntro(
    link,
    'Shop',
    'The <em>DEBORRA</em> collection.',
    `Explore ${liveCount} Phase 1 products ready to ship across India, alongside Phase 2 formulations in testing. Inclusive of GST; free delivery above ${formatInr(brand.freeShippingThreshold)}.`
  )}
  <section class="section shop-content" aria-label="Product catalogue">
    <div class="container">
      <div class="category-links-bar" aria-label="Category landing pages">
        <span class="kicker">Category pages:</span>
        ${categories
          .map(
            (cat) =>
              `<a class="category-pill" href="${link(`shop/${cat.slug}/`)}" data-category-accent="${escapeHtml(cat.accent)}">${escapeHtml(cat.name)}</a>`
          )
          .join('')}
      </div>
      <div class="catalog-tools">
        <div class="catalog-filters" role="group" aria-label="Filter products by category">
          <button type="button" class="filter" data-filter="all" aria-pressed="true">All (${products.length})</button>
          ${categories
            .map((cat) => {
              const count = products.filter((p) => p.category === cat.slug).length;
              return `<button type="button" class="filter" data-filter="${escapeHtml(cat.slug)}" aria-pressed="false">${escapeHtml(cat.name)} (${count})</button>`;
            })
            .join('')}
        </div>
        <div class="catalog-sort">
          <label for="catalog-sort-select">Sort</label>
          <select id="catalog-sort-select" class="store-select" data-catalog-sort>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <p class="catalog-count" role="status" aria-live="polite">${products.length} products</p>
        </div>
      </div>
      <div class="product-grid" data-catalog-grid>${products.map((product) => productCard(link, product, 'h2')).join('')}</div>
      <p class="image-note">Phase 1 products dispatch within 1–2 business days. Phase 2 formulations accept launch alerts while undergoing final stability and regulatory verification.</p>
    </div>
  </section>
  </div>
  <div data-live-catalog="all" hidden></div>
  ${newsletter(link)}`;
}

function categoryPage(link, cat) {
  const matching = products.filter((product) => product.category === cat.slug);
  const siblings = categories.filter((c) => c.slug !== cat.slug);
  return `${pageIntro(link, cat.name, cat.title, cat.description, `<p class="about-byline">${escapeHtml(cat.eyebrow)} · <a href="${link('shop/')}">View all categories</a></p>`, cat.accent)}
  <section class="section shop-content" aria-label="${escapeHtml(cat.name)} products">
    <div class="container">
      <div class="breadcrumbs breadcrumbs--light" style="margin-bottom: 1.5rem;">
        <a href="${link()}">Home</a><span aria-hidden="true">/</span>
        <a href="${link('shop/')}">Shop</a><span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(cat.name)}</span>
      </div>
      <div class="product-grid">${matching.map((product) => productCard(link, product, 'h2')).join('')}</div>
      <div class="category-siblings">
        <p class="kicker">Explore other DEBORRA ranges</p>
        <div class="category-links-bar">
          ${siblings
            .map(
              (other) =>
                `<a class="category-pill" href="${link(`shop/${other.slug}/`)}" data-category-accent="${escapeHtml(other.accent)}">${escapeHtml(other.name)}</a>`
            )
            .join('')}
        </div>
      </div>
    </div>
  </section>
  ${newsletter(link)}`;
}

function liveProduct(link) {
  return `<section class="section product-detail">
    <div class="container" data-live-product>
      <h1 class="store-product-heading">DEBORRA products</h1>
      <p>Browse our full collection of botanical hair care and wellness formulations.</p>
      ${textLink('View all products', link('shop/'))}
    </div>
  </section>`;
}

function productPage(link, product) {
  const cat = categories.find((c) => c.slug === product.category);
  const isAvailable = product.status === 'in-stock';
  const first = product.variants[0];
  const savings = first.mrp > first.price ? Math.round(((first.mrp - first.price) / first.mrp) * 100) : 0;
  const related = products.filter((item) => item.slug !== product.slug && item.status === 'in-stock').slice(0, 3);

  return `<section class="section product-detail" data-product-detail data-product-slug="${escapeHtml(product.slug)}">
    <div class="container">
      <nav class="breadcrumbs breadcrumbs--light" aria-label="Breadcrumb">
        <a href="${link()}">Home</a><span aria-hidden="true">/</span>
        <a href="${link('shop/')}">Shop</a><span aria-hidden="true">/</span>
        <a href="${link(`shop/${product.category}/`)}">${escapeHtml(cat?.name || product.group)}</a><span aria-hidden="true">/</span>
        <span aria-current="page">${escapeHtml(product.name)}</span>
      </nav>
      <div class="detail-grid">
        <figure class="detail-image">
          ${image(link, product.image, product.alt, 'fetchpriority="high" width="720" height="720"')}
          <figcaption>${escapeHtml(product.format)} · Actual product formulation &amp; pack specification</figcaption>
        </figure>
        <div class="detail-copy">
          ${eyebrow(cat?.name || product.group)}
          <h1>${escapeHtml(product.name)}</h1>
          <p class="detail-stage detail-stage--${isAvailable ? 'live' : 'soon'}">${escapeHtml(product.stage)}</p>
          <p class="detail-lead">${escapeHtml(product.detail)}</p>
          <div class="claims-callout">
            <p class="kicker">Key everyday benefits</p>
            <p>${escapeHtml(product.claims)}</p>
          </div>
          ${
            isAvailable
              ? `<form class="store-purchase" data-detail-purchase data-product-slug="${escapeHtml(product.slug)}">
                  <div class="detail-price-row">
                    <strong class="store-price store-price--lg" data-detail-price>${formatInr(first.price)}</strong>
                    ${first.mrp > first.price ? `<span class="store-mrp" data-detail-mrp>${formatInr(first.mrp)}</span>` : ''}
                    ${savings ? `<span class="save-badge" data-detail-save>Save ${savings}%</span>` : ''}
                    <span class="tax-note">Incl. of all taxes</span>
                  </div>
                  <label for="detail-variant">Pack / Size</label>
                  <select id="detail-variant" class="store-select" data-detail-variant>
                    ${product.variants
                      .map(
                        (v) =>
                          `<option value="${escapeHtml(v.id)}" data-price="${v.price}" data-mrp="${v.mrp}" data-stock="${v.stock}">${escapeHtml(v.label)} — ${formatInr(v.price)}</option>`
                      )
                      .join('')}
                  </select>
                  <p class="stock-note" data-detail-stock>In stock · ${first.stock} units ready to dispatch</p>
                  <div class="store-purchase__actions">
                    <label for="detail-quantity">Qty</label>
                    <input id="detail-quantity" class="store-select" type="number" min="1" max="${Math.max(1, first.stock)}" step="1" value="1" required data-detail-quantity>
                    <button type="submit" class="button button--primary" data-detail-add>Add to bag</button>
                    <button type="button" class="button button--gold" data-detail-buy-now>Buy now</button>
                  </div>
                  <p class="form-status" role="status" aria-live="polite" data-detail-status></p>
                </form>`
              : `<div class="waitlist-box" id="waitlist">
                  <p class="detail-price-row"><strong class="store-price store-price--lg">Est. ${formatInr(first.price)}</strong> <span class="tax-note">· ${escapeHtml(first.label)}</span></p>
                  <p class="detail-availability">This Phase 2 product is undergoing formulation stability and regulatory review prior to direct sales. Enter your email to get notified on release.</p>
                  <form class="waitlist-form" data-waitlist-form data-waitlist-product="${escapeHtml(product.slug)}">
                    <label class="visually-hidden" for="waitlist-email-${product.slug}">Email for ${escapeHtml(product.name)} alert</label>
                    <input type="email" id="waitlist-email-${product.slug}" name="email" placeholder="you@example.com" required maxlength="254">
                    <button type="submit" class="button button--primary">Notify me on release</button>
                    <p class="form-status" role="status" aria-live="polite"></p>
                  </form>
                </div>`
          }
          <div class="trust-inline">
            <span>Free shipping ₹${brand.freeShippingThreshold}+</span>
            <span>UPI · Cards · COD</span>
            <span>7-day damage replacement</span>
          </div>
          <div class="detail-accordions">
            ${details('Ingredients', `<p>${escapeHtml(product.ingredients)}</p>`, true)}
            ${details('Usage & suitability', `<p>${escapeHtml(product.usage)}</p>`)}
            ${details('Directions', `<p>${escapeHtml(product.directions)}</p>`)}
            ${details('Warnings & storage', `<p>${escapeHtml(product.warnings)}</p>`)}
            ${details(
              'Product FAQs',
              product.productFaqs
                .map(([q, a]) => `<p><strong>${escapeHtml(q)}</strong></p><p>${escapeHtml(a)}</p>`)
                .join('')
            )}
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="related-title">
    <div class="container">
      <div class="section-heading section-heading--compact">
        <div>${eyebrow('Complete your routine')}<h2 id="related-title">Pair <em>with.</em></h2></div>
        ${textLink('View all products', link('shop/'))}
      </div>
      <div class="product-grid">${related.map((item) => productCard(link, item, 'h3')).join('')}</div>
    </div>
  </section>`;
}

function checkoutPage(link) {
  return `${pageIntro(
    link,
    'Secure Checkout',
    'Complete your <em>order.</em>',
    `Pan-India dispatch within 1–2 business days. Free shipping on orders ${formatInr(brand.freeShippingThreshold)}+; codes DEBORRA10, WELCOME15 or FREESHIP accepted.`
  )}
  <section class="section shop-content" aria-label="Checkout">
    <div class="container" data-checkout-root>
      <div class="checkout-empty" data-checkout-empty hidden>
        <h2>Your bag is currently empty.</h2>
        <p>Add hair-care or wellness products from the DEBORRA shop before proceeding to checkout.</p>
        ${button('Browse the shop', link('shop/'), 'primary')}
      </div>
      <div class="checkout-layout" data-checkout-active>
        <form id="checkout-form" class="checkout-form" novalidate>
          <section class="checkout-panel" aria-labelledby="contact-heading">
            <h2 id="contact-heading">1. Contact information</h2>
            <div class="form-grid">
              <div class="field-group field-group--full">
                <label for="co-name">Full name</label>
                <input id="co-name" name="name" type="text" autocomplete="name" required maxlength="120" placeholder="Aarav Sharma">
              </div>
              <div class="field-group">
                <label for="co-email">Email address</label>
                <input id="co-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com">
              </div>
              <div class="field-group">
                <label for="co-phone">Mobile number (10 digits, India)</label>
                <input id="co-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="14" placeholder="98XXXXXXXX">
              </div>
            </div>
          </section>

          <section class="checkout-panel" aria-labelledby="address-heading">
            <h2 id="address-heading">2. Delivery address (India)</h2>
            <div class="form-grid">
              <div class="field-group field-group--full">
                <label for="co-address1">House / Flat No., Building &amp; Street</label>
                <input id="co-address1" name="addressLine1" type="text" autocomplete="address-line1" required maxlength="180" placeholder="402 Green Residency, Linking Road">
              </div>
              <div class="field-group field-group--full">
                <label for="co-address2">Area / Landmark (optional)</label>
                <input id="co-address2" name="addressLine2" type="text" autocomplete="address-line2" maxlength="160" placeholder="Bandra West">
              </div>
              <div class="field-group">
                <label for="co-city">City / District</label>
                <input id="co-city" name="city" type="text" autocomplete="address-level2" required maxlength="80" placeholder="Mumbai">
              </div>
              <div class="field-group">
                <label for="co-state">State / Union Territory</label>
                <select id="co-state" name="state" class="store-select" required>
                  <option value="">Select state…</option>
                  ${indianStates.map((st) => `<option value="${escapeHtml(st)}">${escapeHtml(st)}</option>`).join('')}
                </select>
              </div>
              <div class="field-group">
                <label for="co-pincode">PIN code (6 digits)</label>
                <input id="co-pincode" name="pincode" type="text" inputmode="numeric" autocomplete="postal-code" required pattern="[1-9][0-9]{5}" maxlength="6" placeholder="400050">
              </div>
              <div class="field-group">
                <p class="pin-estimate" data-pin-estimate>Enter a 6-digit Indian PIN code for delivery timing.</p>
              </div>
            </div>
          </section>

          <fieldset class="checkout-panel">
            <legend>3. Payment method</legend>
            <div class="payment-options">
              <label class="payment-radio">
                <input type="radio" name="paymentMethod" value="razorpay" checked>
                <span>
                  <strong>Online Payment via Razorpay</strong>
                  <small>UPI (GPay, PhonePe, Paytm), Credit &amp; Debit Cards, Net Banking &amp; Wallets</small>
                  <small class="payment-mode-note" data-razorpay-mode-note></small>
                </span>
              </label>
              <label class="payment-radio">
                <input type="radio" name="paymentMethod" value="cod">
                <span>
                  <strong>Cash on Delivery (COD)</strong>
                  <small>Pay by cash or UPI QR on doorstep delivery across serviceable Indian PIN codes (Free COD)</small>
                </span>
              </label>
            </div>
          </fieldset>

          <p class="form-status checkout-error" role="alert" data-checkout-error></p>
        </form>

        <aside class="checkout-summary" aria-labelledby="checkout-summary-heading">
          <h2 id="checkout-summary-heading">Order summary</h2>
          <ul class="checkout-items" data-checkout-items></ul>
          <div class="discount-box" data-checkout-discount>
            <label for="co-discount">Discount code</label>
            <div class="discount-box__row">
              <input id="co-discount" type="text" maxlength="32" placeholder="DEBORRA10" data-discount-input>
              <button type="button" class="button button--gold" data-apply-discount>Apply</button>
            </div>
            <p class="discount-hint">Available: ${discountCodes.map((d) => escapeHtml(d.code)).join(' · ')}</p>
            <p class="form-status" role="status" data-discount-status></p>
          </div>
          <dl class="summary-totals" data-checkout-totals></dl>
          <button type="submit" form="checkout-form" class="button button--gold checkout-submit" data-checkout-submit>Complete order</button>
          <p class="checkout-legal">By placing this order you agree to DEBORRA’s <a href="${link('terms/')}">Terms</a>, <a href="${link('privacy/')}">Privacy Policy</a> and <a href="${link('shipping-returns/')}">Shipping &amp; Returns</a>.</p>
        </aside>
      </div>
    </div>
  </section>`;
}

function orderConfirmationPage(link) {
  return `${pageIntro(
    link,
    'Order Confirmation',
    'Thank you for your <em>order.</em>',
    'Your DEBORRA order record is confirmed below. Save your Order ID to track dispatch and delivery updates.'
  )}
  <section class="section shop-content" aria-label="Order receipt">
    <div class="container" data-confirmation-root>
      <p class="store-status" role="status">Loading your order confirmation…</p>
    </div>
  </section>`;
}

function trackOrderPage(link) {
  return `${pageIntro(
    link,
    'Track Order',
    'Track your <em>DEBORRA</em> order.',
    'Enter the Order ID from your confirmation screen along with your phone number or email address.'
  )}
  <section class="section shop-content" aria-label="Order tracking">
    <div class="container tracking-layout">
      <form class="checkout-panel tracking-form" data-track-form>
        <h2>Order lookup</h2>
        <div class="field-group">
          <label for="track-id">Order ID</label>
          <input id="track-id" name="orderId" type="text" required maxlength="40" placeholder="DEB-2026-XXXXXX">
        </div>
        <div class="field-group">
          <label for="track-contact">Phone number or Email used at checkout</label>
          <input id="track-contact" name="contact" type="text" required maxlength="254" placeholder="98XXXXXXXX or you@example.com">
        </div>
        <div class="button-row">
          <button type="submit" class="button button--primary">Check order status</button>
          <button type="button" class="button button--outline-dark" data-track-demo>Load sample order</button>
        </div>
        <p class="form-status" role="status" aria-live="polite" data-track-status></p>
      </form>
      <div class="checkout-panel tracking-result" data-track-result>
        <h2>Tracking status</h2>
        <p>Submit your Order ID to view packing, dispatch and delivery updates, or call <a class="text-link" href="${brand.phoneHref}">${escapeHtml(brand.phone)}</a> for assistance.</p>
      </div>
    </div>
  </section>`;
}

function proseSections({ sections, policies = [] }, headingTag = 'h2') {
  return `<div data-prose-sections>
      <div class="prose-sections" ${policies.length ? 'data-policy-fallback' : ''}>
        ${sections.map(([heading, paragraph]) => `<section><${headingTag}>${heading}</${headingTag}>${paragraph}</section>`).join('')}
      </div>
      ${policies.length ? `<div class="prose-sections" data-store-policies="${policies.join(' ')}" hidden></div>` : ''}
    </div>`;
}

function prosePage(link, page) {
  return `${pageIntro(link, page.label, page.title || page.label, page.intro)}
  <section class="section">
    <div class="container prose">
      ${proseSections(page)}
      ${page.action ? textLink(page.action[0], link(page.action[1]), page.action[1]) : ''}
    </div>
  </section>`;
}

function about(link) {
  return `${pageIntro(
    link,
    'Our story',
    'The making of <em>DEBORRA.</em>',
    'An Indian consumer brand building trusted botanical hair care, wellness and everyday essentials under the DEBORRA World umbrella.',
    `<p class="about-byline">Founded by <a href="#founder">${escapeHtml(founder.name)}</a> · <a href="${escapeHtml(founder.linkedInUrl)}" target="_blank" rel="noopener noreferrer">LinkedIn profile</a></p>`
  )}
  <section class="section">
    <div class="container detail-grid about-grid">
      <figure class="detail-image">${image(link, 'ritual.webp', 'A woman with dark, naturally wavy hair in warm window light', 'width="820" height="1024"')}<figcaption>DEBORRA · Modern Indian botanical care</figcaption></figure>
      <div class="prose">
        <section class="founder" id="founder" aria-labelledby="founder-name">
          <p class="kicker">${escapeHtml(founder.role)}</p>
          <h2 id="founder-name">${escapeHtml(founder.name)}</h2>
          <p class="founder__summary">${escapeHtml(founder.summary)}</p>
          <ul class="founder__list">
            ${founder.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
          <div class="founder__actions">
            <a class="button button--primary" href="${escapeHtml(founder.linkedInUrl)}" target="_blank" rel="noopener noreferrer">Connect with ${escapeHtml(founder.linkedInName)} on LinkedIn</a>
            <a class="text-link" href="${brand.phoneHref}">${escapeHtml(brand.phone)}</a>
          </div>
        </section>
        <section>
          <h2>Why DEBORRA was created</h2>
          <p>Consumers often face a false choice between generic mass-market products and inflated luxury pricing with inconsistent quality. DEBORRA combines thoughtful formulation, useful everyday benefits, amber-glass packaging and honest communication at accessible Indian positioning.</p>
        </section>
        <section>
          <h2>What the name means</h2>
          <p>DEBORRA is our stylised spelling of “Deborah”, traditionally associated with the Hebrew word for “bee”. Rather than literal bee imagery, that origin inspires our culture of diligence, vitality and purposeful craft across hair care and wellness.</p>
        </section>
        <section>
          <h2>Phased roadmap &amp; 10-year vision</h2>
          <p>We launch with focus—starting with Rosemary Hair Oil, Amla Hair Oil, Botanical Oil Blends, Hair &amp; Scalp Serum and Amla Powder—before expanding into hair creams, compliant wellness gummies and adjacent personal-care categories under DEBORRA World.</p>
          <p>Built digital-first for direct-to-consumer trust across India, with selective retail, salon and omnichannel partnerships planned as customer repeat demand and operations scale.</p>
        </section>
        ${textLink('Explore our quality approach', link('quality/'))}
      </div>
    </div>
  </section>`;
}

function quality(link) {
  return prosePage(link, {
    label: 'Our approach',
    title: 'Care, built on <em>clarity.</em>',
    intro: 'Every DEBORRA product starts with how it performs in a real Indian household routine—never exaggerated claims.',
    sections: [
      [
        'Responsible, evidence-led claims',
        '<p>Hair care and wellness labels should state realistic benefits clearly—such as scalp hydration, smoother combing, softer ends or nutritional support—rather than promising unrealistic overnight transformations.</p>'
      ],
      [
        'Full label & ingredient disclosure',
        '<p>Each product page mirrors carton information: full botanical and base ingredients, intended usage, step-by-step directions, patch-test or age cautions and product-specific FAQs.</p>'
      ],
      [
        'Purposeful packaging choices',
        '<p>Our oils and scalp serums use UV-protective amber glass with protective cartons, while Amla Powder includes sealed 5 g single-serve stick packs alongside amber glass jars for freshness in Indian humidity.</p>'
      ],
      [
        'Disciplined Phase 2 wellness standards',
        '<p>Oral wellness gummies—including amla, chawanprash-inspired and exploratory shilajit concepts—only advance to direct sale after expert formulation, stability testing, age labelling and regulatory verification.</p>'
      ]
    ],
    action: ['Shop the collection', 'shop/']
  });
}

function journal(link) {
  return `${pageIntro(
    link,
    'Journal',
    'The <em>DEBORRA</em> journal.',
    'Practical reading on hair oiling, scalp serums, ingredient labels and building consistent daily routines.'
  )}
  <section class="section"><div class="container journal-grid">${articles.map((article) => articleCard(link, article)).join('')}</div></section>`;
}

function journalArticle(link, article) {
  return `<article>
    <header class="page-intro">
      <div class="container">
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${link()}">Home</a><span aria-hidden="true">/</span><a href="${link('journal/')}">Journal</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(article.title)}</span></nav>
        ${eyebrow(article.category)}
        <h1>${escapeHtml(article.title)}</h1>
        <p class="page-intro__lead">${escapeHtml(article.summary)}</p>
      </div>
    </header>
    <div class="section">
      <div class="container prose">
        <figure class="article-image">${image(link, article.image, article.alt, 'width="720" height="480"')}<figcaption>DEBORRA Journal · Botanical Education</figcaption></figure>
        ${article.sections.map(([heading, paragraph]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(paragraph)}</p></section>`).join('')}
        <div class="button-row">
          ${button('Shop Phase 1 collection', link('shop/'), 'primary')}
          ${textLink('Back to the journal', link('journal/'))}
        </div>
      </div>
    </div>
  </article>`;
}

function faqContent(link) {
  return `<div>
        ${faqs.map(([question, answer]) => details(question, `<p>${escapeHtml(answer)}</p>`)).join('')}
      </div>
      <p class="faq-contact">Need help with an order? ${textLink('Track your order', link('track-order/'))} or ${textLink('contact DEBORRA support', link('contact/'))}.</p>`;
}

function faq(link) {
  return `${pageIntro(
    link,
    'FAQs',
    'Frequently asked <em>questions.</em>',
    'Answers on ordering, Razorpay UPI & COD payments, India shipping, returns and DEBORRA product usage.'
  )}
  <section class="section">
    <div class="container prose">${faqContent(link)}</div>
  </section>`;
}

function contactPage(link) {
  return `${pageIntro(
    link,
    'Contact & Support',
    'Get in <em>touch.</em>',
    'Questions about ingredients, your DEBORRA order, returns or retail partnerships? Our India customer support team is ready to help.'
  )}
  <section class="section shop-content" aria-label="Contact DEBORRA">
    <div class="container tracking-layout">
      <div class="checkout-panel">
        <h2>Direct channels</h2>
        <p class="contact-phone"><a href="${brand.phoneHref}">${escapeHtml(brand.phone)}</a></p>
        <p>Customer care line open Monday to Saturday, 10:00 AM – 6:30 PM IST.</p>
        <p><a data-support-email hidden></a></p>
        <hr class="panel-rule">
        <p class="kicker">Leadership &amp; Brand</p>
        <p><strong>${escapeHtml(founder.name)}</strong> — ${escapeHtml(founder.role)}</p>
        <p><a class="text-link" href="${escapeHtml(founder.linkedInUrl)}" target="_blank" rel="noopener noreferrer">Founder LinkedIn Profile</a></p>
        <p>Instagram: <span data-instagram-text>${escapeHtml(brand.instagramHandle)}</span> <a class="text-link" data-instagram-link hidden>Follow @deborra.in</a></p>
        <hr class="panel-rule">
        <div class="button-row">
          ${button('Track an order', link('track-order/'), 'primary')}
          ${textLink('Shipping & returns policy', link('shipping-returns/'))}
        </div>
      </div>

      <form class="checkout-panel contact-form" data-contact-form>
        <h2>Send a support message</h2>
        <div class="form-grid">
          <div class="field-group">
            <label for="ct-name">Your name</label>
            <input id="ct-name" name="name" type="text" required maxlength="120" placeholder="Your full name">
          </div>
          <div class="field-group">
            <label for="ct-email">Email address</label>
            <input id="ct-email" name="email" type="email" required maxlength="254" placeholder="you@example.com">
          </div>
          <div class="field-group">
            <label for="ct-phone">Phone number (optional)</label>
            <input id="ct-phone" name="phone" type="tel" maxlength="20" placeholder="+91 98XXXXXXXX">
          </div>
          <div class="field-group">
            <label for="ct-topic">Topic</label>
            <select id="ct-topic" name="topic" class="store-select">
              <option value="Order & Shipping">Order &amp; Shipping</option>
              <option value="Product & Ingredients">Product &amp; Ingredients</option>
              <option value="Returns & Refunds">Returns &amp; Refunds</option>
              <option value="Retail & Salon Partnerships">Retail &amp; Salon Partnerships</option>
              <option value="General Enquiry">General Enquiry</option>
            </select>
          </div>
          <div class="field-group field-group--full">
            <label for="ct-order">Order ID (if applicable)</label>
            <input id="ct-order" name="orderId" type="text" maxlength="40" placeholder="DEB-2026-XXXXXX">
          </div>
          <div class="field-group field-group--full">
            <label for="ct-message">Message</label>
            <textarea id="ct-message" name="message" rows="4" required maxlength="2000" placeholder="How can our support team help?"></textarea>
          </div>
        </div>
        <button type="submit" class="button button--primary" style="margin-top: 1rem;">Send enquiry</button>
        <p class="form-status" role="status" aria-live="polite" data-contact-status></p>
      </form>
    </div>
  </section>`;
}

const support = [
  [
    'shipping-returns/',
    {
      label: 'Shipping & returns',
      policies: ['shippingPolicy', 'refundPolicy'],
      title: 'Shipping, delivery <em>&amp; returns.</em>',
      intro: `Clear pan-India dispatch timelines, delivery fees and straightforward 7-day replacement coverage for every DEBORRA order.`,
      sections: [
        [
          'Dispatch & delivery timelines across India',
          '<p>Orders confirmed before 2:00 PM IST typically dispatch within 1–2 business days (Monday to Saturday, excluding public holidays). Estimated delivery takes 2–4 business days across major metro cities and 4–7 business days for rest of India.</p>'
        ],
        [
          'Shipping charges & free delivery threshold',
          `<p>Standard shipping is free on all orders of ${formatInr(brand.freeShippingThreshold)} and above. For orders below ${formatInr(brand.freeShippingThreshold)}, a flat ${formatInr(brand.standardShippingFee)} shipping charge applies. Cash on Delivery is available across serviceable Indian PIN codes at zero additional COD fee.</p>`
        ],
        [
          'Order tracking & status updates',
          '<p>Every confirmed order receives a unique DEBORRA Order ID. Track packing, dispatch and delivery milestones anytime on the Track Order page or by calling customer care on +91 77150 38107.</p>'
        ],
        [
          'Returns, damaged items & refunds',
          '<p>If your parcel arrives damaged, leaking, tampered with or containing an incorrect item, contact DEBORRA support within 7 days of delivery with your Order ID and clear photos/unboxing video. For hygiene and product safety, opened bottles or unsealed wellness packs cannot be returned unless defective.</p><p>Approved replacements ship promptly at no cost, and eligible refunds credit within 5–7 business days to your original payment method (or UPI/bank account for COD orders).</p>'
        ]
      ],
      action: ['Track an order', 'track-order/']
    }
  ],
  [
    'privacy/',
    {
      label: 'Privacy policy',
      policies: ['privacyPolicy'],
      title: 'Privacy <em>policy.</em>',
      intro: 'How DEBORRA World collects, uses and protects customer information across browsing, checkout and email updates.',
      sections: [
        [
          'Information collected for orders & support',
          '<p>When you place an order or submit a support request, we collect your name, email address, phone number, shipping address and order details solely to process payments, fulfil delivery, provide tracking updates and resolve support enquiries.</p>'
        ],
        [
          'Payment security & Razorpay processing',
          '<p>Online payments (UPI, cards, net banking and wallets) are processed via encrypted Razorpay checkout flows. DEBORRA never stores raw credit/debit card numbers, CVV codes or UPI PINs on its servers.</p>'
        ],
        [
          'Consent-based newsletter & Phase 2 waitlist',
          '<p>You will only receive promotional or launch emails when you explicitly opt in with consent. Every marketing email and preference record provides clear unsubscribe functionality.</p>'
        ],
        [
          'Browser storage & privacy-friendly analytics',
          '<p>Your shopping bag and checkout progress are stored safely in browser storage so items remain available while you shop. Optional aggregate analytics collect no invasive cross-site advertising profiles.</p>'
        ],
        [
          'Grievance & privacy contact',
          `<p>To update, export or delete your personal contact records, contact DEBORRA World customer support at <a href="${brand.phoneHref}">${escapeHtml(brand.phone)}</a> or via the <a href="../contact/">Contact page</a>.</p>`
        ]
      ]
    }
  ],
  [
    'terms/',
    {
      label: 'Terms & conditions',
      policies: ['termsOfService'],
      title: 'Terms &amp; <em>conditions.</em>',
      intro: 'Terms governing purchases, pricing, product usage disclosures and services on the DEBORRA website in India.',
      sections: [
        [
          'Pricing, GST & order acceptance',
          '<p>All product prices on DEBORRA are listed in Indian Rupees (INR / ₹) and are inclusive of applicable GST unless stated otherwise. Discount codes apply prior to final payment confirmation and cannot be combined unless specified.</p><p>DEBORRA reserves the right to cancel or refund orders affected by unserviceable PIN codes, inventory discrepancies or suspected payment fraud.</p>'
        ],
        [
          'Order cancellations & modifications',
          '<p>Orders may be cancelled or address details updated before dispatch by contacting +91 77150 38107 with your Order ID. Once handed to our courier partner, cancellations follow our 7-day return/replacement rules.</p>'
        ],
        [
          'Product usage & responsible wellness disclosures',
          '<p>DEBORRA topical hair oils and scalp serums are cosmetic care products intended for external use; perform a 24-hour patch test prior to full application. Food/wellness products such as Amla Powder are not intended to diagnose, treat, cure or prevent any disease. Consult a qualified physician if pregnant, nursing or managing health conditions.</p>'
        ],
        [
          'Intellectual property & governing law',
          '<p>The DEBORRA name, DEBORRA World umbrella mark, visual assets, copy and product designs belong to DEBORRA World. These terms are governed by the laws of India.</p>'
        ]
      ]
    }
  ]
];

function siteDialog(id, label, title, body, theme = '') {
  return `<dialog id="${id}" class="site-dialog${theme ? ' site-dialog--' + theme : ''}" aria-labelledby="${id}-title">
    <div class="site-dialog__panel">
      <header class="site-dialog__header">
        <div>${eyebrow(label)}<h2 id="${id}-title" tabindex="-1" data-dialog-heading>${title}</h2></div>
        <button class="site-dialog__close" type="button" data-dialog-close>Close</button>
      </header>
      <div class="site-dialog__body">${body}</div>
    </div>
  </dialog>`;
}

function siteDialogs(link) {
  const shipping = support[0][1];
  const launch = siteDialog(
    'launch-dialog',
    'DEBORRA Newsletter',
    'Thoughtful care, <em>delivered.</em>',
    `<p class="site-dialog__intro">${launchDescription}</p>${newsletterForm(link, 'launch-dialog-email')}`,
    'launch'
  );
  const questions = siteDialog('faq-dialog', 'Customer support', 'Frequently asked <em>questions.</em>', faqContent(link));
  const shippingDialog = siteDialog(
    'shipping-dialog',
    'Customer support',
    shipping.title,
    `<p class="site-dialog__intro" data-policy-intro>${shipping.intro}</p>${proseSections(shipping, 'h3')}
    <p class="faq-contact">${textLink('Contact DEBORRA', link('contact/'))}</p>`
  );
  return [launch, questions, shippingDialog].join('\n');
}

const pages = [
  ['', { title: 'DEBORRA | Elevate everyday care — Botanical Hair Care & Wellness', body: home, hero: true }],
  ['shop/', { title: 'Shop All Products | DEBORRA', body: shop }],
  ...categories.map((cat) => [
    `shop/${cat.slug}/`,
    { title: `${cat.name} | Shop DEBORRA`, description: cat.description, body: (link) => categoryPage(link, cat) }
  ]),
  ['shop/product/', { title: 'Product | DEBORRA', body: liveProduct, noindex: true }],
  ['checkout/', { title: 'Checkout | DEBORRA', body: checkoutPage, noindex: true }],
  ['order-confirmation/', { title: 'Order Confirmation | DEBORRA', body: orderConfirmationPage, noindex: true }],
  ['track-order/', { title: 'Track Order | DEBORRA', body: trackOrderPage }],
  ['about/', { title: 'Our Story & Founder | DEBORRA', body: about }],
  ['quality/', { title: 'Our Approach & Quality | DEBORRA', body: quality }],
  ['journal/', { title: 'Journal | DEBORRA', body: journal }],
  ['faq/', { title: 'FAQs | DEBORRA', body: faq }],
  ['contact/', { title: 'Contact & Support | DEBORRA', body: contactPage }],
  ...products.map((product) => [
    `products/${product.slug}/`,
    {
      title: `${product.name} | DEBORRA`,
      description: product.summary,
      body: (link) => productPage(link, product)
    }
  ]),
  ...articles.map((article) => [
    `journal/${article.slug}/`,
    {
      title: `${article.title} | DEBORRA Journal`,
      description: article.summary,
      body: (link) => journalArticle(link, article)
    }
  ]),
  ...support.map(([route, page]) => [
    route,
    {
      title: `${page.label} | DEBORRA`,
      description: page.intro,
      body: (link) => prosePage(link, page)
    }
  ])
];

await Promise.all(
  pages.map(async ([route, page]) => {
    const destination = join(output, route, 'index.html');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, layout(route, page).replace(/[ \t]+$/gm, ''), 'utf8');
  })
);

const catalogModule = `// Generated automatically by scripts/build.mjs from scripts/content.mjs.
export const storeMeta = ${JSON.stringify(
  {
    brand,
    discountCodes,
    categories: categories.map(({ slug, name, launched, accent }) => ({ slug, name, launched, accent })),
    products: products.map(({ slug, name, category, group, format, status, stage, image: img, alt, variants }) => ({
      slug,
      name,
      category,
      group,
      format,
      status,
      stage,
      image: img,
      alt,
      variants
    }))
  },
  null,
  2
)};
`;

await writeFile(join(output, 'assets/catalog-data.js'), catalogModule, 'utf8');

console.log(`Built ${pages.length} pages and docs/assets/catalog-data.js.`);
