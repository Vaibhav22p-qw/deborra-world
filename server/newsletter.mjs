import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError, opaquePattern, randomToken, sha256 } from './security.mjs';

const validEmail = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,63}$/i;
const day = 86400000;

export function unsubscribeLink(config, subscriptionId) {
  const signature = createHmac('sha256', config.newsletter.secret)
    .update('deborra unsubscribe:' + subscriptionId).digest('base64url');
  return `${config.origin}/newsletter/unsubscribe?t=${subscriptionId}.${signature}`;
}

export function createNewsletter(config, db, fetcher = fetch) {
  const options = config.newsletter;
  const status = db.prepare('SELECT state, requested_at FROM newsletter WHERE email = ?');
  const save = db.prepare(`INSERT INTO newsletter (
    email, subscription_id, state, verification_hash, expires_at, consent_version, requested_at
  ) VALUES (?, ?, 'pending', ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET subscription_id = excluded.subscription_id, state = 'pending',
    verification_hash = excluded.verification_hash, expires_at = excluded.expires_at,
    consent_version = excluded.consent_version, requested_at = excluded.requested_at,
    confirmed_at = NULL, unsubscribed_at = NULL`);
  const confirm = db.prepare(`UPDATE newsletter SET state = 'active', confirmed_at = ?,
    verification_hash = NULL, expires_at = NULL WHERE verification_hash = ? AND state = 'pending' AND expires_at > ?`);
  const saveActiveLocal = db.prepare(`INSERT INTO newsletter (
    email, subscription_id, state, verification_hash, expires_at, consent_version, requested_at, confirmed_at
  ) VALUES (?, ?, 'active', NULL, NULL, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET subscription_id = excluded.subscription_id, state = 'active',
    verification_hash = NULL, expires_at = NULL, consent_version = excluded.consent_version,
    requested_at = excluded.requested_at, confirmed_at = excluded.confirmed_at, unsubscribed_at = NULL`);
  const unsubscribe = db.prepare(`UPDATE newsletter SET state = 'unsubscribed', unsubscribed_at = ?,
    verification_hash = NULL, expires_at = NULL WHERE subscription_id = ? AND state IN ('pending','active')`);
  const retry = db.prepare('UPDATE newsletter SET requested_at = 0 WHERE verification_hash = ?');
  const purge = db.prepare("DELETE FROM newsletter WHERE state = 'pending' AND expires_at < ?");

  async function subscribe(input) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !validEmail.test(email) || input.consent !== true) {
      throw new HttpError(400, 'Enter a valid email address and agree to receive DEBORRA emails.');
    }
    const now = Date.now();
    purge.run(now - day);
    const existing = status.get(email);
    if (existing?.state === 'active' || (existing && now - existing.requested_at < 900000)) return;

    const token = randomToken();
    const hash = sha256(token);
    const id = randomToken();
    save.run(email, id, hash, now + day, options.consentVersion, now);
    const confirmation = `${config.origin}/newsletter/confirm?t=${token}`;

    try {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `deborra-opt-in/${id}` },
        body: JSON.stringify({
          from: options.sender, to: [email], subject: 'Confirm your DEBORRA signup',
          text: `Confirm your subscription to product updates, education and offers from DEBORRA.\n\n${confirmation}\n\nThe link expires in 24 hours. If you did not request this, you can ignore the email or use ${unsubscribeLink(config, id)}.`
        }),
        redirect: 'error', signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Email provider rejected request');
      await response.body?.cancel();
    } catch {
      retry.run(hash);
      throw new HttpError(503, 'Signup is temporarily unavailable. Please try again in a moment.');
    }
  }

  function change(action, token) {
    const now = Date.now();
    if (action === 'confirm') {
      return opaquePattern.test(token) && confirm.run(now, sha256(token), now).changes === 1;
    }
    const [id, signature, extra] = token.split('.');
    if (extra || !opaquePattern.test(id || '') || !opaquePattern.test(signature || '')) return false;
    const signed = new URL(unsubscribeLink(config, id)).searchParams.get('t').split('.')[1];
    if (!timingSafeEqual(Buffer.from(signed), Buffer.from(signature))) return false;
    unsubscribe.run(now, id);
    return true;
  }

  function subscribeLocal(input) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !validEmail.test(email) || input.consent !== true) {
      throw new HttpError(400, 'Enter a valid email address and agree to receive DEBORRA emails.');
    }
    const now = Date.now();
    const id = randomToken();
    saveActiveLocal.run(email, id, options.consentVersion, now, now);
    return { accepted: true, mode: 'local', unsubscribeUrl: unsubscribeLink(config, id) };
  }

  return { subscribe, subscribeLocal, change };
}

export function emailPage(action, token, result = null) {
  const confirm = action === 'confirm';
  const heading = result === null ? (confirm ? 'Confirm your signup.' : 'Unsubscribe from emails.')
    : result ? (confirm ? 'You’re on the list.' : 'You’re unsubscribed.') : 'This link is unavailable.';
  const button = confirm ? 'Confirm subscription' : 'Unsubscribe';
  const message = result === null
    ? (confirm ? 'Choose confirm to receive product announcements and DEBORRA updates.' : 'Confirm that you want to stop receiving DEBORRA marketing emails.')
    : result ? (confirm ? 'You can unsubscribe using the link in a DEBORRA email.' : 'This subscription will receive no further DEBORRA marketing emails.')
      : 'Return to the launch list to request a fresh confirmation email.';
  const safeToken = /^[A-Za-z0-9_.-]{1,100}$/.test(token) ? token : '';
  return `<!doctype html>
<html lang="en-IN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${heading} | DEBORRA</title>
<link rel="stylesheet" href="/assets/site.css"></head>
<body><main class="section"><div class="container prose email-action">
<a class="brand-mark" href="/"><img src="/assets/deborra-logo.png" width="93" height="62" alt="DEBORRA"></a>
<h1 class="store-product-heading">${heading}</h1><p>${message}</p>
${result === null && safeToken ? `<form method="post" action="/newsletter/${action}"><input type="hidden" name="token" value="${safeToken}"><button class="button button--primary" type="submit">${button}</button></form>` : '<a class="button button--primary" href="/#launch-list">Return to DEBORRA</a>'}
</div></main></body></html>`;
}
