import { httpsUrl, settings } from './site-config.js';

const dialogs = [...document.querySelectorAll('.site-dialog')];
if (dialogs.length && typeof dialogs[0].showModal === 'function') {
  let activeDialog;
  let opener;

  for (const trigger of document.querySelectorAll('[data-dialog-open]')) {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', trigger.dataset.dialogOpen);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('a[data-dialog-open]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const dialog = document.getElementById(trigger.dataset.dialogOpen);
    if (!dialogs.includes(dialog)) return;

    event.preventDefault();
    if (dialog.open) return;
    const returnTo = activeDialog?.contains(trigger) ? opener : trigger;
    activeDialog?.close();
    activeDialog = dialog;
    opener = returnTo;
    dialog.showModal();
    dialog.querySelector('[data-dialog-heading]').focus({ preventScroll: true });
    dialog.dispatchEvent(new Event('deborra:dialog-open', { bubbles: true }));
  });

  for (const dialog of dialogs) {
    dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (dialog !== activeDialog || dialog.open) return;
      activeDialog = undefined;
      opener?.focus({ preventScroll: true });
      opener = undefined;
    });
  }
}

const backendPage = document.documentElement.dataset.serverMode === 'true';
let serverNewsletter = false;
if (backendPage) {
  try {
    const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const runtime = await response.json();
      Object.assign(settings.store, runtime.store);
      serverNewsletter = runtime.newsletter === true || runtime.newsletter?.resendEnabled === true;
      if (runtime.supportEmail) settings.supportEmail = runtime.supportEmail;
    }
  } catch {
    // Pre-launch content remains available if the server configuration is temporarily unavailable.
  }
}

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const mobile = window.matchMedia('(max-width: 650px)');

function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  navigation.hidden = mobile.matches && !open;
}

function syncMenu() {
  menu.hidden = !mobile.matches;
  setMenu(false);
}

syncMenu();
mobile.addEventListener('change', syncMenu);
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.querySelector('.site-header').addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

const filters = document.querySelector('.catalog-filters');

if (filters) {
  const options = [...filters.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-product-group]')];
  const count = document.querySelector('.catalog-count');
  filters.hidden = false;

  options.forEach((option) => option.addEventListener('click', () => {
    const group = option.dataset.filter;
    let visible = 0;

    for (const card of cards) {
      const matches = group === 'All concepts' || card.dataset.productGroup === group;
      card.hidden = !matches;
      if (matches) visible += 1;
    }

    options.forEach((item) => item.setAttribute('aria-pressed', String(item === option)));
    count.textContent = `${visible} ${visible === 1 ? 'concept' : 'concepts'}`;
  }));
}

const launchSignupEndpoint = serverNewsletter
  ? new URL('/api/newsletter', location.href)
  : backendPage ? null : httpsUrl(settings.newsletter.endpoint);
const hostedSignup = httpsUrl(settings.newsletter.signupUrl);

function configureSignup(signup) {
  if (!launchSignupEndpoint && !hostedSignup) return;
  signup.closest('.launch-signup').querySelector('[data-launch-contact]').hidden = true;
  if (!launchSignupEndpoint) {
    const hosted = signup.nextElementSibling;
    hosted.querySelector('[data-signup-link]').href = hostedSignup.href;
    hosted.hidden = false;
    return;
  }
  signup.hidden = false;
  const email = signup.elements.namedItem('email');
  const consent = signup.elements.namedItem('consent');
  const submit = signup.querySelector('button');
  const status = signup.querySelector('.form-status');

  signup.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const address = email.value.trim();
    if (!address || !consent.checked) return;

    const fields = [email, consent, submit];
    fields.forEach((field) => { field.disabled = true; });
    signup.setAttribute('aria-busy', 'true');
    status.textContent = '';

    try {
      const response = await fetch(launchSignupEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address, consent: true }),
        credentials: serverNewsletter ? 'same-origin' : 'omit',
        redirect: 'error',
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error('Signup request failed');

      signup.reset();
      status.textContent = 'Check your inbox to confirm your signup.';
    } catch {
      status.textContent = 'We couldn’t process your signup. Please try again in a moment.';
    } finally {
      signup.removeAttribute('aria-busy');
      fields.forEach((field) => { field.disabled = false; });
    }
  });

  email.disabled = false;
  consent.disabled = false;
  submit.disabled = false;
}

document.querySelectorAll('[data-launch-form]').forEach(configureSignup);
if (launchSignupEndpoint || hostedSignup) {
  for (const button of document.querySelectorAll('[data-signup-label]')) button.textContent = button.dataset.signupLabel;
  for (const paragraph of document.querySelectorAll('[data-signup-copy]')) paragraph.textContent = paragraph.dataset.signupCopy;
}

const newsletterPrivacy = document.querySelector('[data-newsletter-privacy]');
if (newsletterPrivacy && (launchSignupEndpoint || hostedSignup)) {
  const provider = serverNewsletter ? 'DEBORRA and our email delivery provider' : settings.newsletter.provider || 'our email subscription provider';
  newsletterPrivacy.textContent = `When you subscribe, your email address and consent are processed by ${provider} to send the updates you request. Use the unsubscribe link in any DEBORRA marketing email to stop future messages.`;
}

if (/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>&?#]+$/.test(settings.supportEmail)) {
  for (const link of document.querySelectorAll('[data-support-email]')) {
    link.href = 'mailto:' + settings.supportEmail;
    link.textContent = settings.supportEmail;
    link.hidden = false;
  }
}

const instagram = httpsUrl(settings.instagramUrl);
if (instagram && ['www.instagram.com', 'instagram.com'].includes(instagram.hostname)) {
  const link = document.querySelector('[data-instagram-link]');
  link.href = instagram.href;
  link.hidden = false;
}

const privacy = httpsUrl(settings.privacyUrl);
const privacySection = document.querySelector('[data-store-policies="privacyPolicy"]');
if (privacy && privacySection && !settings.store.enabled) {
  document.querySelector('.page-intro__lead').textContent = 'Learn how DEBORRA handles information on this website.';
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = privacy.href;
  link.textContent = 'Read the DEBORRA privacy policy';
  privacySection.append(link);
  privacySection.hidden = false;
}

const analytics = httpsUrl(settings.analyticsScript);
if (analytics?.hostname === 'plausible.io' && /^\/js\/pa-[A-Za-z0-9_-]+\.js$/.test(analytics.pathname)) {
  const notice = document.querySelector('[data-privacy-traffic]');
  if (notice) notice.textContent = 'This website uses Plausible Analytics for aggregate visitor statistics. The host may also process standard connection information to serve the site.';
  const tracker = window.plausible || function (...args) {
    (tracker.q ||= []).push(args);
  };
  tracker.init ||= (options = {}) => { tracker.o = options; };
  tracker.init();
  window.plausible = tracker;
  const script = document.createElement('script');
  script.async = true;
  script.src = analytics.href;
  document.head.append(script);
}

const { enabled, domain } = settings.store;
if (backendPage && enabled && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)) {
  import('./storefront.js').then(({ activateStorefront }) => activateStorefront());
}
