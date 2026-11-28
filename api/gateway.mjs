import { createRequestHandler } from '../server/app.mjs';
import { configFrom } from '../server/config.mjs';
import { openHostedDatabase } from '../server/hosted-database.mjs';
import { reply, secureHeaders } from '../server/security.mjs';

const routePattern =
  /^(?:\/api\/(?:health|config|cart|newsletter|contact|waitlist|shop\/(?:catalog|checkout|orders\/track|razorpay\/(?:verify|cancel))|store\/(?:products|collection|categories|product|policies))|\/newsletter\/(?:confirm|unsubscribe))$/;
const handlers = new Map();
let database;

function deploymentOrigins(env) {
  const urls = [
    env.APP_ORIGIN,
    ...[env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL, env.VERCEL_BRANCH_URL]
      .filter(Boolean)
      .map((host) => 'https://' + host)
  ];
  const allowed = new Map();
  for (const value of urls.filter(Boolean)) {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) allowed.set(url.host, url.origin);
  }
  return allowed;
}

async function prepare(origin) {
  const config = configFrom({ ...process.env, APP_ORIGIN: origin, VERCEL: '1' });
  config.hosted = true;
  const needsDatabase = config.store.enabled || config.nativeStore || config.newsletter.manageEnabled;
  if (needsDatabase && !database) {
    database = openHostedDatabase(process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return createRequestHandler(config, fetch, { staticFiles: false, database: needsDatabase ? await database : null });
}

export default async function gateway(request, response) {
  secureHeaders(response, true);
  try {
    const origin = deploymentOrigins(process.env).get(request.headers.host?.toLowerCase());
    if (!origin) {
      reply(request, response, 400, { error: 'Invalid request address.' });
      return;
    }

    const url = new URL(request.url, origin);
    const rewritten = url.pathname === '/api/gateway' ? url.searchParams.get('_route') : null;
    if (rewritten) url.pathname = '/' + rewritten;
    url.searchParams.delete('_route');
    if (!routePattern.test(url.pathname)) {
      reply(request, response, 404, { error: 'This page could not be found.' });
      return;
    }
    request.url = url.pathname + url.search;

    if (!handlers.has(origin)) {
      handlers.set(
        origin,
        prepare(origin).catch((error) => {
          handlers.delete(origin);
          throw error;
        })
      );
    }
    const { handle } = await handlers.get(origin);
    await handle(request, response);
  } catch {
    if (response.headersSent || response.destroyed) return;
    console.error('DEBORRA storefront service failed.');
    reply(request, response, 503, { error: 'The shop service is temporarily unavailable.' });
  }
}
