# DEBORRA World

Mobile-first website and Node.js backend for DEBORRA World. The site covers the brand, collection, product details, journal, FAQs and support. The server connects a published Shopify catalogue and private visitor carts to hosted checkout. It also offers a consent-based newsletter with confirmation and unsubscribe.

## Run the project

Use Node.js 22.12 or newer. The project uses Node’s built-in SQLite and has no packages to install.

```sh
npm run build
npm test
npm start
```

Open [the server-backed site](http://127.0.0.1:4173/). The default configuration serves the pre-launch website. Edit product concepts and journal content in `scripts/content.mjs`, shared layouts in `scripts/build.mjs`, and frontend assets in `docs/assets/`. Rebuild and commit the generated pages when content changes.

### Store preview

Run `npm run preview` separately from the backend to open the [sample store](http://127.0.0.1:4173/commerce-preview/). Try variant and stock states, bag quantities, and sample discount code `DEBORRA10`. Sample orders, payments and tracking are simulated. The local dev server and the backend both use port 4173 by default.

## Publish on GitHub Pages

1. Push the project to your GitHub repository, including the contents of `docs/` and its `.nojekyll` file.
2. In the repository, open **Settings → Pages** and select **Deploy from a branch**.
3. Select the branch you pushed, choose **/docs**, and save.

GitHub Pages serves the static pre-launch frontend from `docs/`. Use Node.js hosting for the backend and live store. Links and assets work under a GitHub Pages project path. [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Launch configuration

Copy `.env.example` to `.env` for local configuration or set the variables in the host’s secret manager. The checked-in configuration is the questionnaire’s pre-launch experience. Configure public links in `docs/assets/site-config.js`.

### Newsletter and contact

- To enable the server signup form, verify a sending domain in Resend and set `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_SECRET`, and `NEWSLETTER_ENABLED=true`. Generate the secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` and keep it stable for unsubscribe links. Set `NEWSLETTER_CONSENT_VERSION` to the version of the approved consent wording. Confirmation links expire after 24 hours and require a confirmation action. [Resend Email API](https://resend.com/docs/api-reference/emails/send-email)
- For campaigns, run `npm run --silent subscribers:export` in the private server environment to export confirmed addresses and their unsubscribe links as newline-delimited JSON. Treat the export as private customer data and ensure the sending platform honours unsubscribe requests.
- The static site can use a hosted form via `newsletter.signupUrl` or an approved JSON endpoint via `newsletter.endpoint`. Set the newsletter provider and approved `privacyUrl`. The site already uses the supplied support phone. Set `supportEmail` and `instagramUrl` once the email and proposed `@deborra.in` handle are confirmed. [Hosted signup and double opt-in](https://mailchimp.com/help/set-signup-preferences/)

### Live sales

1. In Shopify, set up the DEBORRA Headless channel and publish only the approved products there. Enter real product photos, prices, variant details and inventory. Enable India in Markets and configure shipping zones, rates, fulfilment, customer notifications, and order tracking. [Shopify Headless setup](https://shopify.dev/docs/storefronts/headless/overview) · [Order tracking](https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/order-tracking)
2. Create product metafields in the `deborra` namespace named `ingredients`, `directions`, `warnings` and `faq`. Use plain multi-line text and enable Storefront read access. Enter final label copy and the approved product FAQs. [Storefront metafields](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/metafields)
3. Create the launched category collections in Shopify and list their handles in `SHOPIFY_CATEGORY_HANDLES`. The website displays a category only when its collection contains published products. Optionally set `SHOPIFY_FEATURED_COLLECTION` for the homepage.
4. Publish the approved shipping, refund, privacy and terms policies in Shopify. Configure discounts and payments in the store. Eligible merchants can add Razorpay as a payment provider through Shopify. [Shopify store policies](https://shopify.dev/docs/api/storefront/latest/objects/shop) · [Razorpay for Shopify](https://razorpay.com/blog/how-to-add-payment-gateway-in-shopify/)
5. Set `SHOPIFY_DOMAIN` and `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` in the server environment. The Storefront integration needs product listings, inventory and checkout access. Set `SHOPIFY_ACCOUNT_URL` for a custom customer-account URL. Add any approved checkout hostname to `SHOPIFY_CHECKOUT_HOSTS` if Shopify uses a hostname other than the configured `.myshopify.com` domain.
6. Set `SHOPIFY_ENABLED=true` when the assortment and fulfilment are ready. Verify the actual catalogue and complete a test checkout in the merchant account before enabling live payments. Shopify handles payment, order confirmation and shipping updates with status links. [Shopify cart and checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage) · [Order status and confirmations](https://help.shopify.com/en/manual/fulfillment/setup/order-status-page/understanding-order-status-pages)

### Host the backend

- Use an HTTPS reverse proxy and set `APP_ORIGIN` to the public origin. Preserve the incoming `Host` header. Keep the app bound to loopback or a private network behind the proxy. When using `TRUSTED_PROXY_IP`, configure the proxy to overwrite the client IP header and keep direct public access to the internal Node port closed.
- Run one Node instance with a durable, access-restricted `DATABASE_PATH` outside `docs/`. Back up the database on an encrypted volume and restrict access to the server account. The app stores opaque visitor sessions, provider cart identifiers, and newsletter consent records.
- The server sets CSP and other browser headers, requires same-origin writes, validates inputs, rate-limits store and signup routes, and restricts checkout redirects to approved hosts. It sends cart and provider credentials only server-side. Credit card details and order payments are handled inside hosted checkout.
- Use `/api/health` for the host health check. `npm test` covers session isolation, cross-origin rejection, checkout redirect validation, and the newsletter confirmation and unsubscribe flow. Merchant-specific integration tests require the owner’s provider accounts.

### Analytics

Use Shopify’s checkout and order reporting for sales. For basic website traffic, set `analyticsScript` to the site-specific Plausible script URL and reflect that setup in the approved privacy notice. [Plausible installation](https://plausible.io/docs/plausible-script)

## Visual assets

The gold DEBORRA logo in `docs/assets/deborra-logo.png` comes from the supplied artwork with the background removed. The favicon uses its monogram. The self-hosted Cormorant Garamond and DM Sans fonts are accompanied by their licences in `docs/assets/fonts/`.

The WebP photos in `docs/assets/` are illustrative editorial images generated with built-in ImageGen. The prompts covered these subjects.

- `hero.webp` and `hero-mobile.webp` use rosemary and unbranded amber glass on dark stone with warm directional light.
- `rosemary.webp` shows rosemary sprigs and golden oil on warm travertine.
- `amla.webp` shows fresh Indian gooseberries on sandstone.
- `serum.webp` shows a glass pipette and a droplet above an ivory ceramic dish.
- `ritual.webp` shows an Indian woman with long, dark hair near a sunlit stone arch.
- `wellness.webp` shows amla powder and gooseberries on linen.
