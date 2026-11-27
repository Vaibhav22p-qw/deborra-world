// Public configuration for DEBORRA World. Keep private API keys out of this file.
export const settings = {
  store: { enabled: false }, // Automatically overridden when Shopify Storefront mode is enabled on the backend.
  razorpay: {
    keyId: '' // Optional public Razorpay Key ID (e.g. rzp_live_... or rzp_test_...) for static deployments; Node backend overrides via /api/config.
  },
  newsletter: {
    signupUrl: '', // Optional HTTPS hosted opt-in form.
    endpoint: '', // Optional public HTTPS JSON endpoint for the on-site opt-in form.
    provider: ''
  },
  supportEmail: '',
  instagramUrl: '', // Verify @deborra.in availability before enabling the public URL.
  privacyUrl: '',
  analyticsScript: '' // Optional https://plausible.io/js/pa-….js site snippet URL.
};

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {
    // Empty or invalid optional URLs leave the corresponding feature inactive.
  }
  return null;
}
