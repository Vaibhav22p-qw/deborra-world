# DEBORRA World

Direct-to-consumer storefront and Node.js backend for **DEBORRA** (`DEBORRA World`). Ready for direct static publishing (`docs/` on Vercel or GitHub Pages) as well as full server-backed ecommerce (`server/` with SQLite or hosted Turso, Razorpay India payments, Cash on Delivery, order tracking, customer support tickets, and consent-based newsletter).

## Run locally

Requires Node.js 22.12 or newer. Local development uses Node’s built-in SQLite.

```sh
npm ci
npm run build
npm test
npm start
```

Open `http://127.0.0.1:4173/`.

- `scripts/content.mjs`: Canonical catalog, SKUs, variants, INR pricing, discount codes (`DEBORRA10`, `WELCOME15`, `FREESHIP`), founder profile, journal articles, and FAQs.
- `scripts/build.mjs`: Generates all 29 static HTML pages and `docs/assets/catalog-data.js` (pass `--hosted` when building for server-backed Vercel deploys).
- `docs/assets/`: Frontend storefront (`store.js`, `site.js`, `site.css`, `site-config.js`), optional Shopify Storefront adapter (`storefront.js`), extracted metallic gold brand logo & monogram, and product studio photography.
- `server/` & `api/gateway.mjs`: Node.js HTTP server and Vercel serverless gateway supporting native D2C checkout, Razorpay HMAC-SHA256 verification, Turso/SQLite persistence, support tickets, Phase 2 waitlist, newsletter, and optional Shopify Headless mode.

## Publish directly (Vercel / GitHub Pages)

- **Vercel**: `vercel.json` builds with `node scripts/build.mjs --hosted`, serves `docs/`, applies strict security headers (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), and routes `/api/*` to `api/gateway.mjs`. To persist orders, inventory, tickets, and newsletter records server-side on Vercel, connect a Turso database (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) and configure `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
- **GitHub Pages / Static**: Serve `docs/` directly. Shop browsing, category landing pages, variant selection, bag drawer, promo codes, COD/client-Razorpay checkout, order receipts, order tracking, newsletter consent, and support forms all run seamlessly client-side.

## Live online payments & email

1. Set `RAZORPAY_KEY_ID` (`rzp_live_...` or `rzp_test_...`) and `RAZORPAY_KEY_SECRET` in `.env` (or Vercel environment variables) for server-verified UPI, Cards, Net Banking, and Wallets in INR (`₹`). For static-only deployments, set `settings.razorpay.keyId` in `docs/assets/site-config.js`.
2. Alternatively, set `SHOPIFY_ENABLED=true`, `SHOPIFY_DOMAIN`, and `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` to switch to Shopify Headless Storefront mode.
3. Local newsletter consent capture is enabled out of the box; set `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, and `NEWSLETTER_ENABLED=true` to send double opt-in confirmation emails via Resend.
