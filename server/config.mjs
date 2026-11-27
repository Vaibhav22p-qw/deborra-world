import { fileURLToPath } from 'node:url';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { isIP } from 'node:net';

export const publicRoot = fileURLToPath(new URL('../docs', import.meta.url));
export const handlePattern = /^[a-z0-9][a-z0-9-]{0,119}$/;
const hostPattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const shopPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function configFrom(env = process.env) {
  const port = Number(env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const origin = new URL(env.APP_ORIGIN || `http://127.0.0.1:${port}`);
  const secure = origin.protocol === 'https:';
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    !(secure || (origin.protocol === 'http:' && localHosts.has(origin.hostname)))
  ) {
    throw new Error('APP_ORIGIN must be an HTTPS origin or a local HTTP origin.');
  }
  const bindHost = env.BIND_HOST || '127.0.0.1';
  if (!secure && !['127.0.0.1', '::1', 'localhost'].includes(bindHost)) {
    throw new Error('Local HTTP must bind to a loopback address.');
  }

  const dbPath = resolve(env.DATABASE_PATH || '.data/deborra.sqlite');
  const dbRelative = relative(publicRoot, dbPath);
  if (!dbRelative || (!isAbsolute(dbRelative) && dbRelative !== '..' && !dbRelative.startsWith('..' + sep))) {
    throw new Error('DATABASE_PATH must be outside the public docs directory.');
  }

  const domain = (env.SHOPIFY_DOMAIN || '').toLowerCase().trim();
  const privateToken = env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.trim() || '';
  const storeEnabled = env.SHOPIFY_ENABLED === 'true';
  if (storeEnabled && (!shopPattern.test(domain) || !privateToken)) {
    throw new Error('Live sales require SHOPIFY_DOMAIN and a private Storefront token.');
  }
  const handles = (env.SHOPIFY_CATEGORY_HANDLES || 'hair-oils,serums,hair-care,wellness')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => handlePattern.test(item))
    .slice(0, 20);
  const featured = env.SHOPIFY_FEATURED_COLLECTION?.trim() || '';
  let accountUrl = '';
  if (env.SHOPIFY_ACCOUNT_URL) {
    const url = new URL(env.SHOPIFY_ACCOUNT_URL);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('SHOPIFY_ACCOUNT_URL must be an HTTPS public URL.');
    }
    accountUrl = url.href;
  }
  const additionalHosts = (env.SHOPIFY_CHECKOUT_HOSTS || '')
    .toLowerCase()
    .split(',')
    .map((item) => item.trim())
    .filter((item) => hostPattern.test(item));

  const razorpayKeyId = env.RAZORPAY_KEY_ID?.trim() || '';
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET?.trim() || '';
  const razorpayEnabled = Boolean(razorpayKeyId && razorpayKeySecret);
  if ((razorpayKeyId && !razorpayKeySecret) || (!razorpayKeyId && razorpayKeySecret)) {
    throw new Error('Razorpay integration requires both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  const newsletterEnabled = env.NEWSLETTER_ENABLED === 'true';
  const sender = env.NEWSLETTER_FROM?.trim() || '';
  const newsletterSecret = env.NEWSLETTER_SECRET?.trim() || '';
  const resendKey = env.RESEND_API_KEY?.trim() || '';
  const consentVersion = env.NEWSLETTER_CONSENT_VERSION?.trim() || '1';
  if (newsletterEnabled && (!sender || !resendKey || newsletterSecret.length < 32)) {
    throw new Error('Server newsletter needs a sender, Resend key and a secret of at least 32 characters.');
  }
  const localNewsletterSecret =
    newsletterSecret.length >= 32
      ? newsletterSecret
      : 'deborra-local-consent-hmac-key-default-only-change-in-production';

  const supportEmail = env.SUPPORT_EMAIL?.trim() || '';
  const trustedProxy = env.TRUSTED_PROXY_IP || '';
  if (trustedProxy && !isIP(trustedProxy)) throw new Error('TRUSTED_PROXY_IP must be a literal IP address.');

  return {
    port,
    bindHost,
    origin: origin.origin,
    secure,
    dbPath,
    trustedProxy,
    supportEmail,
    razorpay: { enabled: razorpayEnabled, keyId: razorpayKeyId, keySecret: razorpayKeySecret },
    store: {
      enabled: storeEnabled,
      domain,
      privateToken,
      categoryHandles: [...new Set(handles)],
      featuredCollection: handlePattern.test(featured) ? featured : '',
      accountUrl,
      checkoutHosts: new Set([domain, ...additionalHosts])
    },
    newsletter: {
      enabled: newsletterEnabled,
      localEnabled: env.NEWSLETTER_LOCAL_CAPTURE !== 'false',
      sender,
      secret: localNewsletterSecret,
      resendKey,
      consentVersion
    }
  };
}
