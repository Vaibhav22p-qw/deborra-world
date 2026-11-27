# DEBORRA World

Direct-to-consumer storefront and Node.js backend for **DEBORRA** (`DEBORRA World`). Built for direct static deployment (`docs/` on Vercel or GitHub Pages) as well as full server-backed ecommerce (`server/` with SQLite, Razorpay India payments, Cash on Delivery, order tracking, customer support tickets, and consent-based newsletter management).

## Run locally

Requires Node.js 22.12 or newer (uses Node’s built-in SQLite; no third-party npm packages required).

```sh
npm run build
npm test
npm start
```

Open `http://127.0.0.1:4173/`.

- `scripts/content.mjs`: Canonical catalog, SKUs, variants, INR pricing, discount codes (`DEBORRA10`, `WELCOME15`, `FREESHIP`), founder profile, journal articles, and FAQs.
- `scripts/build.mjs`: Generates all 29 static HTML pages and `docs/assets/catalog-data.js`.
- `docs/assets/`: Frontend storefront (`store.js`, `site.js`, `site.css`, `site-config.js`) and optional Shopify Storefront adapter (`storefront.js`).
- `server/`: Node.js HTTP server (`app.mjs`, `native-store.mjs`, `database.mjs`, `newsletter.mjs`, `security.mjs`, `store.mjs`).

## Direct static publish (Vercel / GitHub Pages)

`vercel.json` points directly to `outputDirectory: "docs"`. After editing `scripts/content.mjs` or `scripts/build.mjs`, run `npm run build` and commit `docs/`.

In static mode, visitors can browse all category landing pages (`/shop/`, `/shop/hair-oils/`, `/shop/serums/`, `/shop/wellness/`, `/shop/hair-care/`), select pack variants, add to the persistent shopping bag, apply promo codes, complete checkout (COD or Razorpay client-side if `settings.razorpay.keyId` is configured in `docs/assets/site-config.js`), receive order confirmation receipts, track orders (`/track-order/`), submit support enquiries (`/contact/`), and subscribe to the newsletter.

## Live online payments (Razorpay India)

1. For full server-side order creation and HMAC-SHA256 payment verification, deploy the Node.js server (`npm start`) and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
2. Razorpay Checkout supports UPI, Credit/Debit Cards, Net Banking, and Wallets in INR (`₹`).
3. Alternatively, set `SHOPIFY_ENABLED=true`, `SHOPIFY_DOMAIN`, and `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` to switch to Shopify Headless Storefront mode.
4. Set `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, and `NEWSLETTER_ENABLED=true` to send double opt-in confirmation emails via Resend (local SQLite consent capture works out-of-the-box by default).
