const crypto = require('crypto');
const { Webhook, WebhookVerificationError } = require('standardwebhooks');
const { BILLING_CYCLE_BY_INTERVAL, billablePlans, planById } = require('./planCatalog');

// Polar subscription statuses that still grant access to paid features.
const ACCESS_GRANTING_STATUSES = new Set(['active', 'trialing', 'past_due']);

function hasAccessGrantingStatus(status) {
  return ACCESS_GRANTING_STATUSES.has(status);
}

// The documented/canonical var is POLAR_SERVER (see .env.example, POLAR_SETUP.md).
// POLAR_ENVIRONMENT is accepted as a fallback only because a deploy was found
// configured with that name instead — the code has never read it otherwise.
// Warn loudly so this doesn't silently strand production on the sandbox API.
function getPolarServer() {
  if (process.env.POLAR_SERVER) return process.env.POLAR_SERVER;
  if (process.env.POLAR_ENVIRONMENT) {
    console.error(
      'POLAR_ENVIRONMENT is set but EmberFlow reads POLAR_SERVER. ' +
      'Rename it in Vercel (Settings > Environment Variables) and redeploy — ' +
      'until then this falls back to POLAR_ENVIRONMENT, which is undocumented.'
    );
    return process.env.POLAR_ENVIRONMENT;
  }
  return undefined;
}

function polarBaseUrl() {
  return getPolarServer() === 'production'
    ? 'https://api.polar.sh'
    : 'https://sandbox-api.polar.sh';
}

// Resolve a plan id to its live Polar product id. Data-driven off the plan
// catalog: any plan with a productEnvVar is billable; anything else (or an
// unknown id) is rejected. Polar checkout is created from PRODUCT ids.
function getProductId(plan) {
  if (typeof plan !== 'string') {
    throw new Error('Invalid billing plan.');
  }

  const def = planById(plan);
  if (!def || !def.productEnvVar) throw new Error('Unsupported billing plan.');
  const productId = process.env[def.productEnvVar];
  if (!productId) throw new Error(`Missing ${def.productEnvVar}.`);
  return productId;
}

// Reverse map: a Polar product id back to our plan id. Matches against every
// billable plan's configured product env value; unknown products collapse to
// free (so a product we don't recognize never grants paid access).
function planFromProduct(productId) {
  if (!productId) return 'free';
  const match = billablePlans().find((p) => process.env[p.productEnvVar] === productId);
  return match ? match.id : 'free';
}

function billingCycleFromPlan(plan) {
  const def = planById(plan);
  if (!def) return 'free';
  return BILLING_CYCLE_BY_INTERVAL[def.interval] || 'free';
}

async function polarFetch(path, options = {}) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing POLAR_ACCESS_TOKEN.');

  const response = await fetch(`${polarBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  // Polar returns the resource object directly (not wrapped in a { data }
  // envelope), so callers use the returned payload as-is.
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`Polar API Error: ${options.method || 'GET'} ${path} -> ${response.status}`);
    console.error(JSON.stringify(payload, null, 2));
    // Polar's error body is usually { detail: "..." } (a string) but for
    // 422s detail is an array of { type, loc, msg } validation objects —
    // stringify the whole payload in that case rather than losing it.
    const error = new Error(
      typeof payload?.detail === 'string'
        ? payload.detail
        : JSON.stringify(payload?.detail || payload?.error || payload)
    );
    // Attached (not just logged) so callers can distinguish "this customer/
    // resource genuinely doesn't exist in the current Polar environment"
    // (404 — worth recovering from) from auth/config/rate-limit failures
    // (worth surfacing as-is, not papering over with a recovery attempt).
    error.status = response.status;
    throw error;
  }

  return payload;
}

// Polar signs every webhook per the Standard Webhooks spec. Its signing
// secret is a plain string; the Standard Webhooks verifier expects a base64
// secret that it base64-decodes back into the HMAC key, so we base64-encode
// it first — identical to what @polar-sh/sdk does internally (verified
// directly against polarsource/polar-js's webhooks.ts, and Polar's own docs
// call this out as "a common gotcha with the spec"). verify() also enforces
// the required webhook-id/webhook-timestamp/webhook-signature headers, a
// 5-minute timestamp tolerance (replay protection), and a constant-time
// comparison. It throws WebhookVerificationError on failure and returns the
// parsed (snake_case) event payload on success.
function verifyPolarWebhook(rawBody, headers) {
  // .trim() guards against the single most common real-world cause of a
  // secret that "looks right" but never verifies: a trailing newline/space
  // picked up when copying the signing secret out of the Polar dashboard.
  const secret = (process.env.POLAR_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('Missing POLAR_WEBHOOK_SECRET.');
  const webhook = new Webhook(Buffer.from(secret, 'utf-8').toString('base64'));
  return webhook.verify(rawBody, headers);
}

// Diagnostic only — never logs the secret itself. Lets whoever is looking at
// Vercel's function logs confirm, without ever printing the real value,
// whether the POLAR_WEBHOOK_SECRET actually configured matches the one shown
// in the Polar dashboard for the endpoint that's delivering (sandbox and
// production endpoints each have their own distinct secret): compute
// sha256(trimmed secret) locally from the dashboard value and compare its
// first 12 hex chars against `sha256Prefix` below.
function describeConfiguredWebhookSecret() {
  const raw = process.env.POLAR_WEBHOOK_SECRET || '';
  const trimmed = raw.trim();
  if (!trimmed) return { configured: false };
  return {
    configured: true,
    length: trimmed.length,
    hadWhitespace: trimmed.length !== raw.length,
    sha256Prefix: crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 12),
  };
}

// The Supabase user id travels with every subscription as the customer's
// external_id (set as external_customer_id at checkout) and, redundantly, in
// the checkout metadata. Prefer the customer external id.
function extractUserId(data) {
  return data?.customer?.external_id || data?.metadata?.user_id || '';
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Flatten a Polar subscription object (from a webhook event) into a
// `subscriptions` row. `fallback` is the existing row, used to preserve
// fields Polar didn't include on a given event.
function normalizeSubscription(subscription, fallback = {}) {
  const status = subscription?.status || fallback.status || 'active';
  const productId = subscription?.product_id || fallback.polar_product_id || null;

  // Status-aware plan derivation: a subscription maps to a paid plan only
  // while it actually grants access. Revoked/unpaid/expired subscriptions
  // collapse to 'free' so the frontend entitlement check (status-based) AND
  // the DB-level free-limit triggers (which read `plan`, not `status`) both
  // agree the user is no longer Pro. A cancel-at-period-end subscription
  // stays `active` until the period ends, so the user keeps Pro until then.
  const grantsAccess = hasAccessGrantingStatus(status);
  const plan = grantsAccess ? planFromProduct(productId) : 'free';

  return {
    plan,
    status,
    billing_cycle: billingCycleFromPlan(plan),
    polar_customer_id:
      subscription?.customer_id || subscription?.customer?.id || fallback.polar_customer_id || null,
    polar_subscription_id: subscription?.id || fallback.polar_subscription_id || null,
    polar_product_id: productId,
    current_period_start:
      toIso(subscription?.current_period_start) || fallback.current_period_start || null,
    current_period_end:
      toIso(subscription?.current_period_end) || fallback.current_period_end || null,
    cancel_at_period_end:
      typeof subscription?.cancel_at_period_end === 'boolean'
        ? subscription.cancel_at_period_end
        : fallback.cancel_at_period_end || false,
    trial_ends_at: toIso(subscription?.ends_at && status === 'trialing' ? subscription.ends_at : null)
      || fallback.trial_ends_at
      || null,
  };
}

// A stored polar_subscription_id that 404s against the currently configured
// Polar environment almost certainly means the row is stale (e.g. captured
// before a sandbox -> production cutover, or the subscription was deleted
// directly in Polar) rather than a transient failure — the same class of
// issue api/polar/portal.js recovers from for polar_customer_id. Left alone,
// the row would stay frozen at whatever access-granting status it had
// forever, since no further webhook can ever arrive for a subscription that
// doesn't exist in the current environment — silently granting Pro access
// indefinitely. Self-heal by collapsing to Free so EmberFlow's own state
// matches reality, and clearing the dead id per the same "never keep an id
// we know is invalid" rule (polar_customer_id is left alone -- portal.js's
// own recovery already re-syncs it the next time it's needed).
async function collapseToFreeAfterMissingSubscription(supabase, userId) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan: 'free', status: 'canceled', polar_subscription_id: null })
    .eq('user_id', userId);
  if (error) console.error('Failed to collapse stale subscription to free:', error.message);
}

module.exports = {
  getProductId,
  planFromProduct,
  billingCycleFromPlan,
  hasAccessGrantingStatus,
  polarFetch,
  verifyPolarWebhook,
  describeConfiguredWebhookSecret,
  WebhookVerificationError,
  extractUserId,
  normalizeSubscription,
  collapseToFreeAfterMissingSubscription,
};
