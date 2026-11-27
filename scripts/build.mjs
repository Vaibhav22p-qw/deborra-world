import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles, faqs, products } from './content.mjs';

const output = fileURLToPath(new URL('../docs/', import.meta.url));
const phone = '+91 77150 38107';
const phoneHref = 'tel:+917715038107';
const founderName = 'Brijesh Mishra';
const founderProfile = 'https://www.linkedin.com/in/brijesh-mishrra-91584456/';
const brandDescription = 'DEBORRA is developing botanical hair care and thoughtful wellness concepts for everyday routines. Explore the collection in development.';
const hosted = process.argv.includes('--hosted');

const navigation = [
  ['Home', ''],
  ['Collection', 'shop/'],
  ['Our Story', 'about/'],
  ['Journal', 'journal/']
];

const footerLinks = [
  ['Explore', [['Collection', 'shop/'], ['Our Story', 'about/'], ['Our Approach', 'quality/'], ['Journal', 'journal/']]],
  ['Support', [['FAQs', 'faq/'], ['Contact', 'contact/'], ['Shipping & Returns', 'shipping-returns/']]],
  ['Information', [['Privacy', 'privacy/'], ['Terms', 'terms/']]]
];

const dialogsByDestination = {
  '#launch-list': 'launch-dialog',
  'faq/': 'faq-dialog',
  'contact/': 'contact-dialog',
  'shipping-returns/': 'shipping-dialog'
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

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

function details(title, body) {
  return `<details class="accordion"><summary>${escapeHtml(title)}</summary><div class="accordion__body">${body}</div></details>`;
}

function header(link, route) {
  const activeRoute = route.startsWith('products/') || route.startsWith('shop/') ? 'shop/' : route;
  return `<a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement"><span class="diamond" aria-hidden="true"></span><span data-store-copy="Botanical hair care &amp; wellness">Pre-launch <span aria-hidden="true">·</span> First collection in development</span><span class="diamond" aria-hidden="true"></span></div>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand-mark" href="${link()}" aria-label="DEBORRA home">
        ${image(link, 'deborra-logo.png', 'DEBORRA', 'width="78" height="52"')}
      </a>
      <button class="menu-toggle" type="button" aria-controls="primary-navigation" aria-expanded="false" hidden><span aria-hidden="true"></span> Menu</button>
      <nav class="primary-nav" id="primary-navigation" aria-label="Primary">
        ${navigation.map(([label, target]) => {
          const active = activeRoute === target || (target === 'journal/' && activeRoute.startsWith(target));
          const current = route === target ? ' aria-current="page"' : '';
          return `<a href="${link(target)}"${current}${active ? ' class="active"' : ''}${target === 'shop/' ? ' data-store-copy="Shop"' : ''}>${label}</a>`;
        }).join('')}
      </nav>
      <div class="header-actions">
        <a class="button button--header" href="${route && route !== 'shop/' ? link('#launch-list') : '#launch-list'}" data-launch-cta data-signup-label="Join the launch list"${dialogAttribute('#launch-list')}>Order enquiries</a>
        <button class="button button--header" type="button" data-open-cart hidden>Bag</button>
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
          <p>Botanical hair care and wellness, thoughtfully developed for everyday routines.</p>
        </div>
        ${footerLinks.map(([heading, links]) => `<nav class="footer-nav" aria-label="${heading}">
          <h2>${heading}</h2>
          ${links.map(([label, target]) => `<a href="${link(target)}"${target === 'shop/' ? ' data-store-copy="Shop"' : ''}${dialogAttribute(target)}>${escapeHtml(label)}</a>`).join('')}
          ${heading === 'Explore' ? `<a href="${link('#launch-list')}"${dialogAttribute('#launch-list')} data-signup-label="Newsletter">Launch updates</a><a data-instagram-link hidden>Instagram</a>` : ''}
          ${heading === 'Support' ? '<a data-account-link hidden>Track an order</a>' : ''}
        </nav>`).join('')}
      </div>
      <div class="footer-bottom"><small>© DEBORRA World</small><a href="${phoneHref}">${phone}</a></div>
    </div>
  </footer>`;
}

function layout(route, { title, description = brandDescription, body, hero = false, noindex = false }) {
  const link = paths(route);
  return `<!doctype html>
<html lang="en-IN" data-site-root="${link()}"${hosted ? ' data-server-mode="true"' : ''}>
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

function productCard(link, product) {
  return `<article class="product-card" data-product-group="${escapeHtml(product.group)}">
    <a class="product-card__link" href="${link(`products/${product.slug}/`)}">
      <div class="product-card__image">
        ${image(link, product.image, product.alt, 'loading="lazy" decoding="async" width="720" height="720"')}
        <span class="product-card__stage">${product.stage}</span>
      </div>
      <div class="product-card__body">
        <p class="kicker">${product.format}</p>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <span class="card-link">Explore concept</span>
      </div>
    </a>
  </article>`;
}

function articleCard(link, article) {
  return `<article class="journal-card">
    <a href="${link(`journal/${article.slug}/`)}">
      <div class="journal-card__image">${image(link, article.image, article.alt, 'loading="lazy" decoding="async" width="720" height="540"')}</div>
      <div class="journal-card__body">
        <p class="kicker">${article.category}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <span class="card-link">Read article</span>
      </div>
    </a>
  </article>`;
}

const launchDescription = 'Product announcements, ingredient stories and occasional offers from DEBORRA.';

function launchIntro(className) {
  return `<p${className ? ` class="${className}"` : ''} data-signup-copy="${escapeHtml(launchDescription)}">Speak with DEBORRA about product availability and the first collection.</p>`;
}

function newsletterForm(link, emailId) {
  return `<div class="launch-signup">
      <form class="launch-form" data-launch-form hidden>
        <label for="${emailId}">Email address</label>
        <div class="launch-form__row">
          <input type="email" id="${emailId}" name="email" placeholder="you@example.com" autocomplete="email" maxlength="254" required disabled>
          <button type="submit" class="button button--gold" disabled>Join the list</button>
        </div>
        <label class="check-label"><input type="checkbox" name="consent" required disabled><span>I agree to receive DEBORRA emails. I can unsubscribe at any time. <a href="${link('privacy/')}">Privacy notice</a></span></label>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
      <div data-hosted-signup hidden>
        <a class="button button--gold" data-signup-link>Join the list</a>
        <p class="form-note">Confirm your signup by email. You can unsubscribe at any time.</p>
      </div>
      <div data-launch-contact>
        ${button(`Call DEBORRA · ${phone}`, phoneHref, 'gold')}
      </div>
    </div>`;
}

function newsletter(link) {
  return `<section class="launch" id="launch-list" aria-labelledby="launch-title">
    <div class="container launch__inner">
      <div>
        ${eyebrow('Launch updates')}
        <h2 id="launch-title">From the <em>beginning.</em></h2>
        ${launchIntro()}
      </div>
      ${newsletterForm(link, 'launch-email')}
    </div>
  </section>`;
}

function home(link) {
  return `<section class="hero" aria-labelledby="hero-title">
    <div class="hero__visual">
      <picture>
        <source media="(max-width: 650px)" srcset="${link('assets/hero-mobile.webp')}">
        ${image(link, 'hero.webp', 'Rosemary branches and amber glass on stone', 'fetchpriority="high" width="1536" height="1024"')}
      </picture>
    </div>
    <div class="container hero__inner">
      <div class="hero__copy">
        ${eyebrow('Botanical hair care & wellness')}
        <h1 id="hero-title">Elevate<br><em>everyday care.</em></h1>
        <p>Thoughtfully developed hair care, rooted in botanicals. A focused first collection for the routines you return to every day.</p>
        <div class="button-row">
          <a class="button button--gold" href="${link('shop/')}" data-store-copy="Shop the collection">Explore the collection</a>
          ${button('Our story', link('about/'), 'outline')}
        </div>
      </div>
      <p class="hero__caption"><span aria-hidden="true"></span> Illustrative botanical study</p>
    </div>
  </section>
  <div class="principles">
    <div class="container principles__inner">
      <p><i class="principle-icon principle-icon--botanical" aria-hidden="true"></i> Botanical inspiration</p>
      <p><i class="principle-icon principle-icon--formulation" aria-hidden="true"></i> Thoughtful formulation</p>
      <p><i class="principle-icon principle-icon--information" aria-hidden="true"></i> Clear product information</p>
    </div>
  </div>
  <section class="section section--cream" aria-labelledby="collection-title" data-prelaunch-only>
    <div class="container">
      <div class="section-heading">
        <div>${eyebrow('The collection')}<h2 id="collection-title">Care, <em>in the making.</em></h2></div>
        <div class="section-heading__description"><p>From rosemary oil to scalp care, explore the ideas shaping DEBORRA’s first hair-care range.</p>${textLink('View all concepts', link('shop/'))}</div>
      </div>
      <div class="product-grid">${products.filter((product) => product.featured).map((product) => productCard(link, product)).join('')}</div>
      <p class="image-note">Illustrative imagery. The collection is in development.</p>
    </div>
  </section>
  <section class="section section--cream" data-live-catalog="featured" aria-label="Featured products" hidden></section>
  <section class="story-panel" aria-labelledby="story-title">
    <figure class="story-panel__image">${image(link, 'ritual.webp', 'A woman with long, dark hair beside a sunlit stone arch', 'loading="lazy" decoding="async" width="820" height="1024"')}<figcaption>Illustrative lifestyle imagery</figcaption></figure>
    <div class="story-panel__copy">
      ${eyebrow('Our approach')}
      <h2 id="story-title">Designed with <em>purpose.</em></h2>
      <p>We’re building DEBORRA around useful products, considered packaging and information you can understand at a glance. We’re starting with hair care and exploring wellness as the range grows.</p>
      <div class="story-founder"><span class="kicker">Founder</span><a href="${link('about/#founder')}">${founderName}</a></div>
      ${button('Discover our approach', link('quality/'), 'outline')}
    </div>
  </section>
  <section class="section section--cream" aria-labelledby="journal-title">
    <div class="container">
      <div class="section-heading section-heading--compact">
        <div>${eyebrow('The journal')}<h2 id="journal-title">A closer look.</h2></div>
        ${textLink('Explore the journal', link('journal/'))}
      </div>
      <div class="journal-grid">${articles.map((article) => articleCard(link, article)).join('')}</div>
    </div>
  </section>
  ${newsletter(link)}`;
}

function pageIntro(link, label, title, copy, extra = '') {
  return `<section class="page-intro">
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
  return `<div data-prelaunch-only>
  ${pageIntro(link, 'Collection', 'Care, <em>in the making.</em>', 'Explore the hair-care and wellness concepts we’re developing. Our first assortment will be announced in phases.')}
  <section class="section shop-content" aria-label="Product concepts">
    <div class="container">
      <div class="catalog-tools">
        <div class="catalog-filters" role="group" aria-label="Filter product concepts" hidden>
          ${['All concepts', 'Hair care', 'Wellness'].map((group, index) => `<button type="button" class="filter" data-filter="${group}" aria-pressed="${index === 0}">${group}</button>`).join('')}
        </div>
        <p class="catalog-count" role="status" aria-live="polite">${products.length} concepts</p>
      </div>
      <div class="product-grid">${products.map((product) => productCard(link, product)).join('')}</div>
      <p class="image-note">Illustrative imagery. Plans and formulations may change during development.</p>
    </div>
  </section>
  </div>
  <div data-live-catalog="all" hidden></div>
  ${newsletter(link)}`;
}

function liveProduct(link) {
  return `<section class="section product-detail">
    <div class="container" data-live-product>
      <h1 class="store-product-heading">DEBORRA products</h1>
      <p>Explore the collection to see what’s in development.</p>
      ${textLink('View the collection', link('shop/'))}
    </div>
  </section>`;
}

const categoryTitles = {
  'hair-oils': 'Hair Oils',
  serums: 'Serums',
  wellness: 'Wellness',
  'hair-care': 'Hair Cream & Care'
};

function categoryPage(link, handle) {
  const label = categoryTitles[handle];
  return `<div data-prelaunch-only>
    ${pageIntro(link, 'Collection', label, 'Explore the collection to see the current directions for DEBORRA.')}
    <section class="section"><div class="container">${textLink('View the collection', link('shop/'))}</div></section>
  </div>
  <div data-live-catalog="all" data-category-handle="${handle}" hidden></div>`;
}

function orderPage(link, label, intro, checkout = false) {
  return `${pageIntro(link, label, label, intro)}
  <section class="section"><div class="container prose order-actions">
    <div data-prelaunch-only><p>For product availability or order enquiries, reach DEBORRA directly.</p>
      ${button(`Call DEBORRA · ${phone}`, phoneHref)}
    </div>
    ${checkout ? '<button class="button button--primary" type="button" data-open-cart hidden>Open your bag</button>' :
    '<a class="button button--primary" data-account-link hidden>Track an order</a>'}
    <p>${textLink('View the collection', link('shop/'))}</p>
  </div></section>`;
}

function productPage(link, product) {
  const wellness = product.group === 'Wellness';
  const guidance = wellness
    ? 'Serving size, age suitability and directions will be available with a confirmed product label.'
    : 'Application area, frequency and any rinse or leave-in directions will be published with the final product label.';
  const warnings = wellness
    ? 'Suitability, precautions and any warnings will be determined during formulation, testing and compliance review. This concept is presented for information while development continues.'
    : 'Product-specific cautions will be published once the final formula and label are available. This concept is presented for information while development continues.';
  return `<section class="section product-detail">
    <div class="container">
      <nav class="breadcrumbs breadcrumbs--light" aria-label="Breadcrumb"><a href="${link()}">Home</a><span aria-hidden="true">/</span><a href="${link('shop/')}">Collection</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(product.name)}</span></nav>
      <div class="detail-grid">
        <figure class="detail-image">${image(link, product.image, product.alt, 'fetchpriority="high" width="720" height="720"')}<figcaption>Illustrative editorial imagery</figcaption></figure>
        <div class="detail-copy">
          ${eyebrow(product.group)}
          <h1>${escapeHtml(product.name)}</h1>
          <p class="detail-stage">${product.stage}</p>
          <p class="detail-lead">${escapeHtml(product.detail)}</p>
          <p class="detail-availability">This concept is in development. Release timing and product details are to be confirmed.</p>
          <a class="button button--primary" href="${link('#launch-list')}" data-signup-label="Join the launch list"${dialogAttribute('#launch-list')}>Ask about availability</a>
          <div class="detail-accordions">
            ${details('Ingredients', `<p>${escapeHtml(product.ingredients)}</p>`)}
            ${details('Usage & directions', `<p>${guidance}</p>`)}
            ${details('Warnings & suitability', `<p>${warnings}</p>`)}
            ${details('Product FAQ', `<p><strong>${escapeHtml(product.question)}</strong></p><p>${escapeHtml(product.answer)}</p>`)}
          </div>
        </div>
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
  return `${pageIntro(link, 'Our story', 'The making of <em>DEBORRA.</em>', 'An Indian consumer brand taking shape around thoughtful hair care, wellness and everyday personal care.', `<p class="about-byline">Founded by <a href="#founder">${founderName}</a></p>`)}
  <section class="section">
    <div class="container detail-grid about-grid">
      <figure class="detail-image">${image(link, 'ritual.webp', 'A woman with dark, naturally wavy hair in warm light', 'width="820" height="1024"')}<figcaption>Illustrative lifestyle imagery</figcaption></figure>
      <div class="prose">
        <section class="founder" id="founder" aria-labelledby="founder-name">
          <p class="kicker">Founder of DEBORRA</p><h2 id="founder-name">${founderName}</h2>
          <p>Brijesh’s professional background includes enterprise sales and go-to-market leadership in India and Asia. ACCELETECH lists him as its founder and CEO.</p>
          <div class="founder__links">${textLink('Brijesh on LinkedIn', founderProfile)}${textLink('ACCELETECH profile', 'https://acceletechglobal.com/')}</div>
        </section>
        <section><h2>Why we started</h2><p>We wanted everyday care to feel useful, considered and approachable. DEBORRA pairs an emphasis on product quality and clear information with distinctive packaging and a modern experience.</p></section>
        <section><h2>What’s in the name</h2><p>DEBORRA is our stylised spelling of Deborah, a name commonly associated with the Hebrew word for bee. We take inspiration from its sense of diligence and purposeful creation. DEBORRA World is the umbrella for the ranges we may develop over time.</p></section>
        <section><h2>Where we’re going</h2><p>We’re beginning with a focused hair-care assortment and will learn from how people use and buy it. Over time, we aim to build a trusted Indian consumer brand across carefully chosen personal-care and wellness formats.</p><p>We’re starting online. As the range and our operations mature, we may explore selected retail and salon partnerships and bring DEBORRA to more markets.</p></section>
        ${textLink('Explore our approach', link('quality/'))}
      </div>
    </div>
  </section>`;
}

function quality(link) {
  const page = {
    label: 'Our approach',
    title: 'Care, developed <em>with purpose.</em>',
    intro: 'Our approach starts with the role a product will have in an everyday routine.',
    sections: [
      ['Start with the formula', '<p>We explore ingredients alongside texture, use and the needs a product is intended to serve. Botanical inspiration helps shape our ideas. The finished formula and its testing will inform the final directions and claims.</p>'],
      ['Make information easy to find', '<p>For each confirmed product, we plan to make the full ingredient list, intended use, directions, warnings and product-specific FAQs accessible on the product page. Claims should reflect what the formula and evidence support.</p>'],
      ['Consider the whole experience', '<p>Packaging should feel distinctive and be practical to use. We’re exploring formats such as amber glass and outer cartons for hair oil, and convenient portions for selected powder concepts.</p>'],
      ['Give wellness the time it needs', '<p>Wellness concepts are subject to expert formulation, sourcing, safety, testing, age-appropriate labelling and regulatory review before launch decisions.</p>']
    ],
    action: ['Explore the collection', 'shop/']
  };
  return `${pageIntro(link, page.label, page.title, page.intro)}
  <section class="section">
    <div class="container detail-grid about-grid">
      <figure class="detail-image">${image(link, 'formulation-study.webp', 'Amber oil and plain glassware on warm stone', 'width="1000" height="1250"')}<figcaption>Illustrative formulation mood study</figcaption></figure>
      <div class="prose">${proseSections(page)}${textLink(page.action[0], link(page.action[1]))}</div>
    </div>
  </section>`;
}

function journal(link) {
  return `${pageIntro(link, 'Journal', 'The <em>DEBORRA</em> journal.', 'Practical reading on hair-care routines, ingredients and the information behind the products you use.')}
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
        <figure class="article-image">${image(link, article.image, article.alt, 'width="720" height="480"')}<figcaption>Illustrative editorial imagery</figcaption></figure>
        ${article.sections.map(([heading, paragraph]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(paragraph)}</p></section>`).join('')}
        ${textLink('Back to the journal', link('journal/'))}
      </div>
    </div>
  </article>`;
}

function faqContent(link) {
  return `<div data-prelaunch-only>
        ${faqs.map(([question, answer]) => details(question, `<p>${escapeHtml(answer)}</p>`)).join('')}
      </div>
      <div data-store-faq hidden>
        ${details('How do I place an order?', `<p>Choose a product and available size in the ${textLink('shop', link('shop/'))}, then open your bag and continue to checkout. Available payment methods are shown there.</p>`)}
        ${details('Can I use a discount code?', '<p>Enter your code in the bag or during checkout. The price summary will show any discount that applies to your order.</p>')}
        ${details('How do I track my order?', '<p>Open the order status link in your confirmation or shipping message, or sign in to <a class="text-link" data-account-link hidden>track an order</a>.</p>')}
        ${details('Where can I see shipping fees and return terms?', `<p>Checkout shows the delivery options for your address. See ${textLink('Shipping & returns', link('shipping-returns/'), 'shipping-returns/')} for the current policies.</p>`)}
        ${details('Where are ingredients and directions listed?', '<p>Each product page lists the available ingredient information, directions, warnings and product FAQs. Use the final product label for application or serving instructions.</p>')}
        ${details('How can I manage DEBORRA emails?', `<p>Use the unsubscribe link in any DEBORRA marketing email. Questions can be directed to ${textLink('customer support', link('contact/'), 'contact/')}.</p>`)}
      </div>
      <p class="faq-contact">Have another question? ${textLink('Contact DEBORRA', link('contact/'), 'contact/')}</p>`;
}

function faq(link) {
  return `${pageIntro(link, 'FAQs', 'Frequently asked <em>questions.</em>', 'Find answers about the pre-launch collection, the launch list and customer support.')}
  <section class="section">
    <div class="container prose">${faqContent(link)}</div>
  </section>`;
}

const support = [
  ['contact/', {
    label: 'Contact',
    title: 'Get in <em>touch.</em>',
    intro: 'Contact DEBORRA customer support about the collection, products or your order.',
    sections: [
      ['Call DEBORRA', `<p class="contact-phone"><a href="${phoneHref}">${phone}</a></p><p>For product and customer support enquiries.</p><p><a data-support-email hidden></a></p><p><a class="text-link" data-account-link hidden>Track an order</a></p>`]
    ],
    action: ['Read the FAQs', 'faq/']
  }],
  ['shipping-returns/', {
    label: 'Shipping & returns',
    policies: ['shippingPolicy', 'refundPolicy'],
    title: 'Shipping, delivery <em>& returns.</em>',
    intro: 'DEBORRA is in pre-launch. Fulfilment and returns information will be published when the first products are ready for direct orders.',
    sections: [
      ['Shipping and delivery', '<p>Serviceable locations, any delivery charges and estimated timelines will be shared when ordering opens. Order updates and tracking will be available for eligible shipments.</p>'],
      ['Returns and refunds', '<p>Return eligibility, timelines and the refund process will be published before orders open.</p>'],
      ['Customer support', `<p>Call <a href="${phoneHref}">${phone}</a> with a question about the upcoming launch.</p>`]
    ],
    action: ['Contact DEBORRA', 'contact/']
  }],
  ['privacy/', {
    label: 'Privacy notice',
    policies: ['privacyPolicy'],
    intro: 'This notice describes how the DEBORRA pre-launch site works.',
    sections: [
      ['Visiting the site', '<p data-privacy-traffic>The hosting provider may process standard connection information to serve the site. Advertising trackers are inactive in the pre-launch configuration.</p>'],
      ['Launch emails', '<p data-newsletter-privacy>When signups open, the form will ask for your email address and agreement to receive DEBORRA emails. You will be able to unsubscribe through a link in the emails.</p>'],
      ['Questions about privacy', `<p>Contact DEBORRA at <a href="${phoneHref}">${phone}</a> with questions about this site.</p>`]
    ]
  }],
  ['terms/', {
    label: 'Terms & conditions',
    policies: ['termsOfService'],
    intro: 'This pre-launch site introduces DEBORRA and the collection currently in development.',
    sections: [
      ['Concepts and availability', '<p>Product names, formats, ingredients and packaging described as concepts may change as development progresses. Illustrative images show editorial ideas and ingredients. Confirmed products will have their own product information at launch.</p>'],
      ['Ordering terms', '<p>Prices, purchasing terms and payment, shipping, cancellation and refund information will be made available when DEBORRA is ready to accept orders.</p>'],
      ['Contact', `<p>Questions about the pre-launch site can be directed to <a href="${phoneHref}">${phone}</a>.</p>`]
    ]
  }]
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
  const [contact, shipping] = support.slice(0, 2).map(([, page]) => page);
  const launch = siteDialog('launch-dialog', 'Launch updates', 'From the <em>beginning.</em>',
    `${launchIntro('site-dialog__intro')}${newsletterForm(link, 'launch-dialog-email')}`, 'launch');
  const questions = siteDialog('faq-dialog', 'Customer support', 'Frequently asked <em>questions.</em>', faqContent(link));
  const contactDialog = siteDialog('contact-dialog', 'Customer support', contact.title,
    `<p class="site-dialog__intro">${contact.intro}</p>${proseSections(contact, 'h3')}
    <p class="faq-contact">${textLink('Read the FAQs', link('faq/'), 'faq/')}</p>`);
  const shippingDialog = siteDialog('shipping-dialog', 'Customer support', shipping.title,
    `<p class="site-dialog__intro" data-policy-intro>${shipping.intro}</p>${proseSections(shipping, 'h3')}
    <p class="faq-contact">${textLink('Contact DEBORRA', link('contact/'), 'contact/')}</p>`);
  return [launch, questions, contactDialog, shippingDialog].join('\n');
}

const pages = [
  ['', { title: 'DEBORRA | Elevate everyday care', body: home, hero: true }],
  ['shop/', { title: 'Collection | DEBORRA', body: shop }],
  ['shop/product/', { title: 'Products | DEBORRA', body: liveProduct, noindex: true }],
  ...Object.entries(categoryTitles).map(([handle, label]) => [`shop/${handle}/`, {
    title: `${label} | DEBORRA`, noindex: true, body: (link) => categoryPage(link, handle)
  }]),
  ['checkout/', { title: 'Checkout | DEBORRA', noindex: true, body: (link) => orderPage(link, 'Checkout', 'Choose a product and open your bag to continue to secure checkout.', true) }],
  ['order-confirmation/', { title: 'Order confirmation | DEBORRA', noindex: true, body: (link) => orderPage(link, 'Order confirmation', 'Your order confirmation and tracking link appear at checkout and in the message sent to you.') }],
  ['track-order/', { title: 'Track an order | DEBORRA', noindex: true, body: (link) => orderPage(link, 'Track an order', 'Use the link in your order confirmation or shipping message to see the latest update.') }],
  ['about/', { title: 'Our Story | DEBORRA', body: about }],
  ['quality/', { title: 'Our Approach | DEBORRA', body: quality }],
  ['journal/', { title: 'Journal | DEBORRA', body: journal }],
  ['faq/', { title: 'FAQs | DEBORRA', body: faq }],
  ...products.map((product) => [`products/${product.slug}/`, {
    title: `${product.name} Concept | DEBORRA`, description: product.summary, body: (link) => productPage(link, product)
  }]),
  ...articles.map((article) => [`journal/${article.slug}/`, {
    title: `${article.title} | DEBORRA`, description: article.summary, body: (link) => journalArticle(link, article)
  }]),
  ...support.map(([route, page]) => [route, {
    title: `${page.label} | DEBORRA`, description: page.intro, body: (link) => prosePage(link, page)
  }])
];

await Promise.all(pages.map(async ([route, page]) => {
  const destination = join(output, route, 'index.html');
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, layout(route, page).replace(/[ \t]+$/gm, ''), 'utf8');
}));

console.log(`Built ${pages.length} pages in docs/.`);
