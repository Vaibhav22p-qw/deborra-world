import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const sha256 = (value) => createHash('sha256').update(value).digest('base64url');
export const randomToken = () => randomBytes(32).toString('base64url');
export const opaquePattern = /^[A-Za-z0-9_-]{43}$/;

export function clientAddress(request, config) {
  const remote = request.socket.remoteAddress || 'unknown';
  if (!config.trustedProxy || (remote !== config.trustedProxy && remote !== '::ffff:' + config.trustedProxy)) return remote;
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string') return remote;
  const address = forwarded.split(',').at(-1).trim();
  return isIP(address) ? address : remote;
}

export function secureHeaders(response, secure, allowRazorpay = false) {
  const scriptSrc = allowRazorpay
    ? "script-src 'self' https://plausible.io https://checkout.razorpay.com"
    : "script-src 'self' https://plausible.io";
  const connectSrc = allowRazorpay
    ? "connect-src 'self' https://plausible.io https://api.razorpay.com https://lumberjack.razorpay.com"
    : "connect-src 'self' https://plausible.io";
  const frameSrc = allowRazorpay
    ? "frame-src https://api.razorpay.com https://checkout.razorpay.com"
    : "frame-src 'none'";
  const directives = [
    "default-src 'self'", "base-uri 'none'", "object-src 'none'", frameSrc,
    "frame-ancestors 'none'", "form-action 'self'", "style-src 'self'", "font-src 'self'",
    scriptSrc, connectSrc,
    "img-src 'self' https://cdn.shopify.com https://*.myshopify.com"
  ];
  if (secure) directives.push('upgrade-insecure-requests');
  response.setHeader('Content-Security-Policy', directives.join('; '));
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.setHeader('Cache-Control', 'no-store');
  if (secure) response.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

export function writeOrigin(request, config) {
  const { origin, 'sec-fetch-site': fetchSite } = request.headers;
  if (origin !== config.origin || (fetchSite && fetchSite !== 'same-origin')) {
    throw new HttpError(403, 'This request must come from the DEBORRA website.');
  }
}

export async function readBody(request, contentType, limit = 8192) {
  if (request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== contentType) {
    throw new HttpError(415, 'Unsupported request format.');
  }
  const declared = Number(request.headers['content-length']);
  if (declared > limit) throw new HttpError(413, 'This request is too large.');
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    request.on('data', (chunk) => {
      received += chunk.length;
      if (received > limit) {
        if (received - chunk.length <= limit) reject(new HttpError(413, 'This request is too large.'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
    request.on('aborted', () => reject(new HttpError(400, 'The request was interrupted.')));
  });
}

export async function readJson(request) {
  const string = await readBody(request, 'application/json');
  let data;
  try { data = JSON.parse(string); } catch { throw new HttpError(400, 'Invalid request.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Invalid request.');
  return data;
}

export function limiter() {
  const buckets = new Map();
  let nextCleanup = 0;
  return (key, max, windowSeconds) => {
    const now = Date.now();
    if (now >= nextCleanup) {
      for (const [id, entry] of buckets) if (entry.expiry <= now) buckets.delete(id);
      nextCleanup = now + 60000;
    }
    const entry = buckets.get(key);
    if (!entry || entry.expiry <= now) {
      if (!entry && buckets.size >= 20000) throw new HttpError(429, 'Too many requests. Please try again shortly.');
      buckets.set(key, { count: 1, expiry: now + windowSeconds * 1000 });
      return;
    }
    if (entry.count >= max) throw new HttpError(429, 'Too many requests. Please try again shortly.');
    entry.count += 1;
  };
}

export function reply(request, response, status, body, type = 'application/json; charset=utf-8') {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  response.statusCode = status;
  response.setHeader('Content-Type', type);
  response.setHeader('Content-Length', bytes.length);
  response.end(request.method === 'HEAD' ? undefined : bytes);
}
