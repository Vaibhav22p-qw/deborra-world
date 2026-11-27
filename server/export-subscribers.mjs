import { configFrom } from './config.mjs';
import { openDatabase } from './database.mjs';
import { unsubscribeLink } from './newsletter.mjs';

const config = configFrom();
if (config.newsletter.secret.length < 32) throw new Error('Set NEWSLETTER_SECRET before exporting subscribers.');
const db = openDatabase(config.dbPath);
try {
  const subscribers = db.prepare(`
    SELECT email, subscription_id, consent_version, confirmed_at FROM newsletter WHERE state = 'active' ORDER BY email
  `);
  for (const row of subscribers.iterate()) {
    console.log(JSON.stringify({
      email: row.email, consentVersion: row.consent_version, confirmedAt: new Date(row.confirmed_at).toISOString(),
      unsubscribe: unsubscribeLink(config, row.subscription_id)
    }));
  }
} finally {
  db.close();
}
