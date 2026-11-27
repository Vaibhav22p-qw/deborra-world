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
    if (
      !trigger ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
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
    dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
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
let runtimeConfig = null;
let serverNewsletterMode = 'none';

if (backendPage) {
  try {
    const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      runtimeConfig = await response.json();
      Object.assign(settings.store, runtimeConfig.store || {});
      if (runtimeConfig.supportEmail && !settings.supportEmail) settings.supportEmail = runtimeConfig.supportEmail;
      if (runtimeConfig.newsletter?.resendEnabled) serverNewsletterMode = 'resend';
      else if (runtimeConfig.newsletter?.localEnabled) serverNewsletterMode = 'local';
    }
  } catch {
    // Storefront remains functional with embedded catalog configuration.
  }
}

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
const mobile = window.matchMedia('(max-width: 780px)');

function setMenu(open) {
  if (!menu || !navigation) return;
  menu.setAttribute('aria-expanded', String(open));
  navigation.hidden = mobile.matches && !open;
}

function syncMenu() {
  if (!menu || !navigation) return;
  menu.hidden = !mobile.matches;
  setMenu(false);
}

syncMenu();
mobile.addEventListener('change', syncMenu);
menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.querySelector('.site-header')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

// Active Newsletter Signup (works across Node server, external endpoint, or static browser preference)
const launchSignupEndpoint =
  serverNewsletterMode !== 'none'
    ? new URL('/api/newsletter', location.href)
    : httpsUrl(settings.newsletter.endpoint);
const hostedSignup = httpsUrl(settings.newsletter.signupUrl);
const NEWSLETTER_KEY = 'deborra_newsletter_v1';

function readSubscribers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function configureSignup(signup) {
  if (!launchSignupEndpoint && hostedSignup) {
    const section = signup.nextElementSibling;
    section.querySelector('[data-signup-link]').href = hostedSignup.href;
    signup.hidden = true;
    section.hidden = false;
    return;
  }

  const email = signup.elements.namedItem('email');
  const consent = signup.elements.namedItem('consent');
  const submit = signup.querySelector('button[type="submit"]');
  const status = signup.querySelector('.form-status');

  email.disabled = false;
  consent.disabled = false;
  submit.disabled = false;

  signup.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const address = email.value.trim().toLowerCase();
    if (!address || !consent.checked) {
      status.textContent = 'Enter a valid email address and tick the consent box.';
      return;
    }

    const fields = [email, consent, submit];
    fields.forEach((field) => {
      field.disabled = true;
    });
    signup.setAttribute('aria-busy', 'true');
    status.textContent = '';

    try {
      if (launchSignupEndpoint) {
        const response = await fetch(launchSignupEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: address, consent: true }),
          credentials: serverNewsletterMode !== 'none' ? 'same-origin' : 'omit',
          redirect: 'error',
          signal: AbortSignal.timeout(12000)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Signup failed');

        signup.reset();
        if (payload.mode === 'local' && payload.unsubscribeUrl) {
          status.textContent = 'Subscribed with consent! Code DEBORRA10 is ready at checkout. ';
          const unsub = document.createElement('a');
          unsub.className = 'text-link';
          unsub.href = payload.unsubscribeUrl;
          unsub.textContent = 'Manage / Unsubscribe';
          status.append(unsub);
        } else {
          status.textContent = 'Check your inbox to confirm your DEBORRA subscription.';
        }
      } else {
        const existing = readSubscribers().filter((item) => item.email !== address);
        existing.push({ email: address, consentedAt: new Date().toISOString(), active: true });
        try {
          localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(existing));
        } catch {
          // Proceed cleanly even if storage is restricted.
        }
        signup.reset();
        status.textContent = `Subscribed (${address}). Enjoy 10% off with DEBORRA10 at checkout. `;
        const optOut = document.createElement('button');
        optOut.type = 'button';
        optOut.className = 'text-link';
        optOut.style.background = 'transparent';
        optOut.style.border = '0';
        optOut.style.color = 'inherit';
        optOut.textContent = 'Unsubscribe';
        optOut.addEventListener('click', () => {
          const updated = readSubscribers().map((entry) =>
            entry.email === address ? { ...entry, active: false, unsubscribedAt: new Date().toISOString() } : entry
          );
          try {
            localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(updated));
          } catch {
            // ignore
          }
          status.textContent = `${address} has been unsubscribed.`;
        });
        status.append(optOut);
      }
    } catch (error) {
      status.textContent = error.message || 'We could not process your signup right now. Please try again.';
    } finally {
      signup.removeAttribute('aria-busy');
      fields.forEach((field) => {
        field.disabled = false;
      });
    }
  });
}

document.querySelectorAll('[data-launch-form]').forEach(configureSignup);

// Contact & Support Form
const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const statusEl = contactForm.querySelector('[data-contact-status]');
  const submitBtn = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(contactForm);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      topic: String(fd.get('topic') || 'General Enquiry').trim(),
      orderId: String(fd.get('orderId') || '').trim(),
      message: String(fd.get('message') || '').trim()
    };

    if (payload.name.length < 2 || !payload.email || payload.message.length < 5) {
      statusEl.textContent = 'Please complete your name, email and message.';
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = 'Submitting your enquiry…';
    try {
      let ticketId = 'SUP-' + crypto.randomUUID().slice(0, 6).toUpperCase();
      if (backendPage) {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not send enquiry.');
        ticketId = data.ticketId || ticketId;
      } else {
        try {
          const tickets = JSON.parse(localStorage.getItem('deborra_support_v1') || '[]');
          tickets.unshift({ ...payload, ticketId, createdAt: new Date().toISOString() });
          localStorage.setItem('deborra_support_v1', JSON.stringify(tickets.slice(0, 20)));
        } catch {
          // ignore storage quota errors
        }
      }
      contactForm.reset();
      statusEl.textContent = `Support reference ${ticketId} created. Our team responds within 1 business day, or call +91 77150 38107 for urgent help.`;
    } catch (err) {
      statusEl.textContent = err.message || 'Unable to submit right now. Please call +91 77150 38107.';
    } finally {
      submitBtn.disabled = false;
    }
  });
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
  for (const text of document.querySelectorAll('[data-instagram-text]')) text.hidden = true;
  for (const link of document.querySelectorAll('[data-instagram-link]')) {
    link.href = instagram.href;
    link.hidden = false;
  }
}

const analytics = httpsUrl(settings.analyticsScript);
if (analytics?.hostname === 'plausible.io' && /^\/js\/pa-[A-Za-z0-9_-]+\.js$/.test(analytics.pathname)) {
  const tracker =
    window.plausible ||
    function (...args) {
      (tracker.q ||= []).push(args);
    };
  tracker.init ||= (options = {}) => {
    tracker.o = options;
  };
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
} else {
  import('./store.js').then(({ activateNativeStore }) => activateNativeStore(runtimeConfig));
}
