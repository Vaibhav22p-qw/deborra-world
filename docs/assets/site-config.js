// Public configuration for this static site. Keep private API keys out of this file.
export const settings = {
  store: { enabled: false }, // The running server supplies public store information.
  newsletter: {
    signupUrl: '', // Optional HTTPS hosted opt-in form.
    endpoint: '', // Optional public HTTPS JSON endpoint for the on-site opt-in form.
    provider: ''
  },
  supportEmail: '',
  instagramUrl: '',
  privacyUrl: '', // Optional approved privacy notice that covers this website.
  analyticsScript: '' // Optional https://plausible.io/js/pa-….js site snippet URL.
};

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {
    // An empty or invalid optional URL leaves the corresponding feature inactive.
  }
  return null;
}
