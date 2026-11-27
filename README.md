# DEBORRA World

Direct-to-consumer storefront and Node.js backend for **DEBORRA** (`DEBORRA World`). The public site shows the workbook’s pre-launch experience until the approved Shopify catalogue and hosted checkout are configured.

## Run locally

Requires Node.js 22.12 or newer (uses Node’s built-in SQLite; no third-party npm packages required).

```sh
npm run build
npm test
npm start
```

Open `http://127.0.0.1:4173/`.

- `scripts/content.mjs` holds product concepts, journal articles, and FAQs approved by the brief.
- `scripts/build.mjs` generates the static HTML pages. The assets in `docs/assets/` include the storefront, product details, and shopping bag.
- `server/` handles Shopify catalogue and cart requests, newsletter signup, and private sessions.
- `preview/` holds the separate local sample shop and test catalogue.

## Direct static publish (Vercel / GitHub Pages)

`vercel.json` points directly to `outputDirectory: "docs"`. After editing `scripts/content.mjs` or `scripts/build.mjs`, run `npm run build` and commit `docs/`.

Static hosting serves the brand, concepts, founder story, journalism, support and policy information. The live storefront gets its prices, stock, photos and variant information from published Shopify products.

## Live sales and email

1. Publish the approved products in Shopify Headless with real product photography, prices, variants, stock, and final label information. Configure India delivery, policies, checkout payments, and order notifications in Shopify. Eligible merchants can connect Razorpay through Shopify.
2. Set `SHOPIFY_ENABLED=true`, `SHOPIFY_DOMAIN`, and `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` on the server. Configure the published categories and checkout hostnames in `.env.example`. Test a real merchant checkout in test mode before enabling live payments.
3. Set `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, and `NEWSLETTER_ENABLED=true` for confirmed email opt-in. Use the provider’s unsubscribe workflow. Store secrets in the hosting environment.

The local Razorpay integration is scoped to the loopback checkout preview. Use test credentials and `NATIVE_CHECKOUT_PREVIEW=true` for that fixture.

## Imagery

The illustrative editorial studies are created with built-in ImageGen. They depict oil texture on stone, a cream-texture still life, rosemary and amla, an everyday hair-care routine, and a formulation mood study. Live product pages use the merchant’s Shopify photography.
