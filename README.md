# DEBORRA World

Direct-to-consumer storefront and Node.js backend for **DEBORRA** (`DEBORRA World`). The public site shows the workbook’s pre-launch experience until the approved Shopify catalogue and hosted checkout are configured.

## Run locally

Requires Node.js 22.12 or newer. Local development uses Node’s built-in SQLite.

```sh
npm ci
npm run build
npm test
npm start
```

Open `http://127.0.0.1:4173/`.

- `scripts/content.mjs` holds product concepts, journal articles, and FAQs approved by the brief.
- `scripts/build.mjs` generates the static HTML pages. The assets in `docs/assets/` include the storefront, product details, and shopping bag.
- `server/` handles Shopify catalogue and cart requests, newsletter signup, and private sessions.
- `preview/` holds the separate local sample shop and test catalogue.

## Vercel and GitHub Pages

`vercel.json` builds the site to `docs/` and routes the same-origin shop and newsletter API to the Vercel Node function. The function uses hosted Turso SQLite when sales or email are enabled. The pre-launch website and the health endpoint work with the default configuration. After editing page templates, regenerate `docs/` before committing. [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js) · [Turso Marketplace setup](https://vercel.com/marketplace/tursocloud/database)

GitHub Pages serves the static pre-launch site from `docs/`. The live storefront gets its prices, stock, photos and variant information from products published to the Shopify Headless channel.

## Live sales and email

1. Publish the approved products in Shopify Headless with real product photography, prices, variants, stock, and final label information. Use readable product metafields `deborra.ingredients`, `deborra.directions`, `deborra.warnings`, and `deborra.faq` with storefront read access. Configure India delivery, policies, checkout payments, and order notifications. Eligible merchants can connect Razorpay through Shopify. [Shopify metafields](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields) · [Razorpay for Shopify](https://razorpay.com/blog/how-to-add-payment-gateway-in-shopify/)
2. In the Vercel **Production** environment, connect a Turso database and set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Set `APP_ORIGIN` for your custom production domain, or use the Vercel system production URL. The app creates its tables on initialization. Leave your preview deployment’s merchant settings separate.
3. Set `SHOPIFY_DOMAIN` and `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` in Vercel. Set approved collection handles and checkout hosts as needed using `.env.example`. Use `SHOPIFY_ENABLED=true` with the merchant’s test payment setup to check stock, order confirmation and tracking. Enable live payments after verifying the actual merchant checkout and fulfilment settings.
4. Set `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, and `NEWSLETTER_ENABLED=true` for email confirmation. Use a stable secret of at least 32 characters for unsubscribe links. Export confirmed subscribers with `npm run --silent subscribers:export` from an authorized private environment with the same database and newsletter settings. Preserve unsubscribe status when sending campaigns.

Set `SUPPORT_EMAIL` only when a business address is confirmed. Keep provider secrets in Vercel’s environment settings. The Shopify branch collects payment and shipping information within hosted checkout.

The local Razorpay integration is scoped to the loopback checkout preview. Use test credentials and `NATIVE_CHECKOUT_PREVIEW=true` for that fixture.

## Imagery

The illustrative editorial studies are created with built-in ImageGen. They depict oil texture on stone, a cream-texture still life, rosemary and amla, an everyday hair-care routine, and a formulation mood study. Live product pages use the merchant’s Shopify photography.
